# Minimal E2EE Chat Test App

This project demonstrates **client-side End-to-End Encryption (E2EE)** between two predefined users.

- Frontend: React + Vite + Web Crypto API
- Backend: Node.js + Express + MongoDB Atlas (Mongoose)

The backend stores only encrypted payloads and never decrypts message content.

## Project Structure

```text
backend/
frontend/
```

## 1) Backend Setup

1. Copy env template:

```powershell
cd backend
Copy-Item .env.example .env
```

2. Update `.env` with real values:

- `PORT`
- `MONGO_URI`
- `JWT_SECRET`
- `USER1_EMAIL`
- `USER1_PASSWORD`
- `USER2_EMAIL`
- `USER2_PASSWORD`

3. Install and run backend:

```bash
npm install
npm run dev
```

Backend runs on `http://localhost:5000` by default.

## 2) Frontend Setup

1. Copy env template:

```powershell
cd frontend
Copy-Item .env.example .env
```

2. Set API URL in `.env`:

- `VITE_API_URL=http://localhost:5000`

3. Install and run frontend:

```bash
npm install
npm run dev
```

Frontend runs on Vite default URL (usually `http://localhost:5173`).

## 3) Run Both from Root (Optional)

From project root:

```bash
npm install
npm run install:all
npm run dev
```

## How It Works (E2EE Flow)

1. Login with one of the two predefined users (validated against backend `.env`).
2. On first login, frontend generates RSA keypair using Web Crypto API.
3. Private key is stored only in browser localStorage (per user email).
4. Public key is uploaded to backend and stored in MongoDB.
5. To send message:
   - Frontend generates random AES key + random IV.
   - Message is encrypted with AES-GCM.
   - AES key is encrypted with receiver public RSA key.
   - Backend stores ciphertext fields as-is.
6. To read message:
   - Frontend fetches encrypted messages.
   - Frontend decrypts AES key using local private key.
   - Frontend decrypts message and renders plaintext.

## Debug + Verification

- Chat page includes a **Debug: Raw encrypted payload** panel.
- Send same plaintext twice and verify ciphertext/IV differ (random IV).
- In MongoDB, message text is unreadable ciphertext only.

## Backend API (Minimal)

- `POST /api/auth/login`
- `GET /api/auth/peer`
- `POST /api/users/public-key`
- `GET /api/users/public-key/:email`
- `POST /api/messages`
- `GET /api/messages?withUser=<email>`

## MongoDB Schemas

### Users

- `email`
- `publicKey`

### Messages

- `sender`
- `receiver`
- `encryptedMessage`
- `encryptedAESKey`
- `iv`
- `timestamp`
