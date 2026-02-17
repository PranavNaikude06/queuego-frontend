const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });



// Initialize Firebase Admin
if (admin.apps.length === 0) {
    try {
        const privateKey = process.env.FIREBASE_PRIVATE_KEY
            ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
            : undefined;

        if (!process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
            throw new Error('Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY in .env');
        }

        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: privateKey
            })
        });
        console.log('Firebase Admin Initialized via Environment Variables');
    } catch (error) {
        console.error('Failed to initialize Firebase Admin:', error.message);
        process.exit(1);
    }
}

const db = admin.firestore();
const USERS = db.collection('users');
const BUSINESSES = db.collection('businesses');

const createAdminUser = async () => {
    try {
        const EMAIL = 'admin@owner.com';
        const PASSWORD = 'password123';
        const BUSINESS_NAME = 'QueueGo HQ';

        console.log(`Creating Admin User: ${EMAIL}`);

        // 1. Check if user already exists
        const userSnapshot = await USERS.where('email', '==', EMAIL).limit(1).get();
        if (!userSnapshot.empty) {
            console.log('User already exists. Updating permissions and password...');
            const hashedPassword = await bcrypt.hash(PASSWORD, 10);
            const userDoc = userSnapshot.docs[0];
            await userDoc.ref.update({
                role: 'admin',
                password: hashedPassword, // Force update password
                subscription: { status: 'premium', plan: 'enterprise' },
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log('User permissions and password updated.');

            // Ensure they have a business
            const userData = userDoc.data();
            if (!userData.businessId) {
                console.log('User missing business. Creating one...');
                // Proceed to create business logic below (refactored for reuse)
            } else {
                console.log(`User already linked to Business ID: ${userData.businessId}`);
                process.exit(0);
            }
        }

        // 2. Create Business
        const slug = BUSINESS_NAME.toLowerCase().replace(/ /g, '-');
        const businessRef = await BUSINESSES.add({
            name: BUSINESS_NAME,
            slug: slug,
            email: EMAIL,
            subscription: { status: 'premium', plan: 'enterprise' }, // Business level subscription
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`Business Created: ${BUSINESS_NAME} (ID: ${businessRef.id})`);

        // 3. Create User
        const hashedPassword = await bcrypt.hash(PASSWORD, 10);
        await USERS.add({
            name: 'Super Admin',
            email: EMAIL,
            password: hashedPassword,
            role: 'admin',
            businessId: businessRef.id,
            subscription: { status: 'premium', plan: 'enterprise' }, // User level override/check
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`✅ Success! User ${EMAIL} created with password ${PASSWORD}`);
        console.log('Access Level: Premium, Admin, Owner');
        process.exit(0);

    } catch (error) {
        console.error('Error creating admin user:', error);
        process.exit(1);
    }
};

createAdminUser();
