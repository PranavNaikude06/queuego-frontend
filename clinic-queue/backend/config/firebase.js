const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const initializeFirebase = () => {
    if (admin.apps.length === 0) {
        try {
            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
                }),
            });
            console.log('✅ Firebase Admin Initialized');
        } catch (error) {
            console.error('❌ Firebase Admin Initialization Error:', error.message);
        }
    }
};

// Initialize immediately so db is ready
initializeFirebase();

const db = getFirestore();

module.exports = initializeFirebase;
module.exports.db = db;
