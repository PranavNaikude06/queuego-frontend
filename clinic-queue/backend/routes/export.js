const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

// Simple CSV Helper
const toCSV = (data) => {
    if (!data || data.length === 0) return '';
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).map(val => `"${val || ''}"`).join(','));
    return [headers, ...rows].join('\n');
};

// Collections
const USERS = db.collection('users');
const BUSINESSES = db.collection('businesses');

// Auth middleware — only superadmins can access export routes
const requireSuperAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized: No token provided' });

    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: Malformed token' });

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.isSuperAdmin) {
            return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
        }
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};

// Export Customers
router.get('/customers', requireSuperAdmin, async (req, res) => {
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
router.get('/businesses', requireSuperAdmin, async (req, res) => {
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
