const twilio = require('twilio');
const mailjet = require('node-mailjet');
const nodemailer = require('nodemailer');
const { sendFirebaseEmail } = require('./firebaseEmailService');

// Environment flag to choose email provider
const USE_FIREBASE_EMAIL = process.env.USE_FIREBASE_EMAIL === 'true';


// Lazy initialization of the Twilio client
let client = null;

const getTwilioClient = () => {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
        return null;
    }

    if (!client) {
        try {
            console.log('ℹ️ Attempting to initialize Twilio client...');
            client = twilio(accountSid, authToken);
            console.log('✅ Twilio client initialized successfully');
        } catch (error) {
            console.error('❌ Failed to initialize Twilio client:', error.message);
            console.error('   Details:', error);
            return null;
        }
    }
    return client;
};

/**
 * Sends an SMS message using Twilio
 * @param {string} to - The recipient's phone number
 * @param {string} body - The message content
 * @returns {Promise<object>} - The message response from Twilio
 */
const sendSMS = async (to, body) => {
    console.log(`📨 sendSMS called for ${to}`);
    try {
        const twilioClient = getTwilioClient();
        const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

        if (!twilioClient || !twilioPhone) {
            console.warn('⚠️ Twilio credentials missing or invalid in .env. SMS not sent.');
            return null;
        }

        // Ensure 'to' number is in E.164 format
        let formattedTo = to.trim();
        if (formattedTo.length === 10 && !formattedTo.startsWith('+')) {
            // Assume India if 10 digits
            formattedTo = `+91${formattedTo}`;
            console.log(`ℹ️ Prepending +91 to 10-digit number: ${formattedTo}`);
        } else if (!formattedTo.startsWith('+')) {
            console.warn(`⚠️ SMS number ${formattedTo} might fail (no + prefix)`);
        }

        console.log(`🚀 Sending SMS via Twilio to ${formattedTo}...`);
        const message = await twilioClient.messages.create({
            body: body,
            from: twilioPhone,
            to: formattedTo
        });

        console.log(`✅ SMS Sent: ${message.sid}`);
        return message;
    } catch (error) {
        console.error('❌ Twilio SMS Error:', error.message);
        console.error('   Full Error:', JSON.stringify(error, null, 2));
        throw error;
    }
};

/**
 * Sends an email using Firebase, Gmail (Nodemailer), or Mailjet
 * Priority: Firebase > Gmail > Mailjet
 * @param {string} to - The recipient's email address
 * @param {string} subject - The email subject
 * @param {string} text - The plain text content
 * @param {string} html - Optional HTML content for rich formatting
 * @returns {Promise<object>}
 */
const sendEmail = async (to, subject, text, html = null) => {
    // 1. Try Firebase Email Extension first if enabled
    if (USE_FIREBASE_EMAIL) {
        try {
            console.log('📧 Using Firebase Email Extension...');
            const result = await sendFirebaseEmail(to, subject, html || text, text);
            return result;
        } catch (error) {
            console.error('⚠️ Firebase Email failed, falling back to Gmail/Mailjet:', error.message);
            // Continue to Gmail/Mailjet fallback
        }
    }

    // 2. Try Gmail (Nodemailer) if Firebase is disabled or failed
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_PASS;

    if (gmailUser && gmailPass && gmailUser !== 'your_email@gmail.com' && gmailPass !== 'your_app_password_here') {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: gmailUser,
                    pass: gmailPass
                }
            });

            const mailOptions = {
                from: `"QueueGo" <${gmailUser}>`,
                to,
                subject,
                text
            };

            // Add HTML if provided
            if (html) {
                mailOptions.html = html;
            }

            const result = await transporter.sendMail(mailOptions);

            console.log(`✅ Email Sent via Gmail to ${to}`);
            return result;
        } catch (error) {
            console.error('❌ Gmail Error:', error.message);
            // If Gmail fails, we continue to try Mailjet
        }
    }

    // 3. Try Mailjet if Firebase and Gmail were skipped or failed
    try {
        const apiKey = process.env.MAILJET_API_KEY;
        const apiSecret = process.env.MAILJET_API_SECRET;
        const senderEmail = process.env.MAILJET_SENDER_EMAIL;

        if (apiKey && apiSecret && senderEmail && apiKey !== 'your_mailjet_api_key' && apiSecret !== 'your_mailjet_api_secret') {
            const mj = mailjet.apiConnect(apiKey, apiSecret);
            const message = {
                From: {
                    Email: senderEmail,
                    Name: "QueueGo"
                },
                To: [
                    {
                        Email: to,
                        Name: to
                    }
                ],
                Subject: subject,
                TextPart: text
            };

            // Add HTML if provided
            if (html) {
                message.HTMLPart = html;
            }

            const result = await mj.post("send", { version: 'v3.1' }).request({
                Messages: [message]
            });

            console.log(`✅ Email Sent via Mailjet to ${to}`);
            return result.body;
        }

        console.warn('⚠️ No valid email credentials found (Firebase, Gmail, or Mailjet). Email not sent.');
        console.log(`[SIMULATION] To: ${to} | Subject: ${subject} | Body: ${text}`);
        return null;
    } catch (error) {
        console.error('❌ Mailjet Email Error:', error.message);
        // Fallback to simulation so the UI flow doesn't break during dev
        console.log(`[FALLBACK SIMULATION] To: ${to} | Subject: ${subject} | Body: ${text}`);
        return { status: 'simulated', originalError: error.message };
    }
};


/**
 * Sends a booking confirmation SMS and Email
 * @param {string} to - The recipient's phone number
 * @param {string} email - The recipient's email (optional)
 * @param {object} appointment - Appointment details
 */
const sendBookingConfirmation = async (to, email, appointment) => {
    const body = `Hi ${appointment.name}, your booking at ${appointment.businessName} is confirmed for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time}. See you then!`;

    // Send SMS
    if (to) {
        await sendSMS(to, body);
    }

    // Send Email if provided
    if (email) {
        const subject = `Booking Confirmed: ${appointment.businessName}`;
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #10b981;">Booking Confirmed! ✅</h2>
                <p>Hi <strong>${appointment.name}</strong>,</p>
                <p>Your appointment at <strong>${appointment.businessName}</strong> has been successfully booked.</p>
                <div style="background: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(appointment.date).toLocaleDateString()}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${appointment.time}</p>
                    <p style="margin: 5px 0;"><strong>Queue ID:</strong> #${appointment.queueNumber || 'N/A'}</p>
                </div>
                <p>Please arrive on time. We look forward to seeing you!</p>
                <p style="color: #6b7280; font-size: 12px; margin-top: 20px;">${appointment.businessName} • Powered by QueueGo</p>
            </div>
        `;
        await sendEmail(email, subject, body, html);
    }
};

/**
 * Sends a 6-digit OTP via Email with professional formatting
 * @param {string} to 
 * @param {string} otp 
 */
const sendEmailOTP = async (to, otp) => {
    const subject = `${otp} is your QueueGo verification code`;
    const text = `Your verification code is: ${otp}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.\n\nThank you for using QueueGo!`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 40px 30px; }
                .otp-box { background: #f8f9fa; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; text-align: center; }
                .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; margin: 10px 0; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                .warning { color: #e74c3c; font-size: 14px; margin-top: 20px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 QueueGo</h1>
                </div>
                <div class="content">
                    <h2>Your Verification Code</h2>
                    <p>Use the following code to complete your verification:</p>
                    <div class="otp-box">
                        <div class="otp-code">${otp}</div>
                        <p style="margin: 5px 0; color: #666;">This code will expire in <strong>10 minutes</strong></p>
                    </div>
                    <p>If you did not request this code, please ignore this email.</p>
                    <p class="warning">⚠️ Never share this code with anyone. QueueGo will never ask for your verification code.</p>
                </div>
                <div class="footer">
                    <p>Thank you for using QueueGo!</p>
                    <p>© ${new Date().getFullYear()} QueueGo. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail(to, subject, text, html);
};

/**
 * Sends a queue position alert email with friendly messaging
 * @param {string} to - Recipient email
 * @param {string} name - Patient name
 * @param {string} businessName - Clinic name
 * @param {number} position - Current position in line
 */
const sendQueueAlert = async (to, name, businessName, position) => {
    const isNext = position === 1;
    const subject = isNext ? `🔔 You're Next at ${businessName}!` : `🔔 You're Up Soon at ${businessName}`;
    const text = `Hi ${name},\n\nGreat news! You are now number ${position} in the queue at ${businessName}.\n\n${isNext ? "You're next! Please be ready." : "Please be ready, sir. Your turn is coming up very soon!"}\n\nThank you for choosing QueueGo!\n\nBest regards,\nThe QueueGo Team`;

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
                .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
                .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { padding: 40px 30px; }
                .position-box { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-left: 4px solid #10b981; padding: 25px; margin: 25px 0; text-align: center; border-radius: 4px; }
                .position-number { font-size: 48px; font-weight: bold; color: #10b981; margin: 10px 0; }
                .business-name { font-size: 20px; color: #059669; font-weight: 600; margin: 10px 0; }
                .ready-msg { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; }
                .footer { background: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #666; }
                .emoji { font-size: 24px; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 QueueGo</h1>
                </div>
                <div class="content">
                    <h2>Hi ${name}! 👋</h2>
                    <p><strong>Great news!</strong> Your position in the queue has been updated.</p>
                    <div class="position-box">
                        <p style="margin: 0; color: #666; font-size: 14px;">You are now</p>
                        <div class="position-number">#${position}</div>
                        <p style="margin: 0; color: #666; font-size: 14px;">in the queue at</p>
                        <div class="business-name">${businessName}</div>
                    </div>
                    ${isNext ?
            '<div class="ready-msg"><p style="margin: 0;"><strong>🎉 You\'re next!</strong> Please be ready, sir. Thank you!</p></div>' :
            '<div class="ready-msg"><p style="margin: 0;"><strong>⏰ Please be ready!</strong> Your turn is coming up very soon, sir. Thank you!</p></div>'
        }
                    <p style="margin-top: 30px; color: #666;">We appreciate your patience. You'll be served shortly!</p>
                </div>
                <div class="footer">
                    <p>Thank you for choosing QueueGo!</p>
                    <p>Best regards, The QueueGo Team</p>
                    <p>© ${new Date().getFullYear()} QueueGo. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
    `;

    return sendEmail(to, subject, text, html);
};

module.exports = {
    sendSMS,
    sendEmail,
    sendBookingConfirmation,
    sendEmailOTP,
    sendQueueAlert
};

