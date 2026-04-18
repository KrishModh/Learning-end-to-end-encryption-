import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import {
  decryptFile,
  decryptMessageForCurrentUser,
  encryptFile,
  encryptMessage,
  ensurePrivateKeyForUser
} from '../utils/crypto';

function getFileMeta(file) {
  if (!file) return null;
  if (file.type === 'application/pdf') {
    return { fileType: 'pdf', fileMime: file.type };
  }
  if (file.type.startsWith('image/')) {
    return { fileType: 'image', fileMime: file.type };
  }
  return null;
}

export default function ChatPage() {
  const navigate = useNavigate();
  const myEmail = (localStorage.getItem('email') || '').toLowerCase();

  const [receiverEmail, setReceiverEmail] = useState('');
  const [myPrivateKey, setMyPrivateKey] = useState(null);
  const [myPublicKeyBase64, setMyPublicKeyBase64] = useState('');
  const [receiverPublicKey, setReceiverPublicKey] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [debugMessage, setDebugMessage] = useState(null);

  const fileInputRef = useRef(null);
  const createdObjectUrlsRef = useRef(new Set());

  const loadMessages = useCallback(
    async (privateKey, chatPeer, currentUserEmail, silent = false) => {
      if (!privateKey || !chatPeer) return;

      try {
        const data = await api.getMessages(chatPeer);

        const decrypted = await Promise.all(
          data.messages.map(async (item) => {
            if (item.type === 'file') {
              return {
                ...item,
                text: '[Encrypted file]'
              };
            }

            try {
              const text = await decryptMessageForCurrentUser(item, privateKey, currentUserEmail);
              return { ...item, text };
            } catch {
              return { ...item, text: '[Unable to decrypt with this private key]' };
            }
          })
        );

        setMessages((previous) => {
          const prevById = new Map(previous.map((msg) => [msg._id, msg]));
          return decrypted.map((msg) => {
            const prev = prevById.get(msg._id);
            return {
              ...msg,
              decryptedFileUrl: prev?.decryptedFileUrl,
              fileDecryptionError: prev?.fileDecryptionError
            };
          });
        });
      } catch (err) {
        if (!silent) setError(err.message);
      }
    },
    []
  );

  useEffect(() => {
    if (!myEmail || !localStorage.getItem('token')) {
      navigate('/login', { replace: true });
      return;
    }

    let active = true;
    let intervalId;

    async function init() {
      try {
        setError('');

        const keyInfo = await ensurePrivateKeyForUser(myEmail);
        if (!active) return;

        setMyPrivateKey(keyInfo.privateKey);
        setMyPublicKeyBase64(keyInfo.publicKeyBase64);

        if (keyInfo.isNew) {
          await api.savePublicKey(keyInfo.publicKeyBase64);
        } else {
          await api.getPublicKey(myEmail).catch(() => {
            throw new Error('Public key missing on server. Clear localStorage to regenerate keys.');
          });
        }

        const peerData = await api.getPeer();
        const chatPeer = peerData.peerEmail;

        const pk = await api.getPublicKey(chatPeer);
        if (!active) return;

        setReceiverEmail(chatPeer);
        setReceiverPublicKey(pk.publicKey);

        await loadMessages(keyInfo.privateKey, chatPeer, myEmail);

        intervalId = setInterval(() => {
          loadMessages(keyInfo.privateKey, chatPeer, myEmail, true);
        }, 3000);
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
      for (const url of createdObjectUrlsRef.current) {
        URL.revokeObjectURL(url);
      }
      createdObjectUrlsRef.current.clear();
    };
  }, [loadMessages, myEmail, navigate]);

  async function sendMessage(event) {
    event.preventDefault();
    if (!draft.trim() || !receiverEmail) return;

    setSending(true);
    setError('');

    try {
      const payload = await encryptMessage(draft, myPublicKeyBase64, receiverPublicKey);
      const body = {
        sender: myEmail,
        receiver: receiverEmail,
        type: 'text',
        ...payload
      };

      await api.sendMessage(body);
      setDraft('');
      setDebugMessage(body);
      await loadMessages(myPrivateKey, receiverEmail, myEmail);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function sendFile() {
    if (!selectedFile || !receiverEmail) return;

    const fileMeta = getFileMeta(selectedFile);
    if (!fileMeta) {
      setError('Only image and PDF files are supported.');
      return;
    }

    setSending(true);
    setError('');

    try {
      const encrypted = await encryptFile(selectedFile, myPublicKeyBase64, receiverPublicKey);
      const encryptedUploadFile = new File([encrypted.encryptedFileBlob], `${selectedFile.name}.enc`, {
        type: 'application/octet-stream'
      });

      const upload = await api.uploadEncryptedFile(encryptedUploadFile, selectedFile.type);

      const body = {
        sender: myEmail,
        receiver: receiverEmail,
        type: 'file',
        fileUrl: upload.fileUrl,
        fileType: fileMeta.fileType,
        fileMime: fileMeta.fileMime,
        encryptedAESKeyForSender: encrypted.encryptedAESKeyForSender,
        encryptedAESKeyForReceiver: encrypted.encryptedAESKeyForReceiver,
        iv: encrypted.iv
      };

      await api.sendMessage(body);
      setDebugMessage(body);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadMessages(myPrivateKey, receiverEmail, myEmail);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  async function decryptAndOpenFile(message) {
    if (!myPrivateKey || !message.fileUrl) return;

    setError('');

    try {
      const response = await fetch(message.fileUrl);
      if (!response.ok) {
        throw new Error('Failed to download encrypted file from Cloudinary');
      }

      const encryptedArrayBuffer = await response.arrayBuffer();
      const decryptedBlob = await decryptFile(message, myPrivateKey, myEmail, encryptedArrayBuffer);
      const objectUrl = URL.createObjectURL(decryptedBlob);
      createdObjectUrlsRef.current.add(objectUrl);

      setMessages((previous) =>
        previous.map((msg) => {
          if (msg._id !== message._id) return msg;

          if (msg.decryptedFileUrl) {
            URL.revokeObjectURL(msg.decryptedFileUrl);
            createdObjectUrlsRef.current.delete(msg.decryptedFileUrl);
          }

          return {
            ...msg,
            decryptedFileUrl: objectUrl,
            fileDecryptionError: ''
          };
        })
      );
    } catch {
      setMessages((previous) =>
        previous.map((msg) =>
          msg._id === message._id
            ? {
              ...msg,
              fileDecryptionError: 'Unable to decrypt this file with current private key.'
            }
            : msg
        )
      );
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('email');
    navigate('/login', { replace: true });
  }

  if (loading) {
    return (
      <div className="container">
        <div className="card">Loading keys and messages...</div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card chat-card">
        <div className="chat-header">
          <div>
            <h2>E2EE Chat Test</h2>
            <p>
              You: <strong>{myEmail}</strong>
            </p>
            <p>
              Talking with: <strong>{receiverEmail || 'Loading peer...'}</strong>
            </p>
          </div>
          <button onClick={logout}>Logout</button>
        </div>

        {error ? <p className="error">{error}</p> : null}

        <div className="messages-box">
          {messages.length === 0 ? <p>No messages yet.</p> : null}
          {messages.map((msg) => (
            <div key={msg._id} className={`message ${msg.sender === myEmail ? 'mine' : 'theirs'}`}>
              <small>
                {msg.sender} - {new Date(msg.timestamp).toLocaleTimeString()}
              </small>

              {msg.type === 'file' ? (
                <div className="file-message">
                  <p>
                    Encrypted {msg.fileType === 'pdf' ? 'PDF' : 'image'} file
                  </p>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => decryptAndOpenFile(msg)}
                  >
                    open File
                  </button>

                  {msg.fileDecryptionError ? <p className="error">{msg.fileDecryptionError}</p> : null}

                  {msg.decryptedFileUrl && msg.fileType === 'image' ? (
                    <img src={msg.decryptedFileUrl} alt="Decrypted" className="preview-image" />
                  ) : null}

                  {msg.decryptedFileUrl && msg.fileType === 'pdf' ? (
                    <a href={msg.decryptedFileUrl} target="_blank" rel="noreferrer" className="pdf-link">
                      Open PDF
                    </a>
                  ) : null}
                </div>
              ) : (
                <p>{msg.text}</p>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="send-form">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Type a message"
            required
          />
          <button type="submit" disabled={sending || !receiverPublicKey}>
            {sending ? 'Sending...' : 'Send Text'}
          </button>
        </form>

        <div className="file-upload-row">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={sendFile}
            disabled={sending || !receiverPublicKey || !selectedFile}
          >
            {sending ? 'Uploading...' : 'Send File'}
          </button>
        </div>

        {selectedFile ? <p className="hint">Selected: {selectedFile.name}</p> : null}

      </div>
    </div>
  );
}