const express = require('express');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const {
    sender,
    receiver,
    encryptedMessage,
    encryptedAESKeyForSender,
    encryptedAESKeyForReceiver,
    iv
  } = req.body;

  if (
    !sender ||
    !receiver ||
    !encryptedMessage ||
    !encryptedAESKeyForSender ||
    !encryptedAESKeyForReceiver ||
    !iv
  ) {
    return res.status(400).json({
      message: 'sender, receiver, encryptedMessage, encryptedAESKeyForSender, encryptedAESKeyForReceiver and iv are required'
    });
  }

  if (String(sender).toLowerCase().trim() !== req.user.email) {
    return res.status(403).json({ message: 'Sender must match authenticated user' });
  }

  const normalizedSender   = String(sender).toLowerCase().trim();
  const normalizedReceiver = String(receiver).toLowerCase().trim();
  const allowedUsers = [process.env.USER1_EMAIL, process.env.USER2_EMAIL]
    .filter(Boolean)
    .map((email) => email.toLowerCase().trim());

  if (
    normalizedSender === normalizedReceiver ||
    !allowedUsers.includes(normalizedSender) ||
    !allowedUsers.includes(normalizedReceiver)
  ) {
    return res.status(400).json({
      message: 'Only 1-to-1 messages between configured users are allowed'
    });
  }

  const message = await Message.create({
    sender:                     normalizedSender,
    receiver:                   normalizedReceiver,
    encryptedMessage,
    encryptedAESKeyForSender,
    encryptedAESKeyForReceiver,
    iv
  });

  return res.status(201).json({
    _id:                        message._id,
    sender:                     message.sender,
    receiver:                   message.receiver,
    encryptedMessage:           message.encryptedMessage,
    encryptedAESKeyForSender:   message.encryptedAESKeyForSender,
    encryptedAESKeyForReceiver: message.encryptedAESKeyForReceiver,
    iv:                         message.iv,
    timestamp:                  message.timestamp
  });
});

router.get('/', authMiddleware, async (req, res) => {
  const user = req.user.email;
  const { withUser } = req.query;

  if (!withUser) {
    return res.status(400).json({ message: 'withUser query param is required' });
  }

  const other = String(withUser).toLowerCase().trim();
  const allowedUsers = [process.env.USER1_EMAIL, process.env.USER2_EMAIL]
    .filter(Boolean)
    .map((email) => email.toLowerCase().trim());

  if (!allowedUsers.includes(user) || !allowedUsers.includes(other) || user === other) {
    return res.status(400).json({ message: 'Invalid chat participants' });
  }

  const messages = await Message.find({
    $or: [
      { sender: user, receiver: other },
      { sender: other, receiver: user }
    ]
  })
    .sort({ timestamp: 1 })
    .lean();

  return res.json({ messages });
});

module.exports = router;