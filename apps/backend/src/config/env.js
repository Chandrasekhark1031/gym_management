const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../../../.env') });
dotenv.config({ path: path.join(__dirname, '../../.env') });

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  port: process.env.PORT || 5000,
  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  jwtResetExpiresIn: process.env.JWT_RESET_EXPIRES_IN || '15m',
  otpExpiryMinutes: Number(process.env.OTP_EXPIRY_MINUTES || 5),
  otpMaxAttempts: Number(process.env.OTP_MAX_ATTEMPTS || 5),
  otpResendCooldownSeconds: Number(process.env.OTP_RESEND_COOLDOWN_SECONDS || 60),
  gymDisplayName: process.env.GYM_DISPLAY_NAME || 'Gym Management',
  defaultAdmin: {
    name: process.env.DEFAULT_ADMIN_NAME || 'Gym Owner',
    email: process.env.DEFAULT_ADMIN_EMAIL,
    phone: process.env.DEFAULT_ADMIN_PHONE,
    password: process.env.DEFAULT_ADMIN_PASSWORD,
    gymName: process.env.DEFAULT_ADMIN_GYM_NAME,
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    user: process.env.SMTP_USER,
    password: process.env.SMTP_PASSWORD,
    from: process.env.SMTP_FROM,
  },
  db: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  },
};
