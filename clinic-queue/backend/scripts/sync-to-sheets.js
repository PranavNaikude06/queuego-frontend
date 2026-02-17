require('dotenv').config();
const admin = require('firebase-admin');
const { logCustomer, logBusiness } = require('../services/googleSheets');

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

async function syncUsersToSheets() {
    try {
        console.log('🔄 Starting sync of existing data to Google Sheets...\n');

        // Get all users
        const usersSnapshot = await db.collection('users').get();

        let customerCount = 0;
        let businessCount = 0;

        console.log(`📊 Found ${usersSnapshot.size} total users in database\n`);

        for (const doc of usersSnapshot.docs) {
            const userData = doc.data();

            // Sync customers
            if (userData.role === 'customer') {
                try {
                    await logCustomer({
                        name: userData.name || 'N/A',
                        email: userData.email || 'N/A',
                        phoneNumber: userData.phoneNumber || 'N/A'
                    });
                    customerCount++;
                    console.log(`✅ Synced customer: ${userData.email}`);
                } catch (error) {
                    console.error(`❌ Failed to sync customer ${userData.email}:`, error.message);
                }
            }

            // Sync business admins
            if (userData.role === 'admin' && userData.businessId) {
                try {
                    // Get business details
                    const businessDoc = await db.collection('businesses').doc(userData.businessId).get();

                    if (businessDoc.exists) {
                        const businessData = businessDoc.data();

                        await logBusiness(
                            {
                                name: businessData.name || 'N/A',
                                address: businessData.address || 'N/A'
                            },
                            {
                                name: userData.name || 'N/A',
                                email: userData.email || 'N/A',
                                phoneNumber: userData.phoneNumber || 'N/A'
                            }
                        );
                        businessCount++;
                        console.log(`✅ Synced business: ${businessData.name} (${userData.email})`);
                    }
                } catch (error) {
                    console.error(`❌ Failed to sync business for ${userData.email}:`, error.message);
                }
            }
        }

        console.log('\n🎉 Sync completed!');
        console.log(`📈 Summary:`);
        console.log(`   - Customers synced: ${customerCount}`);
        console.log(`   - Businesses synced: ${businessCount}`);
        console.log(`   - Total synced: ${customerCount + businessCount}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Sync failed:', error);
        process.exit(1);
    }
}

// Run the sync
syncUsersToSheets();
