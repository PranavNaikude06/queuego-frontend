import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import apiClient from '../services/axiosConfig';

function UserLogin() {
    const [view, setView] = useState('login'); // 'login', 'signup', 'setup-profile', 'forgot-password', 'verify-signup'
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [signupOtp, setSignupOtp] = useState('');
    const [signupEmail, setSignupEmail] = useState(''); // email used during signup, for verification
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { user, authError, loginWithGoogle, updateProfile, login, signup, resetPassword, superadminLogin, verifySignupOTP, resendVerification } = useUserAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Redirect search param or default to home
    const from = new URLSearchParams(location.search).get('from') || '/';

    useEffect(() => {
        if (authError) {
            setLoading(false);
        }
        if (user && (!user.displayName || user.displayName === 'Guest User')) {
            setView('setup-profile');
            setLoading(false);
        } else if (user && user.displayName) {
            navigate(from, { replace: true });
        }
    }, [user, authError, navigate, from]);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        try {
            await loginWithGoogle();
        } catch (err) {
            console.error("Google Login Error:", err);
            if (err.code === 'auth/popup-closed-by-user') {
                setLoading(false);
                return;
            }
            const msg = err.message || 'Google login failed';
            setError(msg);
            alert(`Google Error: ${msg}`);
        } finally {
            setLoading(false);
        }
    };



    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await resetPassword(email);
            setError('');
            alert('Password reset email sent! Check your inbox.');
            setView('login');
        } catch (err) {
            console.error("Reset Password Error:", err);
            const msg = err.message || 'Failed to send reset email';
            setError(msg);
            alert(`Reset Error: ${msg}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
        if (!fullName) return;
        setLoading(true);
        try {
            await updateProfile(fullName);
            navigate('/explore', { replace: true });
        } catch (err) {
            console.error("Update Profile Error:", err);
            setError(err.response?.data?.error || err.message || 'Failed to update name');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (view === 'signup') {
                // Only call our backend signup — it handles password hashing + OTP verification.
                // Do NOT call Firebase createUserWithEmailAndPassword here because that triggers
                // onAuthStateChanged → firebase-verify → creates user in Firestore, causing a
                // "User already exists" error when /auth/signup runs immediately after.
                const res = await apiClient.post('/auth/signup', { email, password });
                if (res.data.requiresVerification) {
                    setSignupEmail(email);
                    setView('verify-signup');
                    setLoading(false);
                    return;
                }
            } else {
                await login(email, password);
            }
        } catch (err) {
            console.error('Auth Error Details:', err);

            let msg = err.message || 'Authentication failed';

            // Handle backend errors (e.g. from axios)
            if (err.response && err.response.data && err.response.data.error) {
                msg = err.response.data.error;
            } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
                msg = 'Invalid credentials';
            } else if (err.code === 'auth/email-already-in-use') {
                msg = 'An account with this email already exists. Please login.';
            }

            setError(msg);
            alert(`Login/Signup Error: ${msg}`);
            setLoading(false);
        }
    };

    const handleVerifySignup = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await verifySignupOTP(signupEmail, signupOtp);
            // verifySignupOTP sets user in context, useEffect will navigate
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid or expired code. Please try again.');
            setLoading(false);
        }
    };

    const handleResendVerification = async () => {
        if (resendCooldown > 0) return;
        setError('');
        try {
            await resendVerification(signupEmail);
            setResendCooldown(60);
            const timer = setInterval(() => {
                setResendCooldown(prev => {
                    if (prev <= 1) { clearInterval(timer); return 0; }
                    return prev - 1;
                });
            }, 1000);
        } catch (err) {
            setError('Failed to resend code. Please try again.');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900/50">
            <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-700/50 p-10 shadow-2xl relative overflow-hidden">
                {/* Visual accents */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-purple-500"></div>

                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-3 mb-6">
                        <div className="bg-slate-900 p-3 rounded-xl border border-slate-700">
                            <img src="/logo.svg" alt="QueueGo" className="h-8 w-8" />
                        </div>
                        <div className="text-left leading-tight">
                            <h1 className="text-xl font-bold text-white tracking-tight">QueueGo</h1>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-[0.2em]">Professional Queue Management</p>
                        </div>
                    </div>
                    {view === 'setup-profile' ? (
                        <>
                            <h2 className="text-3xl font-bold text-white mb-2">Welcome!</h2>
                            <p className="text-slate-400 text-sm">What should we call you?</p>
                        </>
                    ) : view === 'forgot-password' ? (
                        <>
                            <h2 className="text-3xl font-bold text-white mb-2">Reset Password</h2>
                            <p className="text-slate-400 text-sm">Enter your email to receive a reset link.</p>
                        </>
                    ) : view === 'verify-signup' ? (
                        <>
                            <h2 className="text-3xl font-bold text-white mb-2">Verify Email</h2>
                            <p className="text-slate-400 text-sm">Check <span className="text-emerald-400 font-semibold">{signupEmail}</span> for your code.</p>
                        </>
                    ) : (
                        <>
                            <h2 className="text-3xl font-bold text-white mb-2">Login</h2>
                            <p className="text-slate-400 text-sm">Welcome back — let's get you in.</p>
                        </>
                    )}
                </div>

                {view !== 'setup-profile' && view !== 'forgot-password' && view !== 'verify-signup' && (
                    <div className="bg-slate-900/40 p-1.5 rounded-2xl border border-slate-700/50 mb-8 flex">
                        <button
                            onClick={() => setView('login')}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'login' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setView('signup')}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${view === 'signup' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                        >
                            Sign up
                        </button>
                    </div>
                )}

                {(error || authError) && (
                    <div className="mb-6 p-4 rounded-xl bg-red-900/20 text-red-300 text-xs border border-red-900/30 flex items-center gap-3">
                        <span className="text-lg">⚠️</span> {error || authError}
                    </div>
                )}


                {view === 'verify-signup' ? (
                    <form onSubmit={handleVerifySignup} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Verification Code</label>
                            <input
                                type="text"
                                inputMode="numeric"
                                className="w-full bg-slate-900/50 border border-slate-700 px-5 py-3.5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-bold text-center text-2xl tracking-[0.5em]"
                                placeholder="000000"
                                value={signupOtp}
                                onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                required
                                autoFocus
                            />
                            <p className="text-xs text-slate-500 text-center mt-1">Enter the 6-digit code sent to your email</p>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || signupOtp.length !== 6}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Verifying...' : 'Verify & Continue →'}
                        </button>
                        <button
                            type="button"
                            onClick={handleResendVerification}
                            disabled={resendCooldown > 0}
                            className="w-full text-slate-500 hover:text-emerald-400 text-sm mt-2 transition-colors disabled:opacity-50"
                        >
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Didn't get the code? Resend"}
                        </button>
                    </form>
                ) : view === 'setup-profile' ? (

                    <form onSubmit={handleUpdateProfile} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">First Name</label>
                            <input
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700 px-5 py-3.5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-bold"
                                placeholder="John"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Last Name</label>
                            <input
                                type="text"
                                className="w-full bg-slate-900/50 border border-slate-700 px-5 py-3.5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-bold"
                                placeholder="Doe"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading || !firstName.trim()}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Start Exploring →'}
                        </button>
                    </form>
                ) : view === 'forgot-password' ? (
                    <form onSubmit={handleForgotPassword} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                            <input
                                type="email"
                                className="w-full bg-slate-900/50 border border-slate-700 px-5 py-3.5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                        <button
                            type="button"
                            onClick={() => setView('login')}
                            className="w-full text-slate-500 hover:text-white text-sm mt-4"
                        >
                            Back to Login
                        </button>
                    </form>
                ) : (
                    <div className="space-y-6">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-900/50 border border-slate-700 px-5 py-3.5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-bold"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Password</label>
                                <input
                                    type="password"
                                    className="w-full bg-slate-900/50 border border-slate-700 px-5 py-3.5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-emerald-500 transition-all font-bold"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                {view === 'login' && (
                                    <div className="flex justify-end">
                                        <button
                                            type="button"
                                            onClick={() => setView('forgot-password')}
                                            className="text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                                        >
                                            Forgot Password?
                                        </button>
                                    </div>
                                )}
                            </div>
                            <button
                                type="submit"
                                disabled={loading || !email.trim() || !password}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:opacity-50"
                            >
                                {loading ? (view === 'signup' ? 'Creating Account...' : 'Logging in...') : (view === 'signup' ? 'Create Account' : 'Login')}
                            </button>
                        </form>

                        <div className="relative my-10">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-slate-700/50"></div>
                            </div>
                            <div className="relative flex justify-center text-[10px] uppercase tracking-widest font-bold">
                                <span className="bg-slate-800 px-4 text-slate-500">Or continue with</span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={loading}
                            className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 shadow-xl"
                        >
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                        </button>

                        <div className="flex justify-between items-center text-xs font-bold pt-4">
                            <Link to="/staff-search" className="flex items-center gap-1.5 text-slate-500 hover:text-emerald-400 transition-colors">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                                Staff login
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default UserLogin;
