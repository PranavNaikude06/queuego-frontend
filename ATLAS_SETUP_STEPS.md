# 🚀 MongoDB Atlas Setup - Step by Step

## Step 1: Create Account & Cluster

1. **Go to**: https://www.mongodb.com/cloud/atlas/register
2. **Sign up** with email (free forever)
3. **Create a FREE cluster** (M0 - Sandbox)
   - Choose cloud provider (AWS, Google, Azure) - doesn't matter for demo
   - Choose region closest to you
   - Click **"Create Cluster"** (takes 3-5 minutes)

## Step 2: Create Database User

1. Click **"Database Access"** in left sidebar
2. Click **"+ Add New Database User"**
3. **Authentication Method**: Password
4. **Username**: `clinicuser`
5. **Password**: Click **"Autogenerate Secure Password"** 
   - ⚠️ **COPY THE PASSWORD NOW!** (You won't see it again)
6. **Database User Privileges**: "Atlas admin" or "Read and write to any database"
7. Click **"Add User"**

## Step 3: Allow Network Access

1. Click **"Network Access"** in left sidebar
2. Click **"+ Add IP Address"**
3. Click **"Allow Access from Anywhere"** (for demo purposes)
   - Or click "Add Current IP Address" if you want more security
4. Click **"Confirm"**

## Step 4: Get Connection String

1. Click **"Database"** in left sidebar
2. Click **"Connect"** button on your cluster
3. Choose **"Connect your application"**
4. **Driver**: Node.js (should be default)
5. **Version**: 5.5 or later (doesn't matter much)
6. **COPY THE CONNECTION STRING**
   - Looks like: `mongodb+srv://clinicuser:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`

## Step 5: Format Connection String

Replace `<password>` with the password you copied in Step 2.

Example:
```
mongodb+srv://clinicuser:MySecretPassword123@cluster0.abc123.mongodb.net/clinic-queue?retryWrites=true&w=majority
```

⚠️ **Important**: 
- Replace `<password>` with your actual password
- Add `/clinic-queue` before the `?` to specify database name
- Keep `?retryWrites=true&w=majority` at the end

## Step 6: Update .env File

Create `clinic-queue/backend/.env` with:
```env
PORT=5000
MONGODB_URI=mongodb+srv://clinicuser:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/clinic-queue?retryWrites=true&w=majority
```

Replace `YOUR_PASSWORD` and `cluster0.xxxxx` with your actual values!

## Step 7: Restart Backend

```bash
cd clinic-queue/backend
npm run dev
```

You should see: `✅ MongoDB connected` 🎉

---

**Once you have the connection string, paste it here and I'll help you configure it!**
