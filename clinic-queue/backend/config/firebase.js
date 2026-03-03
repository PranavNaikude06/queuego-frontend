const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');

const initializeFirebase = () => {
    if (admin.apps.length === 0) {
        try {
            let privateKey = process.env.FIREBASE_PRIVATE_KEY;

            if (!privateKey) {
                console.error('❌ FIREBASE_PRIVATE_KEY is missing');
                return false;
            }

            // Diagnostic BEFORE processing
            console.log('Firebase Private Key raw diagnostic:');
            console.log('- Raw length:', privateKey.length);
            const rawPrefix = privateKey.substring(0, 10);
            console.log('- Raw prefix (hex):', Buffer.from(rawPrefix).toString('hex'));

            // 1. Convert literal \n to real newlines
            privateKey = privateKey.replace(/\\n/g, '\n');

            // 2. ULTRA-FORGIVING PEM RECONSTRUCTION
            const textStart = 'BEGIN PRIVATE KEY';
            const textEnd = 'END PRIVATE KEY';

            const startPos = privateKey.indexOf(textStart);
            const endPos = privateKey.indexOf(textEnd);

            if (startPos === -1 || endPos === -1) {
                console.error('❌ Could not find "BEGIN PRIVATE KEY" or "END PRIVATE KEY" markers.');
                // Sanitize and log the start for debugging
                console.log('- Raw start sanitized:', privateKey.substring(0, 40).replace(/[^a-zA-Z -]/g, '?'));
            } else {
                // Find where the base64 actually starts (usually after some dashes and a newline)
                // We'll search for 'MII' which is the start of almost all Firebase RSA keys
                let content = privateKey.substring(startPos + textStart.length);
                const miiPos = content.indexOf('MII');

                if (miiPos !== -1) {
                    content = content.substring(miiPos);
                } else {
                    // If no MII, just take everything after the first newline/space
                    content = content.trim().replace(/^-+/, '').trim();
                }

                // Find where the content ends (before the END marker)
                const endInContent = content.indexOf(textEnd);
                if (endInContent !== -1) {
                    content = content.substring(0, endInContent);
                }

                // Final cleanup of the base64 content
                content = content.trim().replace(/-+$/, '').trim();

                // RECONSTRUCT with perfect format
                privateKey = `-----BEGIN PRIVATE KEY-----\n${content}\n-----END PRIVATE KEY-----`;
            }

            console.log('Firebase Private Key final diagnostic:');
            console.log('- Final length:', privateKey.length);
            console.log('- Header Check:', privateKey.startsWith('-----BEGIN PRIVATE KEY-----'));
            console.log('- Footer Check:', privateKey.endsWith('-----END PRIVATE KEY-----'));

            admin.initializeApp({
                credential: admin.credential.cert({
                    projectId: process.env.FIREBASE_PROJECT_ID,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: privateKey,
                }),
            });
            console.log('✅ Firebase Admin Initialized');
            return true;
        } catch (error) {
            console.error('❌ Firebase Admin Initialization Error:', error.message);
            return false;
        }
    }
    return true;
};

// Initialize immediately
initializeFirebase();

// Always get a db instance to prevent boot crashes.
// If initialization failed above, getFirestore() might throw, so we wrap it.
let db;
try {
    db = getFirestore();
} catch (e) {
    console.error('❌ Firestore Initialization delayed/failed:', e.message);
    db = null; // Routes will still error when used, but server will boot.
}

module.exports = initializeFirebase;
module.exports.db = db;

module.exports = initializeFirebase;
module.exports.db = db;
