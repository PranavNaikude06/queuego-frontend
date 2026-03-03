# Remote Access Setup (For "Sir's" Phone on Different Internet)

Since the target device is on a **different internet connection** (e.g., mobile data or different Wi-Fi), we must use **Ngrok** to create a public link to your local server.

## 1. Start Your Backend
Ensure your backend is running normally:
```bash
cd backend
npm run dev
```

## 2. Start Ngrok
Open a **new** terminal window and run:
```bash
ngrok http 5000
```
*   This will generate a URL like: `https://abcd-123-456.ngrok-free.app` (or similar).
*   **Copy this URL.** (Note: It changes every time you restart ngrok).

## 3. Configure Frontend
1.  Open `frontend/.env` (create it if it doesn't exist).
2.  Add/Update this line with your **current** Ngrok URL:
    ```env
    VITE_API_URL=https://<your-ngrok-url>/api
    ```
    *(For example: `https://abcd-123.ngrok-free.app/api` - don't forget the `/api` at the end!)*

## 4. Run the App on Mobile
1.  **Sync** the configuration to the mobile app:
    ```bash
    cd frontend
    npx cap sync
    ```
2.  **Run** on the device:
    ```bash
    npx cap run android
    ```

## 5. Done!
The app on the phone will now talk to the internet -> Ngrok -> Your Laptop -> Backend.
**Keep the Ngrok terminal OPEN while testing.**
