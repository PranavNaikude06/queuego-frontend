# How to Deploy Backend on Render (Free)

Deploying to Render means your backend will run **24/7 in the cloud**. You won't need your laptop on for the app to work!

## Step 1: Push Code to GitHub
1.  Create a new repository on [GitHub](https://github.com/new).
2.  Push your code:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin https://github.com/<your-username>/<your-repo-name>.git
    git push -u origin main
    ```

## Step 2: Create Service on Render
1.  Go to [dashboard.render.com](https://dashboard.render.com/) -> New -> **Web Service**.
2.  Connect your GitHub repository.
3.  **Crucial Settings**:
    *   **Name**: `queue-app-backend` (or similar)
    *   **Root Directory**: `backend` (Important! Don't leave blank)
    *   **Runtime**: `Node`
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
    *   **Instance Type**: `Free`

## Step 3: Environment Variables
Go to the **Environment** tab in your new Render service and add these variables (copy values from your local `.env`):

| Key | Value (Copy from local `.env`) |
| :--- | :--- |
| `PORT` | `render` (Render sets this automatically) |
| `MONGO_URI` | `mongodb+srv://...` |
| `JWT_SECRET` | `your_secret` |
| `RESEND_API_KEY` | `re_...` |
| `TWILIO_ACCOUNT_SID` | ... |
| `TWILIO_AUTH_TOKEN` | ... |
| `TWILIO_PHONE_NUMBER` | ... |
| `FIREBASE_PROJECT_ID` | ... |
| `FIREBASE_CLIENT_EMAIL` | ... |
| `FIREBASE_PRIVATE_KEY` | ... (Copy the whole private key, include `-----BEGIN PRIVATE KEY-----`) |

*Click "Save Changes" and wait for the deployment to finish.*

## Step 4: Update Frontend App
Once Render says **"Live"**, copy the service URL (e.g., `https://queue-app-backend.onrender.com`).

1.  Open `frontend/.env`.
2.  Update the API URL:
    ```env
    VITE_API_URL=https://queue-app-backend.onrender.com/api
    ```
    *(Don't forget `/api` at the end!)*
3.  **Rebuild the APK** (Follow `BUILD_APK.md` Phase 3).
4.  Send this *new* APK to your Sir.

## Done!
Now the app works everywhere, even if your laptop is off.
