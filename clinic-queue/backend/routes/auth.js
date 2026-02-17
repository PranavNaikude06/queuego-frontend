const express = require('express');
const router = express.Router({ mergeParams: true });
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { sendSMS, sendEmail, sendEmailOTP } = require('../services/notificationService');
const { generateOTP, verifyOTP } = require('../services/otpService');
const { logUserLogin, logCustomer, logBusiness } = require('../services/googleSheets');
const admin = require('firebase-admin');
const { db } = require('../config/firebase');

// Collections
const USERS = db.collection('users');
const BUSINESSES = db.collection('businesses');

// Signup route for new business (legacy - email/password)
router.post('/business-signup', async (req, res) => {
    try {
        const { businessName, adminName, email, password } = req.body;

        // 1. Create Business
        const slug = businessName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

        // Simple duplicate slug check
        const slugCheck = await BUSINESSES.where('slug', '==', slug).get();
        if (!slugCheck.empty) {
            return res.status(400).json({
                error: 'Business name already exists. Please try a different name.'
            });
        }

        const businessRef = await BUSINESSES.add({
            name: businessName,
            slug,
            email,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const businessId = businessRef.id;

        // 2. Create Admin User
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRef = await USERS.add({
            name: adminName,
            email: email.toLowerCase(),
            password: hashedPassword,
            role: 'admin',
            businessId,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const token = jwt.sign(
            { userId: userRef.id, businessId, role: 'admin' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1d' }
        );

        // Log to Google Sheets
        logBusiness(
            { name: businessName, address: req.body.address || '' },
            { name: adminName, email: email, phoneNumber: '' }
        );



        res.status(201).json({
            success: true,
            token,
            businessId,
            user: {
                _id: userRef.id,
                name: adminName,
                role: 'admin'
            }
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: `Failed to create business: ${error.message}` });
    }
});

// Signup route for new business (Firebase auth - no password needed)
router.post('/business-signup-firebase', async (req, res) => {
    try {
        const { businessName, adminName, idToken } = req.body;

        if (!businessName || !adminName || !idToken) {
            return res.status(400).json({ error: 'Business name, admin name, and authentication are required' });
        }

        // Verify Firebase Token
        let decodedToken;
        try {
            decodedToken = await admin.auth().verifyIdToken(idToken);
        } catch (e) {
            return res.status(401).json({ error: 'Invalid authentication token' });
        }

        const { uid, email } = decodedToken;

        // Check if user already has a business
        const existingUser = await USERS.where('email', '==', email.toLowerCase()).where('role', '==', 'admin').limit(1).get();
        if (!existingUser.empty) {
            const userData = existingUser.docs[0].data();
            return res.status(400).json({
                error: 'You already have a business registered. Please login to your existing business.',
                businessId: userData.businessId
            });
        }

        // 1. Create Business
        const slug = businessName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');

        // Simple duplicate slug check
        const slugCheck = await BUSINESSES.where('slug', '==', slug).get();
        if (!slugCheck.empty) {
            return res.status(400).json({
                error: 'Business name already exists. Please try a different name.'
            });
        }

        const businessRef = await BUSINESSES.add({
            name: businessName,
            slug,
            email: email.toLowerCase(),
            address: req.body.address || '',
            location: req.body.location || null, // { lat, lng }
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        const businessId = businessRef.id;

        // 2. Create or Update Admin User
        const userSnapshot = await USERS.where('email', '==', email.toLowerCase()).limit(1).get();
        let userRef;

        if (userSnapshot.empty) {
            // Create new user
            userRef = await USERS.add({
                name: adminName,
                email: email.toLowerCase(),
                role: 'admin',
                businessId,
                firebaseUid: uid,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
        } else {
            // Update existing user to admin
            userRef = userSnapshot.docs[0].ref;
            await userRef.update({
                name: adminName,
                role: 'admin',
                businessId,
                firebaseUid: uid,
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
        }

        // Set Firebase custom claim for this admin
        await admin.auth().setCustomUserClaims(uid, { businessId, role: 'admin' });

        const token = jwt.sign(
            { userId: userRef.id, businessId, role: 'admin' },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '1d' }
        );

        // Log to Google Sheets
        logBusiness(
            { name: businessName, address: req.body.address || '' },
            { name: adminName, email: email, phoneNumber: '' }
        );



        res.status(201).json({
            success: true,
            token,
            businessId,
            user: {
                _id: userRef.id,
                name: adminName,
                role: 'admin'
            }
        });
    } catch (error) {
        console.error('Firebase business signup error:', error);
        res.status(500).json({ error: `Failed to create business: ${error.message}` });
    }
});

// Customer/Admin Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password, businessId } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find user by email
        const userSnapshot = await USERS
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();

        if (userSnapshot.empty) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const userDoc = userSnapshot.docs[0];
        const user = userDoc.data();

        // Check if user has a password set (might be a social login user)
        if (!user.password) {
            return res.status(400).json({ error: 'This account uses social login. Please sign in with Google.' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // If businessId is provided (admin login), verify user belongs to that business
        if (businessId) {
            // Super Admin Bypass
            const isSuperAdmin = user.email === 'admin@owner.com';

            if (user.role !== 'admin' && !isSuperAdmin) {
                return res.status(403).json({ error: 'You are not authorized to access this business' });
            }
            if (!isSuperAdmin && user.businessId !== businessId) {
                return res.status(403).json({ error: 'You are not authorized to access this business' });
            }
        }

        const isSuperAdmin = user.email === 'admin@owner.com';

        // Use the requested businessId if Super Admin is creating a session for a specific business
        const tokenBusinessId = isSuperAdmin && businessId ? businessId : (user.businessId || null);

        const token = jwt.sign(
            { userId: userDoc.id, businessId: tokenBusinessId, role: user.role, isSuperAdmin },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        // Log login to Google Sheets
        if (user.role === 'customer') {
            logCustomer({
                name: user.name,
                email: user.email,
                phoneNumber: user.phoneNumber
            });
        }



        res.json({
            success: true,
            token,
            user: {
                _id: userDoc.id,
                name: user.name,
                role: user.role,
                businessId: user.businessId,
                subscription: user.subscription // Return subscription status
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Customer Signup route (no businessId required)
router.post('/signup', async (req, res) => {
    try {
        const { email, password, role = 'customer' } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user already exists
        const existingUser = await USERS
            .where('email', '==', normalizedEmail)
            .limit(1)
            .get();

        if (!existingUser.empty) {
            return res.status(400).json({ error: 'User already exists. Please login instead.' });
        }

        // Create new customer user
        const hashedPassword = await bcrypt.hash(password, 10);
        const userRef = await USERS.add({
            email: normalizedEmail,
            password: hashedPassword,
            role: role,
            businessId: null,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const token = jwt.sign(
            { userId: userRef.id, businessId: null, role: role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        if (role === 'customer') {
            logCustomer({
                name: 'N/A', // Name is not collected in this simple signup
                email: normalizedEmail,
                phoneNumber: ''
            });
        }

        res.status(201).json({
            success: true,
            token,
            user: {
                _id: userRef.id,
                role: role,
                subscription: { status: 'free' } // Default subscription
            }
        });
    } catch (error) {
        console.error('Customer signup error:', error);
        res.status(500).json({ error: 'Failed to create account' });
    }
});

// Firebase Token Verification & Sync
router.post('/firebase-verify', async (req, res) => {
    try {
        const { idToken, businessId, role = 'admin' } = req.body;

        // Verify Firebase Token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const { uid, email, name, picture } = decodedToken;

        // Find or Create User in Firestore
        const userSnapshot = await USERS.where('email', '==', email.toLowerCase()).limit(1).get();
        let userDoc;

        if (userSnapshot.empty) {
            // If user doesn't exist locally, create them
            const newUserRef = await USERS.add({
                name: name || email.split('@')[0],
                email: email.toLowerCase(),
                role: role,
                businessId: businessId || null,
                firebaseUid: uid,
                avatar: picture || null,
                subscription: { status: 'free' },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            userDoc = await newUserRef.get();
        } else {
            userDoc = userSnapshot.docs[0];
            const userData = userDoc.data();
            if (!userData.firebaseUid) {
                // Link existing user to Firebase
                await USERS.doc(userDoc.id).update({
                    firebaseUid: uid,
                    avatar: picture || userData.avatar || null
                });
            }
        }

        const userData = userDoc.data();
        const token = jwt.sign(
            { userId: userDoc.id, businessId: userData.businessId || null, role: userData.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' } // Users stay logged in longer than admins
        );



        if (userData.role === 'customer') {
            logCustomer({
                name: userData.name,
                email: userData.email,
                phoneNumber: userData.phoneNumber
            });
        }

        res.json({
            success: true,
            token,
            user: {
                _id: userDoc.id,
                name: userData.name,
                role: userData.role,
                avatar: userData.avatar,
                subscription: userData.subscription // Return subscription status
            }
        });
    } catch (error) {
        console.error('Firebase Verify Error:', error);
        res.status(401).json({ error: 'Unauthorized: Invalid Firebase token' });
    }
});

// Superadmin Password Login (Bypasses Email Link)
router.post('/superadmin-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Check if this is the superadmin
        if (email !== process.env.SUPERADMIN_EMAIL) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        if (password !== process.env.SUPERADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if superadmin user exists in Firestore
        let userSnapshot = await USERS
            .where('email', '==', email.toLowerCase())
            .where('role', '==', 'customer')
            .limit(1)
            .get();

        let userDoc;
        if (userSnapshot.empty) {
            // Create superadmin user
            const newUserRef = await USERS.add({
                name: 'Super Admin',
                email: email.toLowerCase(),
                role: 'customer',
                businessId: null,
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            userDoc = await newUserRef.get();
        } else {
            userDoc = userSnapshot.docs[0];
        }

        const userData = userDoc.data();
        const token = jwt.sign(
            { userId: userDoc.id, businessId: null, role: 'customer', isSuperAdmin: true },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            user: {
                _id: userDoc.id,
                name: userData.name,
                role: userData.role,
                email: userData.email
            }
        });
    } catch (error) {
        console.error('Superadmin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// OTP Storage (Simple in-memory for prototype)
const otpStore = new Map();

// Send OTP Route
router.post('/send-otp', async (req, res) => {
    console.log('🔄 /send-otp request received:', req.body);
    try {
        const { phoneNumber, email } = req.body;
        if (!phoneNumber && !email) {
            console.warn('⚠️ /send-otp: Missing phone or email');
            return res.status(400).json({ error: 'Phone number or email is required' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const key = phoneNumber || email;
        otpStore.set(key, { otp, expires: Date.now() + 600000 }); // 10 min expiry
        console.log(`✅ OTP Generated for ${key}: ${otp}`);

        // Send via SMS if provided
        if (phoneNumber) {
            console.log(`📨 Attempting to send SMS to ${phoneNumber}...`);
            await sendSMS(phoneNumber, `Your QueueGo verification code is: ${otp}`);
        }

        // Send via Email if provided
        if (email) {
            console.log(`📧 Attempting to send Email to ${email}...`);
            await sendEmail(email, 'Your QueueGo Verification Code', `Your verification code is: ${otp}`);
        }

        res.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('❌ Send OTP Error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// Request Email OTP
router.post('/request-otp', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const otp = await generateOTP(email);
        await sendEmailOTP(email, otp);

        res.json({ success: true, message: 'OTP sent to your email' });
    } catch (error) {
        console.error('Request OTP Error:', error);
        res.status(500).json({ error: 'Failed to send OTP' });
    }
});

// Verify OTP (Generic)
router.post('/verify-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

        const isValid = await verifyOTP(email, otp);
        if (!isValid) return res.status(400).json({ error: 'Invalid or expired OTP' });

        res.json({ success: true, message: 'OTP verified' });
    } catch (error) {
        console.error('Verify OTP Error:', error);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// Login/Verify via Email OTP
router.post('/login-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) return res.status(400).json({ error: 'Email and OTP are required' });

        const isValid = await verifyOTP(email, otp);
        if (!isValid) return res.status(400).json({ error: 'Invalid or expired OTP' });

        const normalizedEmail = email.toLowerCase().trim();
        const userSnapshot = await USERS.where('email', '==', normalizedEmail).limit(1).get();

        let userDoc;
        let isNewUser = false;

        if (userSnapshot.empty) {
            // Create new customer user if they don't exist
            const newUserRef = await USERS.add({
                email: normalizedEmail,
                role: 'customer',
                name: 'Guest User',
                subscription: { status: 'free' },
                createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            userDoc = await newUserRef.get();
            isNewUser = true;
        } else {
            userDoc = userSnapshot.docs[0];
        }

        const userData = userDoc.data();
        const token = jwt.sign(
            { userId: userDoc.id, businessId: userData.businessId || null, role: userData.role },
            process.env.JWT_SECRET || 'fallback_secret',
            { expiresIn: '7d' }
        );

        res.json({
            success: true,
            token,
            isNewUser,
            user: {
                _id: userDoc.id,
                name: userData.name,
                role: userData.role,
                subscription: userData.subscription
            }
        });
    } catch (error) {
        console.error('OTP Login Error:', error);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// Update Profile Route
router.patch('/profile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'No token provided' });

        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

        const { name } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });

        await USERS.doc(decoded.userId).update({
            name,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });



        res.json({ success: true, name });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Forgot Password Route
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Check if user exists
        const userSnapshot = await USERS.where('email', '==', normalizedEmail).limit(1).get();
        if (userSnapshot.empty) {
            // Security: Don't reveal if user exists, just say sent
            return res.json({ success: true, message: 'If an account exists, a code has been sent.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP with 10 min expiry
        otpStore.set(normalizedEmail, { otp, expires: Date.now() + 600000 });

        // Send Email
        await sendEmail(
            normalizedEmail,
            'Reset Your Password - QueueGo',
            `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.`
        );



        res.json({ success: true, message: 'Reset code sent to your email.', debugCode: otp });
    } catch (error) {
        console.error('Forgot Password Error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});

// Reset Password Route
router.post('/reset-password', async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const stored = otpStore.get(normalizedEmail);

        if (!stored || stored.otp !== otp || Date.now() > stored.expires) {
            return res.status(400).json({ error: 'Invalid or expired code' });
        }

        const userSnapshot = await USERS.where('email', '==', normalizedEmail).limit(1).get();
        if (userSnapshot.empty) {
            return res.status(404).json({ error: 'User not found' });
        }

        const userDoc = userSnapshot.docs[0];
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await USERS.doc(userDoc.id).update({
            password: hashedPassword,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Clear OTP
        otpStore.delete(normalizedEmail);



        res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});

module.exports = router;
