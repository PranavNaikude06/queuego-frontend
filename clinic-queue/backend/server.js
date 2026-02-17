const express = require('express');
const cors = require('cors');
require('dotenv').config();
const config = require('./config');
const { generalLimiter } = require('./middleware/rateLimiter');
const initializeFirebase = require('./config/firebase');

// Initialize Firebase Admin (includes Firestore)
initializeFirebase();

const app = express();
const PORT = config.PORT;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit request size for security

// Apply general rate limiting to all routes
app.use('/api/', generalLimiter);

// Request logging middleware (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Stopping server...');
  process.exit(0);
});

// Routes
// Use scoped routes
app.use('/api/:businessId/appointments', require('./routes/appointments'));
app.use('/api/:businessId/auth', require('./routes/auth'));

// Global routes
app.use('/api/export', require('./routes/export')); // Export routes
app.use('/api/auth', require('./routes/auth')); // Auth routes
app.use('/api/businesses', require('./routes/businesses')); // Business routes
app.use('/api/appointments', require('./routes/appointments')); // Appointment routes
app.use('/api/payments', require('./routes/payments')); // Payment routes

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please close the other process.`);
  } else {
    console.error('❌ Server error:', err);
  }
});

// Log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
