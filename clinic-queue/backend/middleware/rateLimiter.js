// Rate limiting middleware to prevent abuse
// Allows reasonable usage while protecting the server

const rateLimit = require('express-rate-limit');

// General API rate limiter - applies to all routes (VERY LENIENT FOR PROTOTYPE)
const generalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 1000, // Limit each IP to 1000 requests per minute (very high for demos)
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Booking endpoint - more restrictive (prevent spam) - LENIENT FOR PROTOTYPE
const bookingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit to 100 bookings per 15 minutes (high for testing)
  message: 'Too many booking requests. Please wait before booking again.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Queue checking - more lenient (people check frequently)
const queueLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 300, // 300 requests per minute (very lenient)
  message: 'Too many queue checks. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  bookingLimiter,
  queueLimiter,
};
