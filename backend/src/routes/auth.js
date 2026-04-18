const express = require('express');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function getAllowedUsers() {
  return [
    { email: process.env.USER1_EMAIL?.toLowerCase(), password: process.env.USER1_PASSWORD },
    { email: process.env.USER2_EMAIL?.toLowerCase(), password: process.env.USER2_PASSWORD }
  ].filter((u) => u.email && u.password);
}

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const allowedUsers = getAllowedUsers();
  const matched = allowedUsers.find((u) => u.email === normalizedEmail && u.password === password);

  if (!matched) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ email: normalizedEmail }, process.env.JWT_SECRET, { expiresIn: '12h' });

  return res.json({ token, email: normalizedEmail });
});

router.get('/peer', authMiddleware, (req, res) => {
  const allowedUsers = getAllowedUsers();
  const me = req.user.email;
  const peer = allowedUsers.find((u) => u.email !== me);

  if (!peer) {
    return res.status(404).json({ message: 'Peer user not configured' });
  }

  return res.json({ peerEmail: peer.email });
});

module.exports = router;
