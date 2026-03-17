import axios from 'axios';
import { Capacitor } from '@capacitor/core';

// 10.0.2.2 is the special alias to your host loopback interface (i.e., 127.0.0.1 on your development machine)
const getBaseUrl = () => {
    // 1. Check for Environment Variable
    let url = import.meta.env.VITE_API_URL;

    // 2. Fallbacks
    if (!url) {
        url = 'https://backend-8gmt.onrender.com/api';
    }

    // Sanitize: Remove any accidental newlines or spaces from the URL string
    return url.replace(/[\n\r\t\s]/g, '').trim();
};

const API_BASE_URL = getBaseUrl();

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 60000,
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
