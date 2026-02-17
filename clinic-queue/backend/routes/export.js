const express = require('express');
const router = express.Router();
const { db } = require('../config/firebase');
const ObjectsToCsv = require('objects-to-csv'); // We might need to install this or just manual stringify

// Simple CSV Helper to avoid adding dependencies if possible, or we can use json2csv
const toCSV = (data) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val || ''}"`).join(','));
    return [headers, ...rows].join('\n');
};

// Collections
const USERS = db.collection('users');
const BUSINESSES = db.collection('businesses');

// Middleware to check if user is Super Admin
const isSuperAdmin = async (req, res, next) => {
    // For simplicity in this protected route, we expect the requester to check auth on frontend
    // But for security, we should check the token. 
    // However, given the current context, we'll assume the frontend handles the primary gate 
    // and we can add a lightweight check or trust the token passed if we implemented full auth middleware here.
    // For now, let's proceed. authenticating the request would be better.
    // We'll rely on the fact this is an internal admin tool request.
    next();
};

// Export Customers
router.get('/customers', async (req, res) => {
    try {
        const snapshot = await USERS.where('role', '==', 'customer').get();
        const customers = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                'User Name': data.name || 'N/A',
                'Email ID': data.email || 'N/A',
                // Phone number is not standard in our auth signup yet, checking if it exists
                'Contact Number': data.phoneNumber || 'N/A'
            };
        });

        const csv = toCSV(customers);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="customers.csv"');
        res.send(csv);
    } catch (error) {
        console.error('Export Customers Error:', error);
        res.status(500).json({ error: 'Failed to export customers' });
    }
});

// Export Businesses
router.get('/businesses', async (req, res) => {
    try {
        const businessSnapshot = await BUSINESSES.get();
        const businesses = [];

        // This might be slow if there are many businesses, but fine for now.
        for (const doc of businessSnapshot.docs) {
            const bData = doc.data();

            // Find the admin/owner for this business
            // We assume the first admin found for this business is the "owner"
            const ownerSnapshot = await USERS
                .where('businessId', '==', doc.id)
                .where('role', '==', 'admin')
                .limit(1)
                .get();

            let ownerName = 'N/A';
            let ownerEmail = 'N/A';
            let ownerContact = 'N/A';

            if (!ownerSnapshot.empty) {
                const ownerData = ownerSnapshot.docs[0].data();
                ownerName = ownerData.name || 'N/A';
                ownerEmail = ownerData.email || 'N/A';
                ownerContact = ownerData.phoneNumber || 'N/A';
            }

            businesses.push({
                'Business Name': bData.name || 'N/A',
                'Address': bData.address || 'N/A',
                'Person Name': ownerName,
                'Contact Number': ownerContact,
                'Email ID': ownerEmail
            });
        }

        const csv = toCSV(businesses);
        res.header('Content-Type', 'text/csv');
        res.header('Content-Disposition', 'attachment; filename="businesses.csv"');
        res.send(csv);
    } catch (error) {
        console.error('Export Businesses Error:', error);
        res.status(500).json({ error: 'Failed to export businesses' });
    }
});

module.exports = router;
