const { Resend } = require('resend');

let resendClient = null;

const getResendClient = () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || apiKey === 'your_resend_api_key') return null;
    if (!resendClient) {
        resendClient = new Resend(apiKey);
    }
    return resendClient;
};

/**
 * Sends an email via Resend
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {string} text - Plain text fallback
 * @returns {Promise<object|null>}
 */
const sendResendEmail = async (to, subject, html, text) => {
    const client = getResendClient();
    if (!client) {
        console.warn('⚠️ Resend API key not configured. Email not sent via Resend.');
        return null;
    }

    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';

    try {
        const { data, error } = await client.emails.send({
            from: `QueueGo <${fromEmail}>`,
            to,
            subject,
            html: html || `<p>${text}</p>`,
            text: text || ''
        });

        if (error) {
            console.error('❌ Resend Email Error:', error);
            throw new Error(error.message);
        }

        console.log(`✅ Email sent via Resend to ${to} (id: ${data?.id})`);
        return data;
    } catch (error) {
        console.error('❌ Resend send failed:', error.message);
        throw error;
    }
};

module.exports = { sendResendEmail };
