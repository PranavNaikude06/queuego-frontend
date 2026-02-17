require('dotenv').config();
const { sendEmail } = require('../services/notificationService');

async function testEmail() {
    const testRecipient = process.argv[2] || 'zerolaggaming60@gmail.com';
    console.log(`🚀 Starting email test to: ${testRecipient}`);

    try {
        const result = await sendEmail(
            testRecipient,
            'QueueGo Email Test',
            `This is a test email from your QueueGo backend.\n\nTime: ${new Date().toLocaleString()}\n\nIf you received this, your email configuration is working!`
        );

        if (result && result.status === 'simulated') {
            console.log('⚠️ Test result was SIMULATED. Please check your .env credentials.');
        } else if (result) {
            console.log('✅ Test call completed. Check the recipient inbox or server logs.');
        } else {
            console.log('❌ Test failed (null result). Most likely missing credentials in .env');
        }
    } catch (error) {
        console.error('❌ Unexpected error during test:', error);
    }
}

testEmail();
