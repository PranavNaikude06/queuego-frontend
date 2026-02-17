const { db } = require('../config/firebase');

/**
 * Send email via Firebase Trigger Email Extension
 * This function adds a document to the 'emails' collection in Firestore.
 * The Firebase Trigger Email Extension monitors this collection and sends emails automatically.
 * 
 * Prerequisites:
 * - Install "Trigger Email" extension from Firebase Console
 * - Configure SMTP settings in the extension
 * 
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject line
 * @param {string} html - HTML email content
 * @param {string} text - Plain text fallback
 * @returns {Promise<object>} - Result object
 */
const sendFirebaseEmail = async (to, subject, html, text) => {
    try {
        const emailDoc = await db.collection('emails').add({
            to: [to],
            message: {
                subject,
                text,
                html
            },
            // Optional: Add metadata for tracking
            metadata: {
                service: 'QueueGo',
                sentAt: new Date(),
                type: subject.includes('verification') ? 'otp' : 'notification'
            }
        });

        console.log(`📧 Email queued via Firebase to ${to} (Doc ID: ${emailDoc.id})`);
        return { success: true, docId: emailDoc.id };
    } catch (error) {
        console.error('❌ Firebase Email Error:', error.message);
        throw error;
    }
};

/**
 * Check email delivery status
 * The Trigger Email extension updates the document with delivery info
 * 
 * @param {string} docId - Email document ID from sendFirebaseEmail
 * @returns {Promise<object>} - Delivery status
 */
const checkEmailStatus = async (docId) => {
    try {
        const emailDoc = await db.collection('emails').doc(docId).get();

        if (!emailDoc.exists) {
            return { status: 'not_found' };
        }

        const data = emailDoc.data();
        return {
            status: data.delivery?.state || 'pending',
            attempts: data.delivery?.attempts || 0,
            error: data.delivery?.error || null,
            sentTime: data.delivery?.endTime || null
        };
    } catch (error) {
        console.error('❌ Error checking email status:', error.message);
        return { status: 'error', error: error.message };
    }
};

module.exports = {
    sendFirebaseEmail,
    checkEmailStatus
};
