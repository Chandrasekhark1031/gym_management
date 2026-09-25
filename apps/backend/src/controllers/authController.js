const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const pool = require('../config/database');
const { generateToken, generatePasswordResetToken, verifyToken } = require('../utils/jwt');
const { generateOtp, hashOtp, verifyOtp } = require('../utils/otp');
const { isEmail, normalizePhone, isValidPhone, isStrongPassword } = require('../utils/validators');
const { sendPasswordResetOtpEmail, sendEmailChangeOtpEmail, sendPasswordResetLinkEmail } = require('../services/emailService');
const {
  frontendUrl,
  otpExpiryMinutes,
  otpMaxAttempts,
  otpResendCooldownSeconds,
} = require('../config/env');

const formatOwner = (row) => ({
  id: row.id,
  name: row.name,
  email: row.email,
  phone: row.phone,
  role: 'OWNER',
  address: row.address,
  gymName: row.gym_name,
  upiId: row.upi_id,
  photoUrl: row.photo_url,
  bankCandidateName: row.bank_candidate_name,
  paymentPhone: row.payment_phone,
  qrCodeUrl: row.qr_code_url,
  emailVerified: row.email_verified,
  phoneVerified: row.phone_verified,
  lastLoginAt: row.last_login_at,
});

const findOwnerByIdentifier = async (identifier) => {
  const trimmed = identifier.trim();
  if (isEmail(trimmed)) {
    const result = await pool.query('SELECT * FROM gym_owners WHERE LOWER(email) = LOWER($1)', [trimmed]);
    return result.rows[0];
  }

  const phoneDigits = normalizePhone(trimmed);
  if (!isValidPhone(trimmed)) {
    return null;
  }

  const result = await pool.query(
    `SELECT * FROM gym_owners
     WHERE phone = $1 OR regexp_replace(phone, '[^0-9]', '', 'g') = $2`,
    [trimmed, phoneDigits]
  );
  return result.rows[0];
};

const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }

    const owner = await findOwnerByIdentifier(identifier);
    if (!owner) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, owner.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await pool.query('UPDATE gym_owners SET last_login_at = NOW(), updated_at = NOW() WHERE id = $1', [owner.id]);

    const token = generateToken(owner.id, 'OWNER');

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: formatOwner(owner),
    });
  } catch (error) {
    return next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM gym_owners WHERE id = $1', [req.ownerId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Owner not found' });
    }

    return res.status(200).json({
      success: true,
      user: formatOwner(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

const invalidateActivePasswordOtps = async (ownerId) => {
  await pool.query(
    'UPDATE password_reset_otps SET used = TRUE WHERE owner_id = $1 AND used = FALSE',
    [ownerId]
  );
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !isEmail(email)) {
      return res.status(400).json({ success: false, message: 'A valid registered email is required' });
    }

    const ownerResult = await pool.query('SELECT * FROM gym_owners WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (ownerResult.rows.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'If the email is registered, an OTP has been sent.',
      });
    }

    const owner = ownerResult.rows[0];

    const recent = await pool.query(
      `SELECT created_at FROM password_reset_otps
       WHERE owner_id = $1 AND created_at > NOW() - ($2 || ' seconds')::interval
       ORDER BY created_at DESC LIMIT 1`,
      [owner.id, String(otpResendCooldownSeconds)]
    );

    if (recent.rows.length > 0) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${otpResendCooldownSeconds} seconds before requesting another reset link.`,
      });
    }

    await invalidateActivePasswordOtps(owner.id);

    const resetToken = generatePasswordResetToken(owner.id);
    const resetUrl = `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    const emailResult = await sendPasswordResetLinkEmail({
      to: owner.email,
      resetUrl,
      expiryMinutes: 15,
    });

    if (!emailResult.delivered) {
      if (emailResult.simulated) {
        return res.status(500).json({
          success: false,
          message:
            'Email service (SMTP) is not configured in backend .env. Please configure SMTP to receive reset emails.',
        });
      }
      return res.status(500).json({
        success: false,
        message: emailResult.error || 'Failed to send email. Please check SMTP settings.',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'A password reset link has been sent to your email. Please check your inbox.',
    });
  } catch (error) {
    return next(error);
  }
};

