const express = require('express');
const router = express.Router({ mergeParams: true });
const admin = require('firebase-admin');
const { db } = require('../config/firebase');
const QRCode = require('qrcode');
const { bookingLimiter, queueLimiter } = require('../middleware/rateLimiter');
const { sendBookingConfirmation, sendQueueAlert } = require('../services/notificationService');
const USERS = db.collection('users');

// Collections
const APPOINTMENTS = db.collection('appointments');
const SERVICES = db.collection('services');
const BUSINESSES = db.collection('businesses');

// Get QR code for the business
router.get('/qr', async (req, res) => {
  try {
    const { businessId } = req.params;
    const protocol = req.protocol;
    const host = req.get('host');

    // Prioritize FRONTEND_URL from env for the join link
    const baseUrl = (process.env.FRONTEND_URL || `${protocol}://${host}`).replace(/\/$/, "");
    const joinUrl = `${baseUrl}/join/${businessId}`;

    const qrDataUrl = await QRCode.toDataURL(joinUrl, {
      color: {
        dark: '#4f46e5', // indigo-600
        light: '#0000', // transparent
      },
      margin: 1,
      width: 400,
    });

    res.json({ qrCode: qrDataUrl, url: joinUrl });
  } catch (error) {
    console.error('QR Generate error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
});

// Get all services for a business
router.get('/services', async (req, res) => {
  try {
    const { businessId } = req.params;
    const snapshot = await SERVICES.where('businessId', '==', businessId).get();
    const services = snapshot.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    res.json(services);
  } catch (error) {
    console.error('Error fetching services:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Create a new service
router.post('/services', async (req, res) => {
  try {
    const { businessId } = req.params;
    const { name, price, duration, category } = req.body;

    const serviceRef = await SERVICES.add({
      businessId,
      name,
      price: Number(price),
      duration: Number(duration),
      category,
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const doc = await serviceRef.get();
    res.status(201).json({ _id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ error: 'Failed to create service' });
  }
});

// Update service status/details
router.patch('/services/:id', async (req, res) => {
  try {
    const { businessId, id } = req.params;
    const update = req.body;

    // Check existence BEFORE updating to avoid silent phantom doc creation
    const existing = await SERVICES.doc(id).get();
    if (!existing.exists) {
      return res.status(404).json({ error: 'Service not found' });
    }

    await SERVICES.doc(id).update(update);
    const doc = await SERVICES.doc(id).get();

    res.json({ _id: doc.id, ...doc.data() });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

// Book a new appointment - with rate limiting
router.post('/book', bookingLimiter, async (req, res) => {
  try {
    const { patientName, phoneNumber, serviceId, email } = req.body;
    const { businessId } = req.params;

    if (!patientName || !phoneNumber || !serviceId) {
      return res.status(400).json({ error: 'Patient name, phone number, and service are required' });
    }

    // Input Validation
    if (patientName.length > 50) {
      return res.status(400).json({ error: 'Name is too long (max 50 chars)' });
    }

    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(phoneNumber.trim())) {
      return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
    }

    // TRANSACTION: Atomic Queue Numbering
    const result = await db.runTransaction(async (t) => {
      // 1. Get highest queue number
      const qSnapshot = await t.get(
        APPOINTMENTS
          .where('businessId', '==', businessId)
          .orderBy('queueNumber', 'desc')
          .limit(1)
      );

      let nextNumber = 1;
      if (!qSnapshot.empty) {
        nextNumber = qSnapshot.docs[0].data().queueNumber + 1;
      }

      // 2. Check if anyone is currently serving
      const sSnapshot = await t.get(
        APPOINTMENTS
          .where('businessId', '==', businessId)
          .where('status', '==', 'serving')
          .limit(1)
      );

      // 3. Mark as serving if queue is empty
      const status = sSnapshot.empty ? 'serving' : 'waiting';

      // 4. Create record
      const newApptRef = APPOINTMENTS.doc();
      const apptData = {
        businessId,
        serviceId,
        patientName: patientName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email || '', // Store email for notifications
        queueNumber: nextNumber,
        status: status,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      };

      t.set(newApptRef, apptData);

      return { id: newApptRef.id, ...apptData };
    });

    // Send SMS notification asynchronously
    const bDoc = await BUSINESSES.doc(businessId).get();
    if (bDoc.exists) {
      const business = bDoc.data();
      sendBookingConfirmation(phoneNumber.trim(), email || '', {
        name: patientName.trim(),
        businessName: business.name,
        date: new Date(),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        queueNumber: result.queueNumber
      }).catch(err => console.error('Delayed Notification Error:', err));
    }

    res.json({
      success: true,
      appointment: {
        _id: result.id,
        queueNumber: result.queueNumber,
        patientName: result.patientName,
        status: result.status,
      },
    });
  } catch (error) {
    console.error('Error booking appointment:', error);
    res.status(500).json({ error: error.message || 'Failed to book appointment. Please try again.' });
  }
});

// Get all appointments in queue (waiting, serving, and on-hold)
router.get('/queue', queueLimiter, async (req, res) => {
  try {
    const { businessId } = req.params;

    const [servingSnap, waitingSnap, onHoldSnap] = await Promise.all([
      APPOINTMENTS.where('businessId', '==', businessId).where('status', '==', 'serving').limit(1).get(),
      APPOINTMENTS.where('businessId', '==', businessId).where('status', '==', 'waiting').get(),
      APPOINTMENTS.where('businessId', '==', businessId).where('status', '==', 'on-hold').get()
    ]);

    const serving = servingSnap.empty ? null : { _id: servingSnap.docs[0].id, ...servingSnap.docs[0].data() };

    let waiting = waitingSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    waiting.sort((a, b) => a.queueNumber - b.queueNumber); // Sort in app to avoid index issues

    let onHold = onHoldSnap.docs.map(doc => ({ _id: doc.id, ...doc.data() }));
    onHold.sort((a, b) => a.queueNumber - b.queueNumber);

    res.json({
      nowServing: serving,
      waitingList: waiting,
      onHoldList: onHold,
      totalInQueue: (serving ? 1 : 0) + waiting.length + onHold.length,
    });
  } catch (error) {
    console.error('Error fetching queue:', error);
    // Send the actual error message in dev mode for easier debugging
    const message = process.env.NODE_ENV === 'development' ? error.message : 'Failed to fetch queue. Please try again.';
    res.status(500).json({ error: message });
  }
});

// Move to next patient (clinic control)
router.post('/next', async (req, res) => {
  try {
    const { businessId } = req.params;
    const now = admin.firestore.FieldValue.serverTimestamp();

    const result = await db.runTransaction(async (t) => {
      // 1. Get current serving and all waiting — ALL READS FIRST
      const servingSnap = await t.get(
        APPOINTMENTS.where('businessId', '==', businessId).where('status', '==', 'serving')
      );
      const waitingSnap = await t.get(
        APPOINTMENTS.where('businessId', '==', businessId).where('status', '==', 'waiting')
      );

      // 2. Mark current serving as completed — WRITES AFTER READS
      servingSnap.docs.forEach(doc => {
        t.update(doc.ref, { status: 'completed', servedAt: now });
      });

      // 3. Sort waiting in JS and pick the first one (avoids composite index requirement)
      if (waitingSnap.empty) return null;

      const waitingDocs = waitingSnap.docs
        .map(doc => ({ ref: doc.ref, id: doc.id, ...doc.data() }))
        .sort((a, b) => a.queueNumber - b.queueNumber);

      const nextDoc = waitingDocs[0];
      t.update(nextDoc.ref, { status: 'serving', servedAt: now });

      return { id: nextDoc.id, queueNumber: nextDoc.queueNumber, patientName: nextDoc.patientName, phoneNumber: nextDoc.phoneNumber, email: nextDoc.email };
    });

    // Notify the person who is now 2nd in the WAITING list
    try {
      const remainingWaiting = await APPOINTMENTS
        .where('businessId', '==', businessId)
        .where('status', '==', 'waiting')
        .get();

      const sorted = remainingWaiting.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => a.queueNumber - b.queueNumber);

      if (sorted.length >= 2) {
        const secondPerson = sorted[1];

        if (secondPerson.email) {
          const bDoc = await BUSINESSES.doc(businessId).get();
          if (bDoc.exists) {
            sendQueueAlert(
              secondPerson.email,
              secondPerson.patientName,
              bDoc.data().name,
              2
            ).catch(err => console.error('Queue Alert Error:', err));
          }
        }
      }
    } catch (notifyErr) {
      console.warn('Post-next notification failed:', notifyErr);
    }

    if (result) {
      res.json({
        success: true,
        nowServing: {
          queueNumber: result.queueNumber,
          patientName: result.patientName,
        },
      });
    } else {
      res.json({
        success: true,
        nowServing: null,
        message: 'No patients in queue',
      });
    }
  } catch (error) {
    console.error('Error moving to next patient:', error);
    res.status(500).json({ error: 'Failed to move to next patient. Please try again.' });
  }
});

// Get appointment status by queue number
router.get('/status/:queueNumber', async (req, res) => {
  try {
    const { businessId } = req.params;
    const queueNumber = parseInt(req.params.queueNumber);

    const snapshot = await APPOINTMENTS
      .where('businessId', '==', businessId)
      .where('queueNumber', '==', queueNumber)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    res.json({
      queueNumber: data.queueNumber,
      patientName: data.patientName,
      status: data.status,
    });
  } catch (error) {
    console.error('Error fetching appointment status:', error);
    res.status(500).json({ error: 'Failed to fetch appointment status' });
  }
});

// Update appointment status (e.g., set to on-hold)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id, businessId } = req.params;
    const { status } = req.body;

    if (!['waiting', 'serving', 'completed', 'on-hold'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Check existence BEFORE updating to avoid silent phantom doc creation
    const existing = await APPOINTMENTS.doc(id).get();
    if (!existing.exists) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    await APPOINTMENTS.doc(id).update({ status });
    const doc = await APPOINTMENTS.doc(id).get();

    res.json({ success: true, appointment: { _id: doc.id, ...doc.data() } });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

module.exports = router;
