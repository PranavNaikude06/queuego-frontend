import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';

function VerifyEmail() {
    const [status, setStatus] = useState('verifying');
    const [error, setError] = useState('');
    const navigate = useNavigate();
    const { completeEmailLinkSignIn } = useUserAuth();

    useEffect(() => {
        const verifyEmailLink = async () => {
            try {
                await completeEmailLinkSignIn(window.location.href);
                setStatus('success');
                // Wait a moment then redirect
                setTimeout(() => navigate('/explore'), 2000);
            } catch (err) {
                console.error('Email link verification error:', err);
                setError(err.message || 'Failed to verify email link');
                setStatus('error');
            }
        };

        verifyEmailLink();
    }, [completeEmailLinkSignIn, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-900/50">
            <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-xl rounded-[2.5rem] border border-slate-700/50 p-12 shadow-2xl">
                {/* Visual accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-indigo-500 to-purple-500"></div>

                <div className="text-center space-y-6">
                    {status === 'verifying' && (
                        <>
                            <div className="text-7xl mb-6 animate-pulse">⏳</div>
                            <h2 className="text-3xl font-bold text-white">Verifying...</h2>
                            <p className="text-slate-400 text-sm">Please wait while we verify your email</p>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="text-7xl mb-6 animate-bounce">✅</div>
                            <h2 className="text-3xl font-bold text-emerald-400">Success!</h2>
                            <p className="text-slate-400 text-sm">Email verified successfully</p>
                            <p className="text-slate-500 text-xs">Redirecting to app...</p>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="text-7xl mb-6">❌</div>
                            <h2 className="text-3xl font-bold text-red-400">Verification Failed</h2>
                            <p className="text-slate-400 text-sm mb-6">{error}</p>
                            <button
                                onClick={() => navigate('/login')}
                                className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-bold py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98]"
                            >
                                ← Back to Login
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default VerifyEmail;
