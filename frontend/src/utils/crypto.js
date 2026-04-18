const keyStoragePrefix = 'e2ee-rsa-private-key::';

function toBase64(arrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
}

function fromBase64(base64) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function generateAndExportRSAKeys() {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true,
    ['encrypt', 'decrypt']
  );

  const [publicKeySpki, privateKeyPkcs8] = await Promise.all([
    crypto.subtle.exportKey('spki', keyPair.publicKey),
    crypto.subtle.exportKey('pkcs8', keyPair.privateKey)
  ]);

  return {
    publicKeyBase64: toBase64(publicKeySpki),
    privateKeyBase64: toBase64(privateKeyPkcs8)
  };
}

export async function importPublicKey(base64Key) {
  return crypto.subtle.importKey(
    'spki',
    fromBase64(base64Key),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  );
}

export async function importPrivateKey(base64Key) {
  return crypto.subtle.importKey(
    'pkcs8',
    fromBase64(base64Key),
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['decrypt']
  );
}

export async function ensurePrivateKeyForUser(email) {
  const privateStorageKey = `${keyStoragePrefix}${email}`;
  const publicStorageKey = `${keyStoragePrefix}${email}::public`;

  let privateKeyBase64 = localStorage.getItem(privateStorageKey);
  let publicKeyBase64 = localStorage.getItem(publicStorageKey);
  let isNew = false;

  if (!privateKeyBase64 || !publicKeyBase64) {
    const generated = await generateAndExportRSAKeys();
    privateKeyBase64 = generated.privateKeyBase64;
    publicKeyBase64 = generated.publicKeyBase64;
    localStorage.setItem(privateStorageKey, privateKeyBase64);
    localStorage.setItem(publicStorageKey, publicKeyBase64);
    isNew = true;
  }

  return {
    privateKeyBase64,
    publicKeyBase64,
    isNew,
    privateKey: await importPrivateKey(privateKeyBase64)
  };
}

export async function encryptMessage(plainText, senderPublicKeyBase64, receiverPublicKeyBase64) {
  const aesKey = await crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true,
    ['encrypt', 'decrypt']
  );

  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedMessage = new TextEncoder().encode(plainText);

  const encryptedMessage = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    aesKey,
    encodedMessage
  );

  const exportedAesKey = await crypto.subtle.exportKey('raw', aesKey);

  const [senderPubKey, receiverPubKey] = await Promise.all([
    importPublicKey(senderPublicKeyBase64),
    importPublicKey(receiverPublicKeyBase64)
  ]);

  const [encryptedAESKeyForSender, encryptedAESKeyForReceiver] = await Promise.all([
    crypto.subtle.encrypt({ name: 'RSA-OAEP' }, senderPubKey, exportedAesKey),
    crypto.subtle.encrypt({ name: 'RSA-OAEP' }, receiverPubKey, exportedAesKey)
  ]);

  return {
    encryptedMessage: toBase64(encryptedMessage),
    encryptedAESKeyForSender: toBase64(encryptedAESKeyForSender),
    encryptedAESKeyForReceiver: toBase64(encryptedAESKeyForReceiver),
    iv: toBase64(iv.buffer)
  };
}

export async function decryptMessageForCurrentUser(payload, privateKey, myEmail) {
  const { encryptedMessage, encryptedAESKeyForSender, encryptedAESKeyForReceiver, iv } = payload;

  const isSender = payload.sender?.toLowerCase() === myEmail?.toLowerCase();
  const encryptedAESKey = isSender ? encryptedAESKeyForSender : encryptedAESKeyForReceiver;

  const aesRawKey = await crypto.subtle.decrypt(
    {
      name: 'RSA-OAEP'
    },
    privateKey,
    fromBase64(encryptedAESKey)
  );

  const aesKey = await crypto.subtle.importKey(
    'raw',
    aesRawKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(fromBase64(iv))
    },
    aesKey,
    fromBase64(encryptedMessage)
  );

  return new TextDecoder().decode(decrypted);
}