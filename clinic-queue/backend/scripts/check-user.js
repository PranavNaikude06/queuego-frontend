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

const db = admin.firestore();

async function checkUser(email) {
    try {
        console.log(`\n🔍 Checking for user: ${email}\n`);

        // Check Firebase Authentication
        let authUser = null;
        try {
            authUser = await admin.auth().getUserByEmail(email);
            console.log('✅ Found in Firebase Authentication:');
            console.log(`   - UID: ${authUser.uid}`);
            console.log(`   - Email: ${authUser.email}`);
            console.log(`   - Created: ${new Date(authUser.metadata.creationTime).toLocaleString()}`);
        } catch (error) {
            if (error.code === 'auth/user-not-found') {
                console.log('❌ NOT found in Firebase Authentication');
            } else {
                throw error;
            }
        }

        // Check Firestore users collection
        const usersSnapshot = await db.collection('users')
            .where('email', '==', email.toLowerCase())
            .get();

        if (!usersSnapshot.empty) {
            console.log('\n✅ Found in Firestore users collection:');
            usersSnapshot.forEach(doc => {
                const data = doc.data();
                console.log(`   - Document ID: ${doc.id}`);
                console.log(`   - Name: ${data.name || 'N/A'}`);
                console.log(`   - Role: ${data.role}`);
                console.log(`   - Business ID: ${data.businessId || 'N/A'}`);
            });
        } else {
            console.log('\n❌ NOT found in Firestore users collection');
        }

        // Suggest fix if orphaned
        if (authUser && usersSnapshot.empty) {
            console.log('\n⚠️  ISSUE DETECTED: Orphaned Firebase Auth record!');
            console.log('   The user exists in Firebase Authentication but not in Firestore.');
            console.log('\n💡 Fix: Delete the Firebase Auth user to allow re-registration.');
            console.log(`\n   Run this command to delete:`);
            console.log(`   node scripts/delete-firebase-user.js ${email}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Get email from command line argument
const email = process.argv[2];

if (!email) {
    console.error('❌ Please provide an email address');
    console.error('   Usage: node scripts/check-user.js email@example.com');
    process.exit(1);
}

checkUser(email);
