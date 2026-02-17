# 🚀 Quick MongoDB Setup Guide

## Option 1: MongoDB Atlas (Cloud - Recommended for Quick Demo) ⭐

**No installation needed! Free tier available.**

### Steps:

1. **Create Free Account**
   - Go to: https://www.mongodb.com/cloud/atlas/register
   - Sign up (free forever tier)

2. **Create a Cluster**
   - Click "Build a Database"
   - Choose **FREE** tier (M0)
   - Select a cloud provider and region (closest to you)
   - Click "Create Cluster" (takes 3-5 minutes)

3. **Create Database User**
   - Go to "Database Access" in left menu
   - Click "Add New Database User"
   - Username: `clinicuser` (or any name)
   - Password: Click "Autogenerate Secure Password" (COPY IT!)
   - Database User Privileges: "Read and write to any database"
   - Click "Add User"

4. **Allow Network Access**
   - Go to "Network Access" in left menu
   - Click "Add IP Address"
   - Click "Allow Access from Anywhere" (for demo) or "Add Current IP Address"
   - Click "Confirm"

5. **Get Connection String**
   - Go to "Database" → "Connect"
   - Choose "Connect your application"
   - Copy the connection string (looks like):
     ```
     mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
     ```

6. **Update Your .env File**
   - In `clinic-queue/backend/` folder, create/update `.env`:
   ```env
   PORT=5000
   MONGODB_URI=mongodb+srv://clinicuser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/clinic-queue?retryWrites=true&w=majority
   ```
   - Replace `YOUR_PASSWORD` with the password you copied
   - Replace the cluster URL with your actual cluster URL

7. **Restart Backend**
   - Stop the backend (Ctrl+C)
   - Run: `npm run dev`
   - You should see: `✅ MongoDB connected`

---

## Option 2: Install MongoDB Locally

### Windows:

1. **Download MongoDB Community Server**
   - Go to: https://www.mongodb.com/try/download/community
   - Select: Windows, MSI package
   - Download and run installer

2. **Install Options**
   - Choose "Complete" installation
   - Install as a Windows Service (recommended)
   - Install MongoDB Compass (GUI tool - optional but helpful)

3. **Verify Installation**
   ```powershell
   mongod --version
   ```

4. **Start MongoDB Service**
   - MongoDB should auto-start as a service
   - Or manually: Open Services → Find "MongoDB" → Start

5. **Test Connection**
   ```powershell
   mongosh
   ```
   If it connects, MongoDB is running!

6. **Update .env (if needed)**
   ```env
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/clinic-queue
   ```

---

## Quick Test

After setup, restart your backend:
```bash
cd clinic-queue/backend
npm run dev
```

Look for: `✅ MongoDB connected`

Then test your frontend - the errors should be gone! 🎉
