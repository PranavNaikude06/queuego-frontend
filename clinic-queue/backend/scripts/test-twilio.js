require('dotenv').config({ path: __dirname + '/../.env' });
const { sendSMS } = require('../services/notificationService');

async function test() {
    console.log('Testing Twilio connection...');
    console.log('SID:', process.env.TWILIO_ACCOUNT_SID);

    try {
        // This will attempt to send a test message. 
        // Note: You might want to change the 'to' number to your own for a real test.
        const res = await sendSMS('+18777804236', 'Test message from your Clinic Queue app!');
        if (res) {
            console.log('Test SMS triggered successfully!');
        }
    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

test();
