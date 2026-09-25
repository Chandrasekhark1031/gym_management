require('./config/env');
const path = require('path');
const express = require('express');
const cors = require('cors');
const pool = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const customersRoutes = require('./routes/customersRoutes');
const plansRoutes = require('./routes/plansRoutes');
const membershipsRoutes = require('./routes/membershipsRoutes');
const paymentsRoutes = require('./routes/paymentsRoutes');
const notificationsRoutes = require('./routes/notificationsRoutes');
const customerAuthRoutes = require('./routes/customerAuthRoutes');
const customerPortalRoutes = require('./routes/customerPortalRoutes');
const errorHandler = require('./middleware/errorMiddleware');
const { migrate } = require('./db/migrate');
const { seedDefaultAdmin } = require('./db/seedAdmin');
const { nodeEnv, frontendUrl } = require('./config/env');

const app = express();

const corsOrigins =
  nodeEnv === 'production'
    ? [frontendUrl].filter(Boolean)
    : ['http://localhost:3000', 'http://127.0.0.1:3000', frontendUrl].filter(
        (v, i, a) => Boolean(v) && a.indexOf(v) === i
      );

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (nodeEnv !== 'production') {
        if (
          /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
          /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
          /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin) ||
          /\.ngrok(-free)?\.(app|dev|io)$/.test(origin)
        ) {
          return callback(null, true);
        }
      }
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  try {
    const result = await pool.query('SELECT 1');
    if (result.rowCount === 1) {
      dbStatus = 'connected';
    }
  } catch (error) {
    dbStatus = 'error';
  }

  res.status(200).json({
    success: true,
    message: 'Gym Management API is running',
    database: dbStatus,
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/plans', plansRoutes);
app.use('/api/memberships', membershipsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/customer/auth', customerAuthRoutes);
app.use('/api/customer', customerPortalRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await migrate();
    await seedDefaultAdmin();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
}

startServer();
