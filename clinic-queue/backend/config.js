// Application configuration
require('dotenv').config();

module.exports = {
  PORT: process.env.PORT || 5000,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
};
