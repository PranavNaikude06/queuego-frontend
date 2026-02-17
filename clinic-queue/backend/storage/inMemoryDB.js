// Simple in-memory database for prototype (no MongoDB needed!)
// Data resets when server restarts - perfect for demos

let appointments = [];
let nextQueueNumber = 1;

// Generate simple ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Book a new appointment
const bookAppointment = (patientName, phoneNumber) => {
  const appointment = {
    _id: generateId(),
    patientName,
    phoneNumber,
    queueNumber: nextQueueNumber++,
    status: 'waiting',
    createdAt: new Date(),
  };
  
  appointments.push(appointment);
  return appointment;
};

// Get all appointments in queue
const getQueue = () => {
  const queueAppointments = appointments.filter(
    apt => apt.status === 'waiting' || apt.status === 'serving'
  ).sort((a, b) => a.queueNumber - b.queueNumber);

  const nowServing = queueAppointments.find(apt => apt.status === 'serving') || null;
  const waitingList = queueAppointments.filter(apt => apt.status === 'waiting');

  return {
    nowServing,
    waitingList,
    totalInQueue: queueAppointments.length,
  };
};

// Move to next patient
const moveToNext = () => {
  // Mark current serving as completed
  appointments.forEach(apt => {
    if (apt.status === 'serving') {
      apt.status = 'completed';
      apt.servedAt = new Date();
    }
  });

  // Get next waiting patient
  const nextPatient = appointments
    .filter(apt => apt.status === 'waiting')
    .sort((a, b) => a.queueNumber - b.queueNumber)[0];

  if (nextPatient) {
    nextPatient.status = 'serving';
    nextPatient.servedAt = new Date();
    return {
      success: true,
      nowServing: {
        queueNumber: nextPatient.queueNumber,
        patientName: nextPatient.patientName,
      },
    };
  }

  return {
    success: true,
    nowServing: null,
    message: 'No patients in queue',
  };
};

// Get appointment by queue number
const getAppointmentByQueueNumber = (queueNumber) => {
  return appointments.find(apt => apt.queueNumber === parseInt(queueNumber));
};

module.exports = {
  bookAppointment,
  getQueue,
  moveToNext,
  getAppointmentByQueueNumber,
};
