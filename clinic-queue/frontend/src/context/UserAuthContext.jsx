import { createContext, useContext, useState, useEffect } from 'react';
import { auth, googleProvider, signInWithPopup, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendLoginLink as firebaseSendLoginLink, signInWithEmailLink, isSignInWithEmailLink, signInWithCredential, GoogleAuthProvider, messaging, getToken, onMessage } from '../config/firebase';
import apiClient from '../services/axiosConfig';
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';

const UserAuthContext = createContext();

// Action code settings for email link
// Action code settings for email link
const actionCodeSettings = {
    // URL must be whitelisted in Firebase Console -> Authentication -> Settings -> Authorized Domains
    url: `${import.meta.env.VITE_APP_URL || window.location.origin}/verify-email`,
    handleCodeInApp: true,
};

export function UserAuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [fcmToken, setFcmToken] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log('🔥 Firebase Auth State Changed:', firebaseUser ? `User: ${firebaseUser.email}` : 'Signed Out');
            if (firebaseUser) {
                try {
                    // Verify with backend and get a JWT
                    const idToken = await firebaseUser.getIdToken();
                    console.log('🎫 Firebase ID Token obtained, length:', idToken.length);

                    console.log('📡 Verifying with backend: /auth/firebase-verify...');
                    const response = await apiClient.post('/auth/firebase-verify', {
                        idToken,
                        role: 'customer'
                    });
                    console.log('✅ Backend Verification Response:', response.data);

                    if (response.data.success) {
                        const userData = {
                            uid: firebaseUser.uid,
                            email: firebaseUser.email,
                            displayName: firebaseUser.displayName,
                            photoURL: firebaseUser.photoURL,
                            token: response.data.token,
                            ...response.data.user
                        };
                        setUser(userData);
                        localStorage.setItem('userToken', response.data.token);

                        // Register for Push Notifications
                        registerPushNotifications();

                        setAuthError(null);
                        console.log('👤 User context updated with backend data');
                    }
                } catch (error) {
                    console.error('❌ Auth sync error:', error);
                    let errMsg = 'Failed to connect to server.';

                    if (error.response) {
                        console.error('🛑 Backend Error Response:', error.response.status, error.response.data);
                        errMsg = error.response.data?.error || `Server error (${error.response.status})`;
                    } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                        errMsg = 'Connection timed out. Check server/network.';
                    } else if (error.message === 'Network Error') {
                        errMsg = 'Network Error. Backend unreachable.';
                    }

                    setAuthError(errMsg);
                    setUser(null);
                    await signOut(auth); // Force sign out to prevent stuck state
                    alert(`Login Error: ${errMsg}`); // Show visible alert on device
                }
            } else {
                setUser(null);
                localStorage.removeItem('userToken');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signup = async (email, password) => {
        return createUserWithEmailAndPassword(auth, email, password);
    };

    const login = async (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const resetPassword = async (email) => {
        return sendPasswordResetEmail(auth, email);
    };

    const loginWithGoogle = async () => {
        try {
            if (Capacitor.isNativePlatform()) {
                // Always initialize immediately before signIn to ensure
                // GoogleSignInClient is built (fixes NullPointerException crash)
                try {
                    await GoogleAuth.initialize({
                        clientId: '547597389849-p4377e7516a141d2jg4m58emg236rdru.apps.googleusercontent.com',
                        scopes: ['profile', 'email'],
                        grantOfflineAccess: true,
                    });
                } catch (initErr) {
                    console.error('GoogleAuth init error:', initErr);
                }

                let googleUser;
                try {
                    googleUser = await GoogleAuth.signIn();
                } catch (nativeErr) {
                    console.error('Native Google sign-in failed:', nativeErr);
                    const msg = nativeErr?.message || '';
                    if (msg.includes('sign_in_failed') || msg.includes('DEVELOPER_ERROR') || msg.includes('10:')) {
                        throw new Error('Google login is not configured for this device. Please ensure the app is set up correctly in Firebase Console (SHA-1 fingerprint required).');
                    }
                    throw new Error('Google sign-in failed. Please check your internet connection and try again.');
                }
                const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
                await signInWithCredential(auth, credential);
            } else {
                await signInWithPopup(auth, googleProvider);
            }
        } catch (error) {
            console.error('Google login error:', error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    const updateProfile = async (name) => {
        try {
            const response = await apiClient.patch('/auth/profile', { name });
            if (response.data.success) {
                setUser(prev => ({ ...prev, displayName: name, name }));
            }
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    };

    const requestOTP = async (email) => {
        try {
            const response = await apiClient.post('/auth/request-otp', { email });
            return response.data;
        } catch (error) {
            console.error('Request OTP error:', error);
            throw error;
        }
    };

    const loginWithOTP = async (email, otp) => {
        try {
            const response = await apiClient.post('/auth/login-otp', { email, otp });
            if (response.data.success) {
                const userData = {
                    email,
                    displayName: response.data.user.name,
                    token: response.data.token,
                    ...response.data.user
                };
                setUser(userData);
                localStorage.setItem('userToken', response.data.token);
                setAuthError(null);
            }
            return response.data;
        } catch (error) {
            console.error('Login with OTP error:', error);
            throw error;
        }
    };

    const verifySignupOTP = async (email, otp) => {
        try {
            const response = await apiClient.post('/auth/verify-signup-otp', { email, otp });
            if (response.data.success) {
                const userData = {
                    email,
                    displayName: null, // Will be set in profile setup
                    token: response.data.token,
                    ...response.data.user
                };
                setUser(userData);
                localStorage.setItem('userToken', response.data.token);
                setAuthError(null);
            }
            return response.data;
        } catch (error) {
            console.error('Verify signup OTP error:', error);
            throw error;
        }
    };

    const resendVerification = async (email) => {
        try {
            const response = await apiClient.post('/auth/resend-verification', { email });
            return response.data;
        } catch (error) {
            console.error('Resend verification error:', error);
            throw error;
        }
    };

    // Email Link Authentication
    const sendLoginLink = async (email) => {
        try {
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            // Save email to localStorage for verification
            window.localStorage.setItem('emailForSignIn', email);
            return { success: true };
        } catch (error) {
            console.error('Send login link error:', error);
            throw error;
        }
    };

    const completeEmailLinkSignIn = async (emailLink) => {
        try {
            // Check if this is an email link
            if (!isSignInWithEmailLink(auth, emailLink)) {
                throw new Error('Invalid email link');
            }

            // Get email from localStorage
            let email = window.localStorage.getItem('emailForSignIn');

            // If user opened link on different device, ask for email
            if (!email) {
                email = window.prompt('Please provide your email for confirmation');
            }

            if (!email) {
                throw new Error('Email is required to complete sign-in');
            }

            // Sign in with email link
            const result = await signInWithEmailLink(auth, email, emailLink);

            // Clear email from localStorage
            window.localStorage.removeItem('emailForSignIn');

            return result.user;
        } catch (error) {
            console.error('Email link sign-in error:', error);
            throw error;
        }
    };

    // Superadmin Password Login (Bypasses Email Link)
    const superadminLogin = async (email, password) => {
        try {
            const response = await apiClient.post('/auth/superadmin-login', { email, password });
            if (response.data.success) {
                const userData = {
                    email,
                    displayName: response.data.user.name,
                    token: response.data.token,
                    ...response.data.user
                };
                setUser(userData);
                localStorage.setItem('userToken', response.data.token);
                setAuthError(null);
            }
            return response.data;
        } catch (error) {
            console.error('Superadmin login error:', error);
            throw error;
        }
    };

    // Push Notifications
    const registerPushNotifications = async () => {
        try {
            if (!messaging) return;

            console.log('📡 Requesting notification permission...');
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                console.log('✅ Notification permission granted.');

                // Get FCM Token
                // Note: VAPID key is required for Web FCM. 
                // Suggest user to put their VAPID key in .env
                const token = await getToken(messaging, {
                    vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
                });

                if (token) {
                    console.log('🎫 FCM Token:', token);
                    setFcmToken(token);

                    // Save to backend
                    await apiClient.post('/auth/save-fcm-token', { fcmToken: token });
                    console.log('✅ FCM Token saved to backend');
                }
            } else {
                console.warn('⚠️ Notification permission denied');
            }
        } catch (error) {
            console.error('❌ Push registration error:', error);
        }
    };

    // Listen for foreground messages
    useEffect(() => {
        if (messaging) {
            const unsubscribe = onMessage(messaging, (payload) => {
                console.log('🔔 Foreground Message received: ', payload);
                // Optionally show a browser toast or alert
                alert(`${payload.notification.title}\n${payload.notification.body}`);
            });
            return () => unsubscribe();
        }
    }, []);

    return (
        <UserAuthContext.Provider value={{
            user,
            loading,
            authError,
            loginWithGoogle,
            logout,
            updateProfile,
            signup,
            login,
            resetPassword,
            requestOTP,
            loginWithOTP,
            verifySignupOTP,
            resendVerification,
            sendLoginLink,
            completeEmailLinkSignIn,
            superadminLogin
        }}>
            {children}
        </UserAuthContext.Provider>
    );
}

export const useUserAuth = () => useContext(UserAuthContext);
