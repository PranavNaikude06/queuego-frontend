const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const { db } = require('../config/firebase');

// Collection references
const USERS = db.collection('users');
const PAYMENT_REQUESTS = db.collection('paymentRequests');

const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// 1. Create Subscription
router.post('/create-subscription', async (req, res) => {
    try {
        const { userId } = req.body;
        const planId = process.env.RAZORPAY_PLAN_ID || 'plan_SCvXFCCdyap7PV';

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        const subscription = await razorpay.subscriptions.create({
            plan_id: planId,
            customer_notify: 1,
            total_count: 120, // 10 years (or make it infinite/large)
            quantity: 1,
            notes: {
                userId: userId
            }
        });

        res.json({
            success: true,
            subscription_id: subscription.id,
            key_id: process.env.RAZORPAY_KEY_ID // Send key to frontend
        });

    } catch (error) {
        console.error('Create Subscription Error:', error);
        res.status(500).json({ error: 'Failed to create subscription' });
    }
});

// 2. Verify Payment & Activate
router.post('/verify-subscription', async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_subscription_id,
            razorpay_signature,
            userId
        } = req.body;

        // Verify Signature
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_payment_id + '|' + razorpay_subscription_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        // Signature valid -> Payment Successful
        // Update User Subscription in Firestore
        // Calculate Expiry (30 Days from now as fall back, though subscription handles recurring)
        // Ideally rely on webhooks, but for immediate UI update:
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        await USERS.doc(userId).update({
            subscription: {
                status: 'premium',
                plan: 'monthly',
                provider: 'razorpay',
                subscriptionId: razorpay_subscription_id, // Store for managing cancellations
                expiry: admin.firestore.Timestamp.fromDate(expiryDate),
                updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }
        });

        // Record Transaction
        await PAYMENT_REQUESTS.add({
            userId,
            paymentId: razorpay_payment_id,
            subscriptionId: razorpay_subscription_id,
            amount: 100,
            status: 'success',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Subscription activated successfully!'
        });

    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

module.exports = router;
