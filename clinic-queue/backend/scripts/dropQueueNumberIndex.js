// Script to drop the unique index on queueNumber
// Run this once: node scripts/dropQueueNumberIndex.js

const mongoose = require('mongoose');
require('dotenv').config();
const config = require('../config');

async function dropIndex() {
  try {
    await mongoose.connect(config.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const collection = db.collection('appointments');

    // Get all indexes
    const indexes = await collection.indexes();
    console.log('Current indexes:', indexes);

    // Drop the unique index on queueNumber if it exists
    try {
      await collection.dropIndex('queueNumber_1');
      console.log('✅ Dropped queueNumber_1 index');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('ℹ️  queueNumber_1 index not found (may already be dropped)');
      } else {
        throw err;
      }
    }

    // Also try dropping queueNumber unique index if it has a different name
    try {
      await collection.dropIndex({ queueNumber: 1 });
      console.log('✅ Dropped queueNumber index');
    } catch (err) {
      if (err.codeName === 'IndexNotFound') {
        console.log('ℹ️  queueNumber index not found');
      } else {
        console.log('ℹ️  Could not drop queueNumber index:', err.message);
      }
    }

    // Verify indexes
    const newIndexes = await collection.indexes();
    console.log('Remaining indexes:', newIndexes);

    console.log('✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropIndex();
