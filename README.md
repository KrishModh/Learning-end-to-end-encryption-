<div align="center">
        
<a href="https://git.io/typing-svg">
  <img src="https://readme-typing-svg.demolab.com?font=Fira+Code&weight=600&size=22&pause=1000&color=00C2FF&center=true&vCenter=true&width=620&lines=Building+Full+Stack+Apps+%F0%9F%9A%80;React+%7C+Next.js+%7C+Node.js+%7C+Flask;Securing+Apps+with+AppSec+Mindset+%F0%9F%94%90;Turning+ideas+into+real+products+%E2%9C%A8" alt="Typing SVG" />
</a>
 
<br/>

# 🔐 Minimal E2EE — Learning End-to-End Encryption

> **Not a product. A proof of concept.**  
> Built with 2 hardcoded users to deeply understand how real-world E2EE works —  
> so I can implement it properly in future projects.

<br/>

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)
![WebCrypto](https://img.shields.io/badge/Web_Crypto_API-FF6B35?style=for-the-badge&logo=webauthn&logoColor=white)

</div>

---

## 🎯 Why I Built This

Most tutorials explain E2EE in theory. I wanted to **actually build it** and verify every layer —  
see the ciphertext in MongoDB, open a Cloudinary URL and see garbage bytes, send the same message twice and get completely different output.

This is a **minimal sandbox** — 2 predefined users, no signup, no UI polish.  
The only goal: understand the crypto, end to end.

> I plan to take everything learned here and implement proper E2EE in real projects going forward.

---

## 📸 What It Looks Like

<div align="center">

| User 1 | User 2 |
|:---:|:---:|
| <img width="2560" height="1440" alt="Screenshot (1191)" src="https://github.com/user-attachments/assets/0f1c72dc-9af9-4ed3-8e0a-958cbcd03934" /> | <img width="2560" height="1440" alt="Screenshot (1190)" src="https://github.com/user-attachments/assets/3ba89f10-d377-4912-a1d6-40ea3552d98a" /> |
| **Cloudinary Dashboard** | **Database** |
| <img width="2560" height="1440" alt="Screenshot (1192)" src="https://github.com/user-attachments/assets/71674843-5d35-4198-ac9c-37be0a2006a1" /> | <img width="2560" height="1440" alt="Screenshot (1193)" src="https://github.com/user-attachments/assets/b7143ee7-7c2c-4a92-ab5b-dc22a8b6da0b" /> |

</div>

---

## 🧠 What's Actually Inside

This is not a chat app. It's a **crypto implementation test** with a minimal UI to trigger and verify encryption flows.

**What it demonstrates:**
- RSA key pair generation in the browser (`window.crypto.subtle`) — no third-party crypto library
- Public key exchange between two users via the backend
- Hybrid encryption: AES-GCM for data, RSA-OAEP for the key
- Encrypted file upload (image/PDF) — Cloudinary stores raw encrypted bytes only
- Zero-knowledge backend — the server genuinely cannot read anything

**What it intentionally skips:**
- Multi-user support
- Real-time messaging (no WebSockets)
- UI/UX design
- Production hardening

---

## ⚙️ How E2EE Works Here

### 🗨️ Text Message

```
User types message
        │
        ▼
Generate random AES-GCM key + random IV
        │
        ▼
Encrypt plaintext  ────────────────────▶  ciphertext  (goes to DB)
        │
        ▼
RSA-OAEP encrypt the AES key:
  ├── with Sender's   Public Key  ──▶  encryptedAESKeyForSender
  └── with Receiver's Public Key  ──▶  encryptedAESKeyForReceiver
        │
        ▼
Backend stores ONLY ciphertext + encrypted keys
Backend CANNOT decrypt anything ✅
```

### 📁 File (Image / PDF)

```
User selects file
        │
        ▼
Read file as ArrayBuffer in browser
        │
        ▼
AES-GCM encrypt raw bytes + random IV
        │
        ▼
RSA-OAEP encrypt AES key (for sender + receiver)
        │
        ▼
Upload encrypted blob ──▶ Backend ──▶ Cloudinary
(Cloudinary URL = encrypted bytes, NOT the original file)
        │
        ▼
Receiver fetches URL ──▶ decrypts locally ──▶ sees file ✅
```

---

## 🗂️ Project Structure

```
Z-TEST-E2EE/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   └── auth.js          # JWT verification
│   │   ├── models/
│   │   │   ├── Message.js       # all encrypted fields only
│   │   │   └── User.js          # email + publicKey
│   │   ├── routes/
│   │   │   ├── auth.js          # login, peer lookup
│   │   │   ├── files.js         # encrypted file upload
│   │   │   ├── messages.js      # send / fetch messages
│   │   │   └── users.js         # public key exchange
│   │   └── dropIndex.js
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   │   ├── ChatPage.jsx     # main UI + raw payload debug panel
│   │   │   └── LoginPage.jsx
│   │   ├── utils/
│   │   │   ├── api.js           # axios calls to backend
│   │   │   └── crypto.js        # all Web Crypto API logic lives here
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── styles.css
│   ├── index.html
│   ├── vite.config.js
│   ├── .env.example
│   └── package.json
│
├── package.json                 # root scripts to run both together
└── README.md
```

---

## 🚀 Running Locally

### Prerequisites

- Node.js `v18+`
- MongoDB Atlas free account
- Cloudinary free account

---

### 1️⃣ Clone

```bash
git clone https://github.com/KrishModh/e2ee-minimal.git
cd e2ee-minimal
```

---

### 2️⃣ Backend Setup

```bash
cd backend

# Linux / macOS
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env
```

Fill in `.env`:

```env
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/e2ee
JWT_SECRET=any_random_secret

USER1_EMAIL=alice@example.com
USER1_PASSWORD=alice123
USER2_EMAIL=bob@example.com
USER2_PASSWORD=bob123

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

```bash
npm install
npm run dev
# → http://localhost:5000
```

---

### 3️⃣ Frontend Setup

```bash
cd ../frontend

cp .env.example .env        # or Copy-Item on Windows
# set VITE_API_URL=http://localhost:5000

npm install
npm run dev
# → http://localhost:5173
```

---

### 4️⃣ Or Run Both Together

```bash
# from project root
npm install
npm run install:all
npm run dev
```

Open `http://localhost:5173` in **two browser tabs** — log in as User 1 in one, User 2 in the other.

---

## 🔌 API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/login` | Login + receive JWT |
| `GET` | `/api/auth/peer` | Get the other user's info |
| `POST` | `/api/users/public-key` | Upload your RSA public key |
| `GET` | `/api/users/public-key/:email` | Fetch peer's public key |
| `POST` | `/api/files/upload` | Upload encrypted file blob |
| `POST` | `/api/messages` | Send encrypted message |
| `GET` | `/api/messages?withUser=<email>` | Fetch conversation |


---

## ✅ How to Verify the Encryption is Real

| Test | What to do | What you'll see |
|------|-----------|-----------------|
| **Random IV** | Send the same message twice | Completely different ciphertext both times |
| **Encrypted files** | Open the Cloudinary URL directly | Raw bytes — not your image |
| **Zero-knowledge DB** | Check MongoDB directly | No readable message anywhere |

---

## 📚 Concepts Covered

-  `window.crypto.subtle` — browser-native crypto, no third-party libraries
- RSA-OAEP — asymmetric key exchange (2048-bit)
-  AES-GCM 256-bit — authenticated symmetric encryption
-  Hybrid encryption (RSA wraps AES key) — industry standard pattern
-  Random IV per message — prevents ciphertext pattern leakage
-  Zero-knowledge backend architecture
-  Encrypted binary file handling (`ArrayBuffer` → encrypted blob → Cloudinary)
-  Private key stored in `localStorage` — never leaves the browser

---

## 👤 Author

<div align="center">

**Krish Modh**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/krish-modh-b38447300/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/KrishModh)

*Built this to go from "I know what E2EE means" to "I know how E2EE works."*

</div>

---

<div align="center">

⭐ **If this helped you understand E2EE, drop a star!** ⭐

</div>
