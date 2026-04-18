# Minimal E2EE Chat Test App

This project demonstrates **client-side End-to-End Encryption (E2EE)** between two predefined users for both **text** and **file (image/PDF)** messages.

- Frontend: React + Vite + Web Crypto API
- Backend: Node.js + Express + MongoDB Atlas (Mongoose)
- File Storage: Cloudinary (stores encrypted file bytes only)

The backend and Cloudinary never decrypt message/file contents.

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
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`

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

## How E2EE Works

### Text Message Flow

1. Frontend generates AES key + random IV.
2. Plaintext is encrypted with AES-GCM.
3. AES key is encrypted twice using RSA-OAEP:
   - one copy with sender public key
   - one copy with receiver public key
4. Backend stores only ciphertext fields.

### File (Image/PDF) Flow

1. User selects file.
2. Frontend reads file as `ArrayBuffer`.
3. Frontend encrypts bytes with AES-GCM + random IV.
4. AES key is RSA-encrypted for sender and receiver.
5. Frontend uploads encrypted binary blob to backend.
6. Backend uploads raw encrypted bytes to Cloudinary.
7. Backend stores only Cloudinary URL + encrypted key material.
8. Receiver downloads encrypted bytes and decrypts locally.

## Debug + Verification

- Chat page includes **Debug: Raw encrypted payload** panel.
- Send same text or upload same file twice and compare payload `iv` / ciphertext: values should differ each time.
- Opening Cloudinary URL directly shows encrypted raw bytes, not original image/PDF.
- MongoDB stores encrypted fields only.

## Backend API

- `POST /api/auth/login`
- `GET /api/auth/peer`
- `POST /api/users/public-key`
- `GET /api/users/public-key/:email`
- `POST /api/files/upload` (encrypted file upload)
- `POST /api/messages`
- `GET /api/messages?withUser=<email>`

## MongoDB Schemas

### Users

- `email`
- `publicKey`

### Messages

- `sender`
- `receiver`
- `type` (`text` or `file`)
- `encryptedMessage` (text only)
- `fileUrl` (file only)
- `encryptedAESKey` (receiver key copy)
- `encryptedAESKeyForSender`
- `encryptedAESKeyForReceiver`
- `iv`
- `fileType` (`image` or `pdf`, file only)
- `fileMime` (optional helper, file only)
- `timestamp`
