const express = require('express');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/public-key', authMiddleware, async (req, res) => {
  const { publicKey } = req.body;

  if (!publicKey) {
    return res.status(400).json({ message: 'publicKey is required' });
  }

  const email = req.user.email;
  const allowedUsers = [process.env.USER1_EMAIL, process.env.USER2_EMAIL]
    .filter(Boolean)
    .map((item) => item.toLowerCase().trim());

  if (!allowedUsers.includes(email)) {
    return res.status(403).json({ message: 'User is not allowed' });
  }

  const user = await User.findOneAndUpdate(
    { email },
    { email, publicKey },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.json({ email: user.email, publicKey: user.publicKey });
});

router.get('/public-key/:email', authMiddleware, async (req, res) => {
  const email = String(req.params.email).toLowerCase().trim();
  const allowedUsers = [process.env.USER1_EMAIL, process.env.USER2_EMAIL]
    .filter(Boolean)
    .map((item) => item.toLowerCase().trim());

  if (!allowedUsers.includes(email)) {
    return res.status(404).json({ message: 'Public key not found for user' });
  }

  const user = await User.findOne({ email }).lean();
  if (!user) {
    return res.status(404).json({ message: 'Public key not found for user' });
  }

  return res.json({ email: user.email, publicKey: user.publicKey });
});

module.exports = router;
