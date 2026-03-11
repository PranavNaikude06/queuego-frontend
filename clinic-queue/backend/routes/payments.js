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

// 1. Create Order (One-time or recurring renewal)
router.post('/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', businessId } = req.body;

        const order = await razorpay.orders.create({
            amount: (amount || 199) * 100, // Amount in paise
            currency,
            receipt: `receipt_${Date.now()}`,
            notes: {
                businessId: businessId || ''
            }
        });

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,
            key_id: process.env.RAZORPAY_KEY_ID
        });

    } catch (error) {
        console.error('Create Order Error:', error);
        res.status(500).json({ error: 'Failed to create payment order' });
    }
});

// 2. Verify Payment & Activate (Handles both Users and Businesses)
router.post('/verify-payment', async (req, res) => {
    try {
        const {
            razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            userId,
            businessId
        } = req.body;

        // Verify Signature
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + '|' + razorpay_payment_id)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ error: 'Invalid signature' });
        }

        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 30);

        // Activates Business if businessId is provided
        if (businessId) {
            const BUSINESSES = db.collection('businesses');
            await BUSINESSES.doc(businessId).update({
                subscription: {
                    status: 'paid',
                    provider: 'razorpay',
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    expiry: admin.firestore.Timestamp.fromDate(expiryDate),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }
            });
        }

        // Activates User Premium if userId is provided
        if (userId) {
            await USERS.doc(userId).update({
                subscription: {
                    status: 'premium',
                    provider: 'razorpay',
                    paymentId: razorpay_payment_id,
                    orderId: razorpay_order_id,
                    expiry: admin.firestore.Timestamp.fromDate(expiryDate),
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }
            });
        }

        // Record Transaction
        await PAYMENT_REQUESTS.add({
            userId: userId || 'business_admin',
            businessId: businessId || '',
            paymentId: razorpay_payment_id,
            orderId: razorpay_order_id,
            amount: 199,
            status: 'success',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({
            success: true,
            message: 'Payment verified and subscription activated!'
        });

    } catch (error) {
        console.error('Verification Error:', error);
        res.status(500).json({ error: 'Payment verification failed' });
    }
});

// Keep legacy routes for backward compatibility
router.post('/create-subscription', async (req, res) => {
    /* ... existing implementation if needed, but redirects to create-order or similar ... */
    res.status(410).json({ error: 'Please use /create-order instead' });
});

module.exports = router;
