const express = require('express');
const cors = require('cors');
require('dotenv').config();
const config = require('./config');
const { generalLimiter } = require('./middleware/rateLimiter');
const initializeFirebase = require('./config/firebase');

// ── Startup validation ────────────────────────────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY'];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
  console.error('   Set these in your .env file or Render environment settings.');
  process.exit(1);
}

// Initialize Firebase Admin (includes Firestore)
initializeFirebase();

const app = express();
const PORT = config.PORT;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:3000',
      'capacitor://localhost',
      'http://localhost',  // Android WebView origin
      'https://localhost', // Some Capacitor versions
      'http://localhost:8080'
    ].filter(Boolean);

    // Check if origin is allowed
    const isAllowed = allowedOrigins.some(ao => origin.startsWith(ao));

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`⚠️ [CORS] blocked: Origin "${origin}" not in allowed list:`, allowedOrigins);
      callback(new Error(`CORS: Origin ${origin} not allowed`));
    }
  },
  credentials: true,
}));

app.use(express.json({ limit: '10mb' })); // Limit request size for security

// Apply general rate limiting to all routes
app.use('/api/', generalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });
  next();
});

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

app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'QueueGo API is reachable',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('🚀 QueueGo Backend is LIVE!');
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

