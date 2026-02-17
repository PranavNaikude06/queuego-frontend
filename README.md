# 🏥 Clinic Queue Management System

A lightweight, demo-ready appointment and queue management system for small clinics.

## ✨ Features

- 📱 QR code-based booking (scan to book)
- 📝 Patient appointment booking
- 📺 Live queue display with "Now Serving"
- 🏥 Clinic control panel with "Next Patient" button
- ⚡ Real-time updates via polling
- 🎨 Beautiful, modern UI

## 🛠️ Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB
- **Frontend**: React (Vite)
- **Real-time**: Polling

## 🚀 Quick Start

### Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or connection string)

### Backend Setup

```bash
cd clinic-queue/backend
npm install

# Create .env file with:
# PORT=5000
# MONGODB_URI=mongodb://localhost:27017/clinic-queue

npm run dev
```

Backend will run on `http://localhost:5000`

### Frontend Setup

```bash
cd clinic-queue/frontend
npm install
npm run dev
```

Frontend will run on `http://localhost:5173` (default Vite port)

## 📋 Usage

1. **Book Appointment**: Navigate to `/` and fill in patient details
2. **View Queue**: Navigate to `/queue` to see live queue updates
3. **Control Panel**: Navigate to `/control` for clinic staff to manage queue

### QR Code Setup

To enable QR code booking:
1. Generate a QR code pointing to your booking URL (e.g., `http://localhost:5173/`)
2. Display the QR code in your clinic
3. Patients scan and book directly

## 📁 Project Structure

```
clinic-queue/
├── backend/
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   └── server.js        # Express server
└── frontend/
    ├── src/
    │   ├── pages/       # React pages
    │   ├── services/    # API service
    │   └── App.jsx      # Main app
    └── vite.config.js   # Vite configuration
```

## 🎯 API Endpoints

- `POST /api/appointments/book` - Book new appointment
- `GET /api/appointments/queue` - Get current queue
- `POST /api/appointments/next` - Move to next patient
- `GET /api/appointments/status/:queueNumber` - Get appointment status

## 🎨 Pages

- **Booking Page** (`/`): Patient booking form
- **Queue Display** (`/queue`): Live queue with "Now Serving"
- **Control Panel** (`/control`): Clinic staff management

---

Built for quick prototyping and demos. No authentication, payments, or over-engineering! 🚀
