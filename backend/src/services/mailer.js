import Notification from '../models/Notification.js';

/**
 * Mock email service. Swap the body of this function for Nodemailer / SES / SendGrid
 * in production. For now every "email" is printed to the console and stored in MongoDB
 * so it can be reviewed in the UI (Activity -> Emails).
 */
export async function sendMail({ to, subject, body, kind = 'general' }) {
  try {
    console.log(`[mock-email] to=${to} | ${subject}`);
    await Notification.create({ to, subject, body, kind });
  } catch (err) {
    console.error('[mock-email] failed:', err.message);
  }
}
