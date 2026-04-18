const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: { type: String, required: true, lowercase: true, trim: true },
  receiver: { type: String, required: true, lowercase: true, trim: true },
  type: { type: String, enum: ['text', 'file'], default: 'text', required: true },
  encryptedMessage: { type: String },
  fileUrl: { type: String },
  encryptedAESKey: { type: String, required: true },
  encryptedAESKeyForSender: { type: String, required: true },
  encryptedAESKeyForReceiver: { type: String, required: true },
  iv: { type: String, required: true },
  fileType: { type: String, enum: ['image', 'pdf'] },
  fileMime: { type: String },
  timestamp: { type: Date, default: Date.now }
});

messageSchema.index({ sender: 1, receiver: 1, timestamp: 1 });

module.exports = mongoose.model('Message', messageSchema);
