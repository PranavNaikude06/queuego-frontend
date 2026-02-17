import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// 10.0.2.2 is the special alias to your host loopback interface (i.e., 127.0.0.1 on your development machine)
const getBaseUrl = () => {
    if (import.meta.env.VITE_API_URL) {
        console.log('Using VITE_API_URL:', import.meta.env.VITE_API_URL);
        return import.meta.env.VITE_API_URL;
    }
    const platform = Capacitor.getPlatform();
    console.log('Detected Platform:', platform);

    if (platform === 'android') {
        return 'http://10.0.2.2:5000/api';
    }
    return 'http://localhost:5000/api';
};

const API_BASE_URL = getBaseUrl();
console.log('API_BASE_URL:', API_BASE_URL);

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000, // Fail after 15 seconds (increased for emulator stability)
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptors here if needed (e.g., for auth tokens)
apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken') || localStorage.getItem('adminToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default apiClient;
