const admin = require('firebase-admin');

/**
 * Send a push notification to a specific device/user
 * @param {string} token - The FCM registration token
 * @param {object} notification - { title, body }
 * @param {object} data - Optional key-value pairs for additional payload
 * @returns {Promise<string>} - Message ID
 */
const sendPushNotification = async (token, notification, data = {}) => {
    if (!token) {
        console.warn('⚠️ No FCM token provided. Skipping push notification.');
        return null;
    }

    const message = {
        token: token,
        notification: {
            title: notification.title,
            body: notification.body
        },
        data: data,
        // Android specific config
        android: {
            priority: 'high',
            notification: {
                clickAction: 'FLUTTER_NOTIFICATION_CLICK', // Legacy but common
                channelId: 'default'
            }
        },
        // APNS specific config for iOS
        apns: {
            payload: {
                aps: {
                    sound: 'default',
                    badge: 1
                }
            }
        }
    };

    try {
        const response = await admin.messaging().send(message);
        console.log('✅ Push notification sent successfully:', response);
        return response;
    } catch (error) {
        if (error.code === 'messaging/registration-token-not-registered') {
            console.warn('⚠️ FCM token is invalid or expired. User should re-register.');
            // Ideally mark token as invalid in DB here if userId was passed
        } else {
            console.error('❌ FCM Error:', error.message);
        }
        return null;
    }
};

/**
 * Send a notification to multiple tokens
 * @param {string[]} tokens 
 * @param {object} notification 
 * @param {object} data 
 */
const sendMulticastNotification = async (tokens, notification, data = {}) => {
    if (!tokens || tokens.length === 0) return null;

    const message = {
        tokens: tokens,
        notification: notification,
        data: data
    };

    try {
        const response = await admin.messaging().sendEachForMulticast(message);
        console.log(`✅ Multicast push sent. Success: ${response.successCount}, Failure: ${response.failureCount}`);
        return response;
    } catch (error) {
        console.error('❌ Multicast FCM Error:', error.message);
        return null;
    }
};

module.exports = {
    sendPushNotification,
    sendMulticastNotification
};
