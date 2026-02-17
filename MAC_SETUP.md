# 🍎 Setup Guide for Mac (macOS)

This guide will help you set up and run the Clinic Queue Management System on your Mac.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

1.  **Node.js**:
    *   Open Terminal and check if installed: `node -v`
    *   If not, download and install the LTS version from [nodejs.org](https://nodejs.org/) or use Homebrew:
        ```bash
        brew install node
        ```

2.  **MongoDB**:
    *   This project requires a MongoDB database.
    *   **Option A (Easiest)**: Use MongoDB Atlas (Cloud).
        1.  Create a free account at [MongoDB Atlas](https://www.mongodb.com/atlas).
        2.  Create a cluster and get your connection string (looks like `mongodb+srv://<username>:<password>@...`).
    *   **Option B (Local)**: Install MongoDB Community Edition via Homebrew.
        ```bash
        brew tap mongodb/brew
        brew install mongodb-community@7.0
        brew services start mongodb-community@7.0
        ```
    *   **Option C (Docker)**: If you possess Docker Desktop.
        ```bash
        docker run -d -p 27017:27017 --name mongo mongo:latest
        ```

## 🚀 Installation & Setup

### 1. Backend Setup

Open your Terminal app and navigate to the project folder.

```bash
# Navigate to the backend folder
cd path/to/clinic-queue/backend

# Install dependencies
npm install
```

**Configure Environment Variables:**

1.  Create a `.env` file in the `backend` folder.
2.  Add the following content (adjust `MONGODB_URI` if you are using Atlas):

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/clinic-queue
# JWT_SECRET=your_secret_key_here  <-- If authentication is enabled
```

**Start the Backend:**

```bash
npm run dev
```
*You should see: `✅ MongoDB Database connected` and `🚀 Server running on http://localhost:5000`*

---

### 2. Frontend Setup

Open a **new** Terminal tab or window (Cmd + T).

```bash
# Navigate to the frontend folder
cd path/to/clinic-queue/frontend

# Install dependencies
npm install

# Start the frontend
npm run dev
```
*You should see a URL like `http://localhost:5173`.*

## 🌐 Accessing the App

Open your browser (Safari, Chrome, etc.) and go to:
*   **http://localhost:5173**

## ⚠️ Common Mac Issues

*   **EADDRINUSE error**: If port 5000 is taken, macOS AirPlay Receiver might be using it.
    *   *Fix*: Turn off AirPlay Receiver in *System Settings > General > AirDrop & Handoff*.
    *   *Alternative*: Change `PORT=5000` to `PORT=5001` in your `.env` file.
*   **Permission Denied**: If you get permission errors running npm, try using `sudo` (e.g., `sudo npm install`) or fix your npm permissions (better).
*   **Oracle Database**: If you intend to use Oracle (`node-oracledb`) on an Apple Silicon (M1/M2/M3) Mac, you generally don't need the Instant Client for "Thin" mode (default in newer versions), but if required, install via Homebrew: `brew install instantly-client-basic`. Note that the default setup uses MongoDB.

## 🛑 Stopping the App

*   Press `Ctrl + C` in the terminal windows running the servers to stop them.
