const errorHandler = (err, req, res, next) => {
  console.error(err);

  // Default error
  let statusCode = 500;
  let message = 'Internal Server Error';

  // Postgres unique constraint violation
  if (err.code === '23505') {
    statusCode = 400;
    const constraint = err.constraint || '';
    if (constraint.includes('email')) {
      message = 'Email already in use';
    } else if (constraint.includes('phone')) {
      message = 'Phone number already in use';
    } else {
      message = 'Duplicate entry found';
    }
  }

  if (err.message === 'Email service is not configured') {
    statusCode = 503;
    message = 'Email service is not configured. Contact administrator.';
  }

  if (err.message?.includes('images are allowed') || err.code === 'LIMIT_FILE_SIZE') {
    statusCode = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 5MB)' : err.message;
  }

  // Handle express validation or custom errors here if needed
  if (err.status) {
    statusCode = err.status;
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
