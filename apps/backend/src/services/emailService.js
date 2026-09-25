const nodemailer = require('nodemailer');
const { smtp, gymDisplayName } = require('../config/env');

let transporter;

const getTransporter = () => {
  if (transporter) return transporter;

  if (!smtp.host || !smtp.user || !smtp.password || !smtp.from) {
    return null;
  }

  const isGmail = String(smtp.host).toLowerCase().includes('gmail');

  transporter = nodemailer.createTransport(
    isGmail
      ? {
          service: 'gmail',
          auth: {
            user: smtp.user,
            pass: smtp.password,
          },
        }
      : {
          host: smtp.host,
          port: smtp.port,
          secure: smtp.port === 465,
          auth: {
            user: smtp.user,
            pass: smtp.password,
          },
        }
  );

  return transporter;
};

const sendPasswordResetOtpEmail = async ({ to, otp, expiryMinutes }) => {
  const mailer = getTransporter();
  if (!mailer) {
    console.log('\n========================================');
    console.log('[EMAIL SERVICE] SMTP not configured.');
    console.log(`[EMAIL SERVICE] Password reset OTP for ${to}: ${otp}`);
    console.log(`[EMAIL SERVICE] Expires in: ${expiryMinutes} minutes`);
    console.log('========================================\n');
    return { delivered: false, simulated: true, otp };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>${gymDisplayName} - Password Reset OTP</h2>
      <p>Use the one-time password below to reset your admin account password.</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This OTP expires in ${expiryMinutes} minutes.</p>
      <p>If you did not request this, ignore this email and contact support immediately.</p>
    </div>
  `;

  try {
    await mailer.sendMail({
      from: smtp.from,
      to,
      subject: `${gymDisplayName} - Password Reset OTP`,
      html,
    });
    return { delivered: true };
  } catch (err) {
    console.error(`[EMAIL SERVICE] Failed to send email to ${to}:`, err.message);
    console.log('\n========================================');
    console.log(`[EMAIL SERVICE] Fallback OTP for ${to}: ${otp}`);
    console.log('========================================\n');
    return { delivered: false, simulated: true, otp, error: err.message };
  }
};

const sendEmailChangeOtpEmail = async ({ to, otp, expiryMinutes }) => {
  const mailer = getTransporter();
  if (!mailer) {
    console.log('\n========================================');
    console.log('[EMAIL SERVICE] SMTP not configured.');
    console.log(`[EMAIL SERVICE] Email verification OTP for ${to}: ${otp}`);
    console.log(`[EMAIL SERVICE] Expires in: ${expiryMinutes} minutes`);
    console.log('========================================\n');
    return { delivered: false, simulated: true, otp };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;">
      <h2>${gymDisplayName} - Verify New Email</h2>
      <p>Use the OTP below to verify your new email address.</p>
      <p style="font-size: 24px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This OTP expires in ${expiryMinutes} minutes.</p>
    </div>
  `;

  try {
    await mailer.sendMail({
      from: smtp.from,
      to,
      subject: `${gymDisplayName} - Email Verification OTP`,
      html,
    });
    return { delivered: true };
  } catch (err) {
    console.error(`[EMAIL SERVICE] Failed to send email to ${to}:`, err.message);
    console.log('\n========================================');
    console.log(`[EMAIL SERVICE] Fallback OTP for ${to}: ${otp}`);
    console.log('========================================\n');
    return { delivered: false, simulated: true, otp, error: err.message };
  }
};

const sendPasswordResetLinkEmail = async ({ to, resetUrl, expiryMinutes }) => {
  const mailer = getTransporter();
  if (!mailer) {
    console.log('\n========================================');
    console.log('[EMAIL SERVICE] SMTP not configured.');
    console.log(`[EMAIL SERVICE] Password reset link for ${to}: ${resetUrl}`);
    console.log(`[EMAIL SERVICE] Expires in: ${expiryMinutes} minutes`);
    console.log('========================================\n');
    return { delivered: false, simulated: true, resetUrl };
  }

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
      <h2 style="color: #111827; margin-top: 0;">${gymDisplayName} - Password Reset Request</h2>
      <p style="color: #374151;">We received a request to reset your account password.</p>
      <p style="color: #374151;">Click the button below to change your password:</p>
      <div style="margin: 28px 0;">
        <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Change Password</a>
      </div>
      <p style="color: #6b7280; font-size: 14px;">If the button doesn't work, copy and paste this link into your browser:</p>
      <p style="color: #2563eb; font-size: 13px; word-break: break-all;"><a href="${resetUrl}" style="color: #2563eb;">${resetUrl}</a></p>
      <p style="color: #6b7280; font-size: 13px; margin-top: 24px;">This link will expire in ${expiryMinutes} minutes.</p>
      <p style="color: #9ca3af; font-size: 12px;">If you did not request a password reset, please ignore this email.</p>
    </div>
  `;

  try {
    await mailer.sendMail({
      from: smtp.from,
      to,
      subject: `${gymDisplayName} - Reset Your Password`,
      html,
    });
    return { delivered: true };
  } catch (err) {
    console.error(`[EMAIL SERVICE] Failed to send email to ${to}:`, err.message);
    console.log('\n========================================');
    console.log(`[EMAIL SERVICE] Fallback reset link for ${to}: ${resetUrl}`);
    console.log('========================================\n');
    return { delivered: false, simulated: true, resetUrl, error: err.message };
  }
};

module.exports = {
  sendPasswordResetOtpEmail,
  sendEmailChangeOtpEmail,
  sendPasswordResetLinkEmail,
};
