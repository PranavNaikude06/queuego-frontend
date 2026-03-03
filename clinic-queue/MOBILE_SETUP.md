# Mobile Testing Setup

To run the app on your real Android device and connect to the local backend:

## 1. Network Configuration
Your computer and your mobile device MUST be on the **same Wi-Fi network**.

Your computer's IP address is: `192.168.0.100`

## 2. API URL Update
I have automatically updated `frontend/src/services/axiosConfig.js` to point to:
`http://192.168.0.100:5000/api`

## 3. Running the App
1.  Verify your backend is running:
    ```bash
    cd backend
    npm run dev
    ```
2.  Connect your Android device via USB.
3.  Enable **USB Debugging** on your phone (in Developer Options).
4.  Run the app:
    ```bash
    cd frontend
    npx cap run android --target=[YOUR_DEVICE_ID]
    ```
    (Or open Android Studio with `npx cap open android` and click "Run")

## Troubleshooting
-   **"Network Error"**:
    -   Check if your Windows Firewall is blocking Node.js. Allow it.
    -   Ensure both devices are on the same 2.4GHz/5GHz Wi-Fi band.
    -   Try accessing `http://192.168.0.100:5000/health` from your mobile browser (Chrome). If it works, the app should work.
-   **"Cleartext traffic not permitted"**:
    -   This is already handled in your `AndroidManifest.xml` via `android:usesCleartextTraffic="true"`.
