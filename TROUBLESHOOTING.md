# 🔧 Troubleshooting Guide

## Common Errors and Solutions

### ❌ Error: "Failed to book appointment" / "Failed to load queue"

**Possible Causes:**

1. **Backend Server Not Running** (Most Common)
   - **Solution**: Make sure the backend server is running
   ```bash
   cd clinic-queue/backend
   npm run dev
   ```
   - Check terminal for: `🚀 Server running on http://localhost:5000`

2. **MongoDB Not Running** (Very Common)
   - **Solution**: Start MongoDB service
   ```bash
   # Windows (as Administrator):
   net start MongoDB
   
   # Or if installed via MongoDB Community:
   mongod
   
   # Mac/Linux:
   sudo systemctl start mongod
   # or
   brew services start mongodb-community
   ```
   - Check terminal for: `✅ MongoDB connected`

3. **Wrong Port Configuration**
   - Frontend expects backend on `http://localhost:5000`
   - Check `vite.config.js` proxy settings
   - Check backend `PORT` in `.env` or default (5000)

4. **Frontend Proxy Not Working**
   - Make sure you're using `npm run dev` (not `npm run build`)
   - Vite dev server includes the proxy
   - Restart frontend if you changed `vite.config.js`

### 🔍 How to Diagnose

**Step 1: Check Backend Status**
```bash
# In backend folder
cd clinic-queue/backend
npm run dev
```
Look for:
- ✅ `🚀 Server running on http://localhost:5000`
- ✅ `✅ MongoDB connected` (or error message)

**Step 2: Test Backend API**
Open browser and go to:
```
http://localhost:5000/health
```
Should see: `{"status":"OK","message":"Server is running"}`

**Step 3: Check MongoDB**
```bash
# Try connecting to MongoDB
mongosh
# or
mongo
```
If it connects, MongoDB is running. If not, start MongoDB service.

**Step 4: Check Frontend**
```bash
# In frontend folder
cd clinic-queue/frontend
npm run dev
```
Should see: `Local: http://localhost:5173`

**Step 5: Check Browser Console**
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab to see if API calls are failing

### 🎯 Quick Fix Checklist

- [ ] Backend server running? (`npm run dev` in backend folder)
- [ ] MongoDB running? (Check with `mongosh` or service status)
- [ ] Frontend running? (`npm run dev` in frontend folder)
- [ ] Both servers in separate terminals?
- [ ] No port conflicts? (5000 for backend, 5173 for frontend)
- [ ] Browser console shows API errors?

### 📝 Error Messages Explained

**"Cannot connect to server. Please make sure the backend is running on port 5000."**
- ➡️ Backend is not running or not accessible
- **Fix**: Start backend with `npm run dev` in backend folder

**"Database not connected. Please check MongoDB is running."**
- ➡️ MongoDB service is not running
- **Fix**: Start MongoDB service (see above)

**"Failed to book appointment. Please try again."**
- ➡️ Could be database or validation error
- **Fix**: Check backend terminal for detailed error logs

### 🚀 Start Order (IMPORTANT)

1. **First**: Start MongoDB
2. **Second**: Start Backend (`cd backend && npm run dev`)
3. **Third**: Start Frontend (`cd frontend && npm run dev`)

---

If issues persist, check the terminal output for detailed error messages!
