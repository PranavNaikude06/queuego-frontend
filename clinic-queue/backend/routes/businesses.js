const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const admin = require('firebase-admin');
const { db } = require('../config/firebase');

// Auth middleware — only superadmins can delete businesses
const requireSuperAdmin = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized: No token provided' });
    const token = authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized: Malformed token' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded.isSuperAdmin) return res.status(403).json({ error: 'Forbidden: Super Admin access required' });
        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({ error: 'Unauthorized: Invalid or expired token' });
    }
};

// Collections
const BUSINESSES = db.collection('businesses');
const APPOINTMENTS = db.collection('appointments');
const SERVICES = db.collection('services');
const USERS = db.collection('users');

// Get all businesses for the directory
router.get('/', async (req, res) => {
    try {
        const snapshot = await BUSINESSES.get();
        const businesses = snapshot.docs.map(doc => ({
            _id: doc.id,
            ...doc.data()
        }));
        res.json(businesses);
    } catch (error) {
        console.error('Error fetching businesses:', error);
        res.status(500).json({ error: 'Failed to fetch businesses' });
    }
});

// Get businesses for the logged-in user (superadmin sees ALL)
router.get('/user', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

        const token = authHeader.split(' ')[1];
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.isSuperAdmin) {
            // Superadmin: return ALL businesses with creator info
            const snapshot = await BUSINESSES.get();
            const businesses = [];

            for (const doc of snapshot.docs) {
                const data = doc.data();
                let creatorName = 'Unknown';
                let creatorEmail = 'N/A';

                // Find the admin user who created this business
                const userSnap = await USERS.where('businessId', '==', doc.id).where('role', '==', 'admin').limit(1).get();
                if (!userSnap.empty) {
                    const userData = userSnap.docs[0].data();
                    creatorName = userData.name || 'Unknown';
                    creatorEmail = userData.email || 'N/A';
                }

                businesses.push({
                    _id: doc.id,
                    ...data,
                    creatorName,
                    creatorEmail,
                    createdAt: data.createdAt?._seconds ? new Date(data.createdAt._seconds * 1000).toISOString() : null
                });
            }

            return res.json(businesses);
        }

        // Regular admin: return only their businesses
        const userSnap = await USERS.doc(decoded.userId).get();
        if (!userSnap.exists) return res.json([]);

        const userData = userSnap.data();
        if (!userData.businessId) return res.json([]);

        const bizDoc = await BUSINESSES.doc(userData.businessId).get();
        if (!bizDoc.exists) return res.json([]);

        return res.json([{ _id: bizDoc.id, ...bizDoc.data() }]);
    } catch (error) {
        console.error('Error fetching user businesses:', error);
        res.status(500).json({ error: 'Failed to fetch businesses' });
    }
});

// Get business by ID for public info
router.get('/:id', async (req, res) => {
    try {
        const doc = await BUSINESSES.doc(req.params.id).get();
        if (!doc.exists) return res.status(404).json({ error: 'Business not found' });
        res.json({ _id: doc.id, ...doc.data() });
    } catch (error) {
        console.error('Error fetching business:', error);
        res.status(500).json({ error: 'Failed to fetch business' });
    }
});

// Update business details (Name, Address, Location)
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, address, location } = req.body;

    try {
        // Basic validation
        if (!name) return res.status(400).json({ error: 'Business name is required' });

        const updateData = {
            name,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };

        if (address !== undefined) updateData.address = address;
        if (location !== undefined) updateData.location = location;

        await BUSINESSES.doc(id).update(updateData);

        res.json({ success: true, message: 'Business updated successfully' });
    } catch (error) {
        console.error('Error updating business:', error);
        res.status(500).json({ error: 'Failed to update business' });
    }
});

// APPROVE a business — SuperAdmin only
router.patch('/:id/approve', requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await BUSINESSES.doc(id).get();
        if (!doc.exists) {
            return res.status(404).json({ error: 'Business not found' });
        }

        await BUSINESSES.doc(id).update({
            isApproved: true,
            'subscription.status': 'trial',
            'subscription.trialStartDate': new Date().toISOString(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Business approved successfully' });
    } catch (error) {
        console.error('Error approving business:', error);
        res.status(500).json({ error: 'Failed to approve business' });
    }
});

// DELETE a business and all its data — SuperAdmin only
router.delete('/:id', requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        console.log(`🗑️ Starting deletion for business: ${id}`);

        // 1. Delete Appointments
        const appointmentSnapshot = await APPOINTMENTS.where('businessId', '==', id).get();
        const apptBatch = db.batch();
        appointmentSnapshot.docs.forEach(doc => apptBatch.delete(doc.ref));
        await apptBatch.commit();
        console.log(`- Deleted ${appointmentSnapshot.size} appointments`);

        // 2. Delete Services
        const serviceSnapshot = await SERVICES.where('businessId', '==', id).get();
        const serviceBatch = db.batch();
        serviceSnapshot.docs.forEach(doc => serviceBatch.delete(doc.ref));
        await serviceBatch.commit();
        console.log(`- Deleted ${serviceSnapshot.size} services`);

        // 3. Delete Users (Staff/Admins)
        const userSnapshot = await USERS.where('businessId', '==', id).get();
        const userBatch = db.batch();
        userSnapshot.docs.forEach(doc => userBatch.delete(doc.ref));
        await userBatch.commit();
        console.log(`- Deleted ${userSnapshot.size} users`);

        // 4. Delete the Business itself
        await BUSINESSES.doc(id).delete();

        console.log(`✅ Business ${id} and all related data deleted successfully.`);
        res.json({
            message: 'Business and all associated data deleted successfully',
            deleted: {
                appointments: appointmentSnapshot.size,
                services: serviceSnapshot.size,
                users: userSnapshot.size
            }
        });
    } catch (error) {
        console.error('❌ Error deleting business:', error);
        res.status(500).json({ error: 'Failed to delete business and its data' });
    }
});

// RENEW/ACTIVATE a business subscription — SuperAdmin only
router.post('/:id/renew', requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await BUSINESSES.doc(id).update({
            'subscription.status': 'paid',
            'subscription.renewedAt': admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        res.json({ success: true, message: 'Business subscription renewed successfully' });
    } catch (error) {
        console.error('Error renewing business:', error);
        res.status(500).json({ error: 'Failed to renew business subscription' });
    }
});

module.exports = router;
