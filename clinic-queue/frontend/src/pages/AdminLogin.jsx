import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../services/axiosConfig';

function AdminLogin() {
    const { businessId } = useParams();
    const [businessName, setBusinessName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBusiness = async () => {
            try {
                const res = await apiClient.get(`/businesses/${businessId}`);
                setBusinessName(res.data.name);
            } catch (err) {
                console.error("Failed to fetch business", err);
            }
        };
        if (businessId) fetchBusiness();
    }, [businessId]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await apiClient.post(`/auth/login`, {
                email,
                password,
                businessId
            });

            if (response.data.success) {
                localStorage.setItem('adminToken', response.data.token);
                navigate(`/admin/${businessId}/control`);
            }
        } catch (err) {
            console.error("Login Error:", err);
            setError(err.response?.data?.error || 'Failed to login. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen relative p-4">
            <button
                onClick={() => navigate(-1)}
                className="absolute top-8 left-8 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium group"
            >
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Back
            </button>
            <div className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700 p-10 shadow-2xl">
                <div className="text-center mb-8">
                    <h2 className="text-xl font-bold text-white mb-2">{businessName ? `${businessName} Admin` : 'Admin Access'}</h2>
                    <p className="text-slate-500 text-sm">Authorized personnel only</p>
                </div>

                {error && (
                    <div className="mb-6 p-3 rounded bg-red-900/20 text-red-300 text-sm border border-red-900/30">
                        {error}
                    </div>
                )}

                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-400 ml-1" htmlFor="email">
                            Email Address
                        </label>
                        <input
                            id="email"
                            type="email"
                            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="admin@business.com"
                            required
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-400 ml-1" htmlFor="password">
                            Password
                        </label>
                        <input
                            id="password"
                            type="password"
                            className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-colors disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Logging in...' : 'Sign In'}
                    </button>

                    <div className="text-center mt-6">
                        <p className="text-slate-500 text-xs">
                            Don't have an account? <Link to="/signup" className="text-indigo-400 hover:text-indigo-300 font-bold">Sign up</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default AdminLogin;
