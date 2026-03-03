# How to Build & Send the APK

Since your Sir is far away, you need to send him an **APK file**.
But because the server is on **your laptop**, the APK needs a way to reach it over the internet.

## Phase 1: Create the Public Link (Do this FIRST)
1.  Start your backend: `cd backend` -> `npm run dev`
2.  Start Ngrok: `ngrok http 5000`
3.  **COPY** the forwarding URL (e.g., `https://xyz-123.ngrok-free.app`).

## Phase 2: Configure the App
1.  Open `frontend/.env`.
2.  Paste the Ngrok URL (with `/api` at the end):
    ```env
    VITE_API_URL=https://xyz-123.ngrok-free.app/api
    ```
    *(e.g., `VITE_API_URL=https://abcd-123.ngrok-free.app/api`)*
3.  Save the file.

## Phase 3: Build the APK
Run these commands in your `frontend` terminal:

1.  **Build the web assets:**
    ```bash
    npm run build
    ```
2.  **Sync to Android:**
    ```bash
    npx cap sync
    ```
3.  **Build the APK (Debug):**
    ```bash
    cd android
    .\gradlew assembleDebug
    ```
    *(If `./gradlew` fails, open Android Studio with `npx cap open android` and select **Build > Build Bundle(s) / APK(s) > Build APK(s)**).*

## Phase 4: Retrieve & Send
1.  Navigate to:
    `frontend/android/app/build/outputs/apk/debug/`
2.  Find **`app-debug.apk`**.
3.  **Rename it** to something nice like `QueueGo-Demo.apk`.
4.  **Send this file** to your Sir (WhatsApp, Email, etc.).

## Phase 5: The Demo (CRITICAL)
For the app to work when he opens it:
1.  **Your laptop MUST be on.**
2.  **`npm run dev` MUST be running.**
3.  **`ngrok http 5000` MUST be running.**
    *   *If you stop Ngrok, the app on his phone will stop working.*
