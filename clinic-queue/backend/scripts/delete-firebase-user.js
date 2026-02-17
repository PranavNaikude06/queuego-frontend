require('dotenv').config();
const admin = require('firebase-admin');

// Initialize Firebase if not already initialized
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
}

async function deleteFirebaseUser(email) {
    try {
        console.log(`\n🔍 Looking for user: ${email}\n`);

        // Get user by email
        const user = await admin.auth().getUserByEmail(email);
        console.log(`✅ Found user in Firebase Auth:`);
        console.log(`   - UID: ${user.uid}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Created: ${new Date(user.metadata.creationTime).toLocaleString()}\n`);

        // Delete the user
        await admin.auth().deleteUser(user.uid);
        console.log(`✅ Successfully deleted user from Firebase Authentication!`);
        console.log(`\n💡 The email ${email} can now be used to sign up again.\n`);

        process.exit(0);
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            console.log(`❌ User not found in Firebase Authentication: ${email}`);
        } else {
            console.error(`❌ Error deleting user:`, error.message);
        }
        process.exit(1);
    }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address');
    console.error('   Usage: node scripts/delete-firebase-user.js email@example.com');
    process.exit(1);
}

deleteFirebaseUser(email);
