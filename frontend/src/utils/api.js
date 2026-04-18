const API_URL = import.meta.env.VITE_API_URL;

async function apiRequest(path, options = {}) {
  const token = localStorage.getItem('token');
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }

  return data;
}

async function uploadEncryptedFile(file, originalType) {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('originalType', originalType);

  const response = await fetch(`${API_URL}/api/files/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formData
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'File upload failed');
  }

  return data;
}

export const api = {
  login: (email, password) =>
    apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),
  getPeer: () => apiRequest('/api/auth/peer'),

  savePublicKey: (publicKey) =>
    apiRequest('/api/users/public-key', {
      method: 'POST',
      body: JSON.stringify({ publicKey })
    }),

  getPublicKey: (email) => apiRequest(`/api/users/public-key/${encodeURIComponent(email)}`),

  sendMessage: (payload) =>
    apiRequest('/api/messages', {
      method: 'POST',
      body: JSON.stringify(payload)
    }),

  uploadEncryptedFile,

  getMessages: (withUser) => apiRequest(`/api/messages?withUser=${encodeURIComponent(withUser)}`)
};