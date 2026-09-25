const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const normalizePhone = (value) => value.replace(/\D/g, '');

const isValidPhone = (value) => normalizePhone(value).length >= 10;

const isStrongPassword = (password) => {
  if (!password || password.length < 8) return false;
  return /[A-Za-z]/.test(password) && /\d/.test(password);
};

module.exports = {
  isEmail,
  normalizePhone,
  isValidPhone,
  isStrongPassword,
};
