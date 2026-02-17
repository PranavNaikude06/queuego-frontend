require('dotenv').config({ path: __dirname + '/../.env' });
const initializeFirebase = require('../config/firebase');

async function testFirebase() {
    console.log('Testing Firebase Admin integration...');
    const admin = initializeFirebase();

    if (admin) {
        try {
            const listUsersResult = await admin.auth().listUsers(1);
            console.log('✅ Firebase Admin connected successfully!');
            console.log('Recent Users Count:', listUsersResult.users.length);
        } catch (err) {
            console.error('❌ Firebase Admin check failed:', err.message);
            console.log('Note: This might fail if you have no users yet, but connection is likely OK if it didnt crash during init.');
        }
    } else {
        console.error('❌ Firebase Admin failed to initialize.');
    }
}

testFirebase();
