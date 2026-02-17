# 🍎 Mac Setup Guide - Clinic Queue System

Follow these steps to run the project on your Mac **without any issues**.

---

## ✅ Prerequisites

Before you start, make sure you have:

1. **Node.js** installed (v16 or higher)
   - Check: `node --version`
   - If not installed: Download from [nodejs.org](https://nodejs.org/)

2. **npm** installed (comes with Node.js)
   - Check: `npm --version`

---

## 📦 Step 1: Extract the Project

1. Unzip the project folder
2. Open **Terminal** (Applications → Utilities → Terminal)
3. Navigate to the project folder:
   ```bash
   cd path/to/clinic-queue
   ```

---

## 🔧 Step 2: Install Dependencies

### Backend:
```bash
cd backend
npm install
```

### Frontend:
```bash
cd ../frontend
npm install
```

---

## 🗄️ Step 3: Configure MongoDB

The `.env` file in the `backend` folder already has the MongoDB connection string.

**⚠️ IMPORTANT**: Ask Pranav to:
1. Go to [MongoDB Atlas](https://cloud.mongodb.com/)
2. Click **"Network Access"** in the left sidebar
3. Click **"Add IP Address"**
4. Click **"Allow Access from Anywhere"** (adds `0.0.0.0/0`)
5. Click **Confirm**

> This allows your Mac to connect to the MongoDB database.

---

## 🚀 Step 4: Run the Application

You need **TWO terminal windows** (or tabs):

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Database connected
🚀 Server running on http://localhost:5000
```

### Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

You should see:
```
Local:   http://localhost:5173/
```

---

## 🌐 Step 5: Open the App

Open your browser and go to:
```
http://localhost:5173
```

---

## 🎯 Step 6: Seed Demo Data (Optional)

To populate the app with demo businesses, run this in the **backend** folder:

```bash
node seed.js
```

This creates 5 demo businesses you can explore.

---

## 🐛 Common Issues & Fixes

### ❌ Port 5000 already in use
**Error**: `Port 5000 is already in use`

**Fix**:
```bash
lsof -ti:5000 | xargs kill -9
```

---

### ❌ MongoDB connection error
**Error**: `bad auth : authentication failed`

**Fix**: 
1. Make sure Pranav has enabled "Allow Access from Anywhere" in MongoDB Atlas
2. Check that the `.env` file has the correct connection string
3. Wait 10-30 seconds for the cluster to wake up (free tier pauses when inactive)

---

### ❌ Node modules missing
**Error**: `Cannot find module 'express'`

**Fix**: Run `npm install` in both `backend` and `frontend` folders

---

### ❌ Permission denied errors
**Error**: `EACCES: permission denied`

**Fix**: 
```bash
sudo chown -R $(whoami) ~/path/to/clinic-queue
```

---

## 📝 Summary

```bash
# 1. Install dependencies
cd backend && npm install
cd ../frontend && npm install

# 2. Run backend (Terminal 1)
cd backend
npm run dev

# 3. Run frontend (Terminal 2)
cd frontend
npm run dev

# 4. Open browser
# Go to http://localhost:5173
```

---

## 🆘 Still Having Issues?

Contact Pranav with:
1. The exact error message
2. Screenshot of your terminal
3. Output from `node --version` and `npm --version`

---

**That's it! You're all set! 🎉**
