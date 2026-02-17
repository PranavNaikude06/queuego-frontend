# 🪟 Windows Setup Guide - Clinic Queue System

Super simple setup for Windows! Follow these steps.

---

## ✅ Prerequisites

Make sure you have **Node.js** installed:
- Check: Open Command Prompt and type `node --version`
- If not installed: Download from [nodejs.org](https://nodejs.org/)

---

## 📦 Step 1: Extract the Project

1. Unzip the project folder
2. Open the folder in File Explorer

---

## 🔧 Step 2: Install Dependencies

### Option A: Using PowerShell/Command Prompt

1. Open **PowerShell** or **Command Prompt**
2. Navigate to the project:
   ```bash
   cd path\to\clinic-queue
   ```

3. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

4. Install frontend dependencies:
   ```bash
   cd ..\frontend
   npm install
   ```

### Option B: Using the shortcuts (if provided)

Double-click:
1. `install-backend.bat`
2. `install-frontend.bat`

---

## 🌱 Step 3: Seed Demo Businesses (Important!)

To see demo businesses in the Explore page:

```bash
cd backend
node seed.js
```

You should see:
```
✅ Connected to MongoDB
Creating City Care Clinic...
Creating Luxe Hair Salon...
...
Seeding complete!
```

**This only needs to be done ONCE.** The data goes to the cloud database.

---

## 🚀 Step 4: Run the Application

You need **TWO Command Prompt/PowerShell windows**:

### Window 1 - Backend:
```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB Database connected
🚀 Server running on http://localhost:5000
```

### Window 2 - Frontend:
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

## 🎯 What You'll See

✅ **Explore Page** - 5 demo businesses (after seeding)  
✅ **Master Admin Login** - Email: `admin@owner.com`, Password: `password123`  
✅ **Create New Business** - Sign up works perfectly  

---

## 🐛 Troubleshooting

### ❌ Port 5000 already in use

**Error**: `Port 5000 is already in use`

**Fix**: Kill the process:
```bash
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

Or just change the port in `.env`:
```
PORT=5001
```

---

### ❌ MongoDB connection error

**Error**: `bad auth : authentication failed`

**Fix**: 
1. Make sure you have the `.env` file in the `backend` folder
2. Check that the MongoDB URI is correct
3. Wait 10-30 seconds for the database to wake up (free tier pauses when inactive)

---

### ❌ No demo businesses showing

**Fix**: Run the seed script:
```bash
cd backend
node seed.js
```

---

## 📝 Quick Commands Summary

```bash
# Setup (one time)
cd backend && npm install
cd ..\frontend && npm install
cd ..\backend && node seed.js

# Run (every time)
# Terminal 1:
cd backend
npm run dev

# Terminal 2:
cd frontend
npm run dev

# Open browser: http://localhost:5173
```

---

## 🆘 Still Having Issues?

Contact Pranav with:
1. Screenshot of the error
2. Output from `node --version` and `npm --version`

---

**That's it! Super easy on Windows! 🎉**
