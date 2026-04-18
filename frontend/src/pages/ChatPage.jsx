import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';
import { decryptMessageForCurrentUser, ensurePrivateKeyForUser, encryptMessage } from '../utils/crypto';

export default function ChatPage() {
  const navigate = useNavigate();
  const myEmail = (localStorage.getItem('email') || '').toLowerCase();

  const [receiverEmail, setReceiverEmail] = useState('');
  const [myPrivateKey, setMyPrivateKey] = useState(null);
  const [myPublicKeyBase64, setMyPublicKeyBase64] = useState('');
  const [receiverPublicKey, setReceiverPublicKey] = useState('');
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [debugMessage, setDebugMessage] = useState(null);

  const loadMessages = useCallback(
    async (privateKey, chatPeer, currentUserEmail, silent = false) => {
      if (!privateKey || !chatPeer) return;

      try {
        const data = await api.getMessages(chatPeer);

        const decrypted = await Promise.all(
          data.messages.map(async (item) => {
            try {
              const text = await decryptMessageForCurrentUser(item, privateKey, currentUserEmail);
              return { ...item, text };
            } catch {
              return { ...item, text: '[Unable to decrypt with this private key]' };
            }
          })
        );

        setMessages(decrypted);
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
              <p>{msg.text}</p>
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
            {sending ? 'Sending...' : 'Send'}
          </button>
          <button
            type="button"
            onClick={() => loadMessages(myPrivateKey, receiverEmail, myEmail)}
            disabled={!myPrivateKey || !receiverEmail}
            className="secondary"
          >
            Refresh
          </button>
        </form>

        <details className="debug-panel">
          <summary>Debug: Raw encrypted payload</summary>
          {debugMessage ? (
            <pre>{JSON.stringify(debugMessage, null, 2)}</pre>
          ) : (
            <p>Send a message to inspect encryptedMessage, encryptedAESKey, and iv.</p>
          )}
        </details>

        <p className="hint">
          Tip: Send the exact same plaintext twice and compare `encryptedMessage` or `iv` values in debug view.
          They should differ due to random IV.
        </p>
      </div>
    </div>
  );
}