const admin = require('firebase-admin');
const { db } = require('../config/firebase');

const OTP_COLLECTION = db.collection('otps');

/**
 * Generates a 6-digit OTP and stores it in Firestore
 * @param {string} email 
 * @returns {Promise<string>}
 */
const generateOTP = async (email) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await OTP_COLLECTION.doc(email.toLowerCase()).set({
        otp,
        expiresAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return otp;
};

/**
 * Verifies if the provided OTP is valid and not expired
 * @param {string} email 
 * @param {string} otp 
 * @returns {Promise<boolean>}
 */
const verifyOTP = async (email, otp) => {
    const doc = await OTP_COLLECTION.doc(email.toLowerCase()).get();

    if (!doc.exists) return false;

    const data = doc.data();

    // Check if OTP matches and is not expired
    if (data.otp === otp && Date.now() < data.expiresAt) {
        // Delete OTP after successful verification
        await OTP_COLLECTION.doc(email.toLowerCase()).delete();
        return true;
    }

    return false;
};

module.exports = {
    generateOTP,
    verifyOTP
};
