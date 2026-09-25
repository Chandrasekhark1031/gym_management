const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const generateOtp = () => String(crypto.randomInt(100000, 1000000));

const hashOtp = async (otp) => bcrypt.hash(otp, 10);

const verifyOtp = async (otp, otpHash) => bcrypt.compare(otp, otpHash);

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtp,
};
