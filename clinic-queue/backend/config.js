// Database configuration
require('dotenv').config();

module.exports = {
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb+srv://latanaikude2_db_user:OqqG6B69UTrIt6IS@bmdproject.o2h0x03.mongodb.net/clinic-queue?retryWrites=true&w=majority',
  PORT: process.env.PORT || 5000,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
};