const verifyOtpForReset = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const ownerResult = await pool.query('SELECT * FROM gym_owners WHERE LOWER(email) = LOWER($1)', [email.trim()]);
    if (ownerResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid OTP' });
    }

    const owner = ownerResult.rows[0];
    const otpResult = await pool.query(
      `SELECT * FROM password_reset_otps
       WHERE owner_id = $1 AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [owner.id]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const otpRow = otpResult.rows[0];
    if (otpRow.attempts >= otpMaxAttempts) {
      return res.status(401).json({ success: false, message: 'Too many failed attempts. Request a new OTP.' });
    }

    const isValid = await verifyOtp(String(otp).trim(), otpRow.otp_hash);
    if (!isValid) {
      await pool.query('UPDATE password_reset_otps SET attempts = attempts + 1 WHERE id = $1', [otpRow.id]);
      return res.status(401).json({ success: false, message: 'Invalid OTP' });
    }

    await pool.query('UPDATE password_reset_otps SET used = TRUE WHERE id = $1', [otpRow.id]);

    const resetToken = generatePasswordResetToken(owner.id);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      resetToken,
    });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, password, confirmPassword } = req.body;
    if (!resetToken || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include letters and numbers',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(resetToken);
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired reset token' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(401).json({ success: false, message: 'Invalid reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE gym_owners SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, decoded.ownerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully.',
    });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include letters and numbers',
      });
    }

    const ownerResult = await pool.query('SELECT * FROM gym_owners WHERE id = $1', [req.ownerId]);
    const owner = ownerResult.rows[0];
    const isMatch = await bcrypt.compare(currentPassword, owner.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE gym_owners SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, req.ownerId]
    );

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    return next(error);
  }
};

const registerOwner = async (req, res, next) => {
  try {
    const { name, gymName, email, phone, address, password, confirmPassword } = req.body;

    if (!name || !gymName || !email || !phone || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Please fill all required fields' });
    }

    if (name.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Name must be at least 2 characters' });
    }

    if (gymName.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Gym name must be at least 2 characters' });
    }

    if (!isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email format' });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: 'Invalid phone number' });
    }

    if (!isStrongPassword(password)) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters and include letters and numbers',
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone.trim();
    const phoneDigits = normalizePhone(trimmedPhone);

    const duplicate = await pool.query(
      `SELECT id FROM gym_owners
       WHERE LOWER(email) = LOWER($1)
          OR phone = $2
          OR regexp_replace(phone, '[^0-9]', '', 'g') = $3`,
      [trimmedEmail, trimmedPhone, phoneDigits]
    );

    if (duplicate.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email or phone number already registered for an owner' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const ownerId = crypto.randomUUID();

    const insertResult = await pool.query(
      `INSERT INTO gym_owners (
        id, name, gym_name, email, phone, address, password_hash,
        email_verified, phone_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, FALSE, NOW(), NOW())
      RETURNING *`,
      [ownerId, name.trim(), gymName.trim(), trimmedEmail, trimmedPhone, address?.trim() || null, passwordHash]
    );

    const token = generateToken(ownerId, 'OWNER');

    return res.status(201).json({
      success: true,
      message: 'Owner registration successful. You can now login.',
      token,
      user: formatOwner(insertResult.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, address, gymName, upiId, photoUrl, bankCandidateName, paymentPhone, qrCodeUrl } = req.body;
    const result = await pool.query(
      `UPDATE gym_owners
       SET name = COALESCE($1, name),
           address = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE address END,
           gym_name = CASE WHEN $3::text IS NOT NULL THEN $3 ELSE gym_name END,
           upi_id = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE upi_id END,
           photo_url = CASE WHEN $5::text IS NOT NULL THEN $5 ELSE photo_url END,
           bank_candidate_name = CASE WHEN $6::text IS NOT NULL THEN $6 ELSE bank_candidate_name END,
           payment_phone = CASE WHEN $7::text IS NOT NULL THEN $7 ELSE payment_phone END,
           qr_code_url = CASE WHEN $8::text IS NOT NULL THEN $8 ELSE qr_code_url END,
           updated_at = NOW()
       WHERE id = $9
       RETURNING *`,
      [
        name || null,
        address !== undefined ? address : null,
        gymName !== undefined ? gymName : null,
        upiId !== undefined ? upiId : null,
        photoUrl !== undefined ? photoUrl : null,
        bankCandidateName !== undefined ? bankCandidateName : null,
        paymentPhone !== undefined ? paymentPhone : null,
        qrCodeUrl !== undefined ? qrCodeUrl : null,
        req.ownerId,
      ]
    );

    return res.status(200).json({ success: true, user: formatOwner(result.rows[0]) });
  } catch (error) {
    return next(error);
  }
};

const uploadGymLogo = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Logo image file is required' });
    }
    const logoUrl = `/uploads/logos/${req.file.filename}`;
    const result = await pool.query(
      'UPDATE gym_owners SET photo_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [logoUrl, req.ownerId]
    );
    return res.status(200).json({
      success: true,
      message: 'Logo uploaded successfully',
      photoUrl: logoUrl,
      user: formatOwner(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

const uploadPaymentQrCode = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'QR code image file is required' });
    }
    const qrCodeUrl = `/uploads/qrcodes/${req.file.filename}`;
    const result = await pool.query(
      'UPDATE gym_owners SET qr_code_url = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
      [qrCodeUrl, req.ownerId]
    );
    return res.status(200).json({
      success: true,
      message: 'QR code uploaded successfully',
      qrCodeUrl,
      user: formatOwner(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

const changePhone = async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone || !isValidPhone(phone)) {
      return res.status(400).json({ success: false, message: 'A valid phone number is required' });
    }

    const duplicate = await pool.query(
      'SELECT id FROM gym_owners WHERE phone = $1 AND id <> $2',
      [phone.trim(), req.ownerId]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Phone number already in use' });
    }

    const result = await pool.query(
      `UPDATE gym_owners
       SET phone = $1, phone_verified = FALSE, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [phone.trim(), req.ownerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Phone number updated (not verified until OTP verification is implemented).',
      user: formatOwner(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

const requestEmailChange = async (req, res, next) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail || !isEmail(newEmail)) {
      return res.status(400).json({ success: false, message: 'A valid new email is required' });
    }

    const normalizedEmail = newEmail.trim().toLowerCase();
    const duplicate = await pool.query(
      'SELECT id FROM gym_owners WHERE LOWER(email) = LOWER($1) AND id <> $2',
      [normalizedEmail, req.ownerId]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const recent = await pool.query(
      `SELECT created_at FROM email_verification_otps
       WHERE owner_id = $1 AND created_at > NOW() - ($2 || ' seconds')::interval
       ORDER BY created_at DESC LIMIT 1`,
      [req.ownerId, String(otpResendCooldownSeconds)]
    );
    if (recent.rows.length > 0) {
      return res.status(429).json({
        success: false,
        message: `Please wait ${otpResendCooldownSeconds} seconds before requesting another OTP.`,
      });
    }

    await pool.query(
      'UPDATE email_verification_otps SET used = TRUE WHERE owner_id = $1 AND used = FALSE',
      [req.ownerId]
    );

    const otp = generateOtp();
    const otpHash = await hashOtp(otp);
    const otpId = crypto.randomUUID();

    await pool.query(
      `INSERT INTO email_verification_otps (id, owner_id, new_email, otp_hash, expires_at, attempts, used, created_at)
       VALUES ($1, $2, $3, $4, NOW() + ($5 || ' minutes')::interval, 0, FALSE, NOW())`,
      [otpId, req.ownerId, normalizedEmail, otpHash, String(otpExpiryMinutes)]
    );

    const emailResult = await sendEmailChangeOtpEmail({
      to: normalizedEmail,
      otp,
      expiryMinutes: otpExpiryMinutes,
    });

    const isDev = process.env.NODE_ENV !== 'production' || !emailResult?.delivered;
    return res.status(200).json({
      success: true,
      message: emailResult?.delivered
        ? 'Verification OTP sent to the new email address.'
        : `Verification OTP sent. (Dev mode: OTP is ${otp})`,
      ...(isDev ? { devOtp: otp } : {}),
    });
  } catch (error) {
    return next(error);
  }
};

const verifyEmailChange = async (req, res, next) => {
  try {
    const { newEmail, otp } = req.body;
    if (!newEmail || !otp) {
      return res.status(400).json({ success: false, message: 'New email and OTP are required' });
    }

    const normalizedEmail = newEmail.trim().toLowerCase();
    const otpResult = await pool.query(
      `SELECT * FROM email_verification_otps
       WHERE owner_id = $1 AND LOWER(new_email) = LOWER($2) AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [req.ownerId, normalizedEmail]
    );

    if (otpResult.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const otpRow = otpResult.rows[0];
    if (otpRow.attempts >= otpMaxAttempts) {
      return res.status(401).json({ success: false, message: 'Too many failed attempts. Request a new OTP.' });
    }

    const isValid = await verifyOtp(String(otp).trim(), otpRow.otp_hash);
    if (!isValid) {
      await pool.query('UPDATE email_verification_otps SET attempts = attempts + 1 WHERE id = $1', [otpRow.id]);
      return res.status(401).json({ success: false, message: 'Invalid OTP' });
    }

    await pool.query('UPDATE email_verification_otps SET used = TRUE WHERE id = $1', [otpRow.id]);

    const result = await pool.query(
      `UPDATE gym_owners
       SET email = $1, email_verified = TRUE, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [normalizedEmail, req.ownerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Email updated successfully.',
      user: formatOwner(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

const updateEmail = async (req, res, next) => {
  try {
    const { newEmail } = req.body;
    if (!newEmail || !isEmail(newEmail)) {
      return res.status(400).json({ success: false, message: 'A valid email is required' });
    }

    const normalizedEmail = newEmail.trim().toLowerCase();
    const duplicate = await pool.query(
      'SELECT id FROM gym_owners WHERE LOWER(email) = LOWER($1) AND id <> $2',
      [normalizedEmail, req.ownerId]
    );
    if (duplicate.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const result = await pool.query(
      `UPDATE gym_owners
       SET email = $1, email_verified = TRUE, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [normalizedEmail, req.ownerId]
    );

    return res.status(200).json({
      success: true,
      message: 'Email updated successfully.',
      user: formatOwner(result.rows[0]),
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  login,
  registerOwner,
  getMe,
  forgotPassword,
  verifyOtpForReset,
  resetPassword,
  changePassword,
  updateProfile,
  uploadGymLogo,
  uploadPaymentQrCode,
  changePhone,
  requestEmailChange,
  verifyEmailChange,
  updateEmail,
};
