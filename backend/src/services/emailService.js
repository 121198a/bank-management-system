const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: {
      user: env.smtp.user,
      pass: env.smtp.pass
    }
  });

  return transporter;
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!env.smtp.user || !env.smtp.pass) {
    console.log(`Email delivery skipped because SMTP is not configured [recipient redacted, subject: ${subject}]`);
    return { simulated: true };
  }

  const mailer = getTransporter();
  const info = await mailer.sendMail({
    from: env.smtp.from,
    to,
    subject,
    text,
    html
  });

  return info;
};

const sendPasswordResetEmail = async (email, resetUrl) => {
  const subject = 'Password Reset Request - Bank Management System';
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Bank Management System - Password Reset</h2>
      <p>You requested a password reset. Click the link below to set a new password:</p>
      <p><a href="${resetUrl}" style="background-color:#16a34a;color:white;padding:10px 20px;text-decoration:none;border-radius:5px;">Reset Password</a></p>
      <p>If the button doesn't work, copy and paste this URL into your browser:</p>
      <p>${resetUrl}</p>
      <p>This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
    </div>
  `;
  const text = `Reset your password using this link: ${resetUrl} (expires in 1 hour)`;

  return sendEmail({ to: email, subject, html, text });
};

const sendAccountStatusEmail = async (email, fullName, status, accountNumber) => {
  const subject = `Account ${status === 'active' ? 'Approved' : 'Update'} - Bank Management System`;
  const statusText = status === 'active' ? 'approved and activated' : status;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Bank Management System - Account Update</h2>
      <p>Dear ${fullName},</p>
      <p>Your account <strong>${accountNumber}</strong> has been <strong>${statusText}</strong>.</p>
      <p>Thank you for banking with us.</p>
    </div>
  `;
  const text = `Dear ${fullName}, your account ${accountNumber} has been ${statusText}.`;

  return sendEmail({ to: email, subject, html, text });
};

const sendKycStatusEmail = async (email, fullName, status, remarks) => {
  const subject = `KYC ${status === 'approved' ? 'Approved' : 'Update'} - Bank Management System`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #16a34a;">Bank Management System - KYC Update</h2>
      <p>Dear ${fullName},</p>
      <p>Your KYC verification status is now: <strong>${status}</strong>.</p>
      ${remarks ? `<p>Remarks: ${remarks}</p>` : ''}
    </div>
  `;
  const text = `Dear ${fullName}, your KYC status is now ${status}. ${remarks || ''}`;

  return sendEmail({ to: email, subject, html, text });
};

module.exports = {
  sendEmail,
  sendPasswordResetEmail,
  sendAccountStatusEmail,
  sendKycStatusEmail
};
