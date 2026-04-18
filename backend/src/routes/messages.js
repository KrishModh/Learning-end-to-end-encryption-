const express = require('express');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

function getAllowedUsers() {
  return [process.env.USER1_EMAIL, process.env.USER2_EMAIL]
    .filter(Boolean)
    .map((email) => email.toLowerCase().trim());
}

router.post('/', authMiddleware, async (req, res) => {
  const {
    sender,
    receiver,
    type = 'text',
    encryptedMessage,
    fileUrl,
    encryptedAESKeyForSender,
    encryptedAESKeyForReceiver,
    iv,
    fileType,
    fileMime
  } = req.body;

  if (!sender || !receiver || !encryptedAESKeyForSender || !encryptedAESKeyForReceiver || !iv) {
    return res.status(400).json({
      message:
        'sender, receiver, encryptedAESKeyForSender, encryptedAESKeyForReceiver and iv are required'
    });
  }

  const normalizedType = String(type).toLowerCase().trim();
  if (!['text', 'file'].includes(normalizedType)) {
    return res.status(400).json({ message: 'Invalid message type' });
  }

  if (normalizedType === 'text' && !encryptedMessage) {
    return res.status(400).json({ message: 'encryptedMessage is required for text messages' });
  }

  if (normalizedType === 'file') {
    if (!fileUrl || !fileType) {
      return res.status(400).json({ message: 'fileUrl and fileType are required for file messages' });
    }
    if (!['image', 'pdf'].includes(String(fileType).toLowerCase().trim())) {
      return res.status(400).json({ message: 'fileType must be image or pdf' });
    }
  }

  if (String(sender).toLowerCase().trim() !== req.user.email) {
    return res.status(403).json({ message: 'Sender must match authenticated user' });
  }

  const normalizedSender = String(sender).toLowerCase().trim();
  const normalizedReceiver = String(receiver).toLowerCase().trim();
  const allowedUsers = getAllowedUsers();

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
    sender: normalizedSender,
    receiver: normalizedReceiver,
    type: normalizedType,
    encryptedMessage: normalizedType === 'text' ? encryptedMessage : undefined,
    fileUrl: normalizedType === 'file' ? fileUrl : undefined,
    encryptedAESKey: encryptedAESKeyForReceiver,
    encryptedAESKeyForSender,
    encryptedAESKeyForReceiver,
    iv,
    fileType: normalizedType === 'file' ? String(fileType).toLowerCase().trim() : undefined,
    fileMime: normalizedType === 'file' ? fileMime : undefined
  });

  return res.status(201).json({
    _id: message._id,
    sender: message.sender,
    receiver: message.receiver,
    type: message.type,
    encryptedMessage: message.encryptedMessage,
    fileUrl: message.fileUrl,
    encryptedAESKey: message.encryptedAESKey,
    encryptedAESKeyForSender: message.encryptedAESKeyForSender,
    encryptedAESKeyForReceiver: message.encryptedAESKeyForReceiver,
    iv: message.iv,
    fileType: message.fileType,
    fileMime: message.fileMime,
    timestamp: message.timestamp
  });
});

router.get('/', authMiddleware, async (req, res) => {
  const user = req.user.email;
  const { withUser } = req.query;

  if (!withUser) {
    return res.status(400).json({ message: 'withUser query param is required' });
  }

  const other = String(withUser).toLowerCase().trim();
  const allowedUsers = getAllowedUsers();

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
