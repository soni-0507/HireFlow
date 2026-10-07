import mongoose from 'mongoose';

// Stores "sent" emails produced by the mock mail service.
const notificationSchema = new mongoose.Schema(
  {
    to: { type: String, required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    kind: { type: String, default: 'general' },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.model('Notification', notificationSchema);
