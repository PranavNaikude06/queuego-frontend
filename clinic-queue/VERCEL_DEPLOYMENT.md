# 🚀 Step-by-Step: Deploying QueueGo Frontend to Vercel

Follow these steps to get your frontend live and connected to your Render backend.

---

### Step 1: Create a GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Name it (e.g., `queuego-frontend`).
3. Keep it **Public** (or Private) and click **Create repository**.
4. **Copy the URL** of your new repository (it looks like `https://github.com/YourName/queuego-frontend.git`).

### Step 2: Push your Local Code
Open your terminal in the `frontend` folder and run these commands one by one:

```bash
# 1. Change the remote to your new repository
git remote set-url origin https://github.com/YourName/queuego-frontend.git

# 2. Push the code
git push -u origin main
```

---

### Step 3: Connect to Vercel
1. Go to [Vercel.com](https://vercel.com) and log in with GitHub.
2. Click **Add New** > **Project**.
3. Find your `queuego-frontend` repo and click **Import**.

### Step 4: Configure Environment Variables (CRITICAL)
In the "Environment Variables" section on Vercel, add this:

| Key | Value |
| :--- | :--- |
| **VITE_API_URL** | `https://backend-8gmt.onrender.com/api` |

Click **Deploy**.

---

### Step 5: Update your Backend (Render)
Now that your frontend has a live URL (e.g., `https://queuego-frontend.vercel.app`), your backend needs to know about it.

1. Go to your **Render Dashboard** (for the Backend).
2. Go to **Settings** > **Environment Variables**.
3. Update the `FRONTEND_URL` variable:
   - **Old Value**: `http://192.168.0.100:5173`
   - **New Value**: `https://your-app-name.vercel.app` (Your Vercel URL)

This step ensures your **QR Codes** work and it allows your frontend to talk to your backend (CORS).

---

### 🎉 Done!
Your app is now live. Any future changes you save locally and `git push` will automatically update your Vercel site.
