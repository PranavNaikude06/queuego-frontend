import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import apiClient from '../services/axiosConfig';

function LandingPage() {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);

    useEffect(() => {
        // Check if logged-in user is superadmin by decoding token
        const token = localStorage.getItem('userToken') || localStorage.getItem('token');
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                if (payload.isSuperAdmin) setIsSuperAdmin(true);
            } catch (e) {
                // ignore decode errors
            }
        }

        const fetchBusinesses = async () => {
            try {
                const response = await apiClient.get('/businesses/user');
                setBusinesses(response.data);
            } catch (err) {
                console.error('Error fetching businesses:', err);
                setError('Failed to load businesses.');
            } finally {
                setLoading(false);
            }
        };

        fetchBusinesses();
    }, []);

    const handleRenew = async (businessId) => {
        if (!window.confirm('Are you sure you want to renew/activate this business subscription?')) return;

        try {
            await apiClient.post(`/businesses/${businessId}/renew`);
            alert('Subscription renewed successfully!');
            // Refresh the list
            const response = await apiClient.get('/businesses/user');
            setBusinesses(response.data);
        } catch (err) {
            console.error('Error renewing business:', err);
            alert('Failed to renew subscription.');
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Unknown';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="text-center">
            {/* Hero Section */}
            <div className="mb-12">
                <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-500 tracking-tight">
                    {isSuperAdmin ? '🛡️ Super Admin Panel' : 'Your Businesses'}
                </h2>
                <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
                    {isSuperAdmin
                        ? 'You have full access to every business registered on QueueGo.'
                        : 'Manage your queues, services, and operations all in one place.'}
                </p>
                {isSuperAdmin && (
                    <div className="mt-4 inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold px-4 py-2 rounded-full uppercase tracking-wider">
                        <span>🔑</span> Superadmin Access — {businesses.length} businesses total
                    </div>
                )}
            </div>

            {error && (
                <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-8 max-w-md mx-auto">
                    {error}
                </div>
            )}

            {/* Business List */}
            {loading ? (
                <div className="flex justify-center items-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
                </div>
            ) : businesses.length > 0 ? (
                <div className={`grid ${isSuperAdmin ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'} gap-6 max-w-6xl mx-auto`}>
                    {businesses.map((business) => (
                        <div
                            key={business._id}
                            className="bg-slate-800/50 p-6 rounded-3xl border border-slate-700/50 hover:border-emerald-500/40 transition-all group text-left shadow-xl shadow-black/20 flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform border border-emerald-500/20">
                                        🏢
                                    </div>
                                    {isSuperAdmin && (
                                        <span className="text-[10px] bg-slate-700 text-slate-400 px-2 py-1 rounded-lg font-mono">
                                            {business._id.slice(0, 8)}…
                                        </span>
                                    )}
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1">{business.name}</h3>
                                <p className="text-slate-400 text-sm mb-2 leading-relaxed">
                                    {business.address || 'No address provided'}
                                </p>
                                {/* Trial Badge */}
                                {(() => {
                                    const sub = business.subscription;
                                    if (sub?.status === 'paid') return <span className="inline-block text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-bold mb-3">✅ Active Subscription</span>;

                                    let trialStartRaw = sub?.trialStartDate || business.createdAt;
                                    if (!trialStartRaw) return null;

                                    let startDate;
                                    if (trialStartRaw._seconds) {
                                        startDate = new Date(trialStartRaw._seconds * 1000);
                                    } else {
                                        startDate = new Date(trialStartRaw);
                                    }

                                    const days = 15 - Math.floor((new Date() - startDate) / (1000 * 60 * 60 * 24));
                                    if (days > 0) return <span className="inline-block text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full font-bold mb-3">⏳ {days} day{days !== 1 ? 's' : ''} left in trial</span>;
                                    return <span className="inline-block text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-bold mb-3">🚫 Trial Expired</span>;
                                })()}

                                {/* Superadmin Extra Details */}
                                {isSuperAdmin && (
                                    <div className="space-y-2 mb-4 bg-slate-900/50 p-3 rounded-xl border border-slate-700/50">
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-slate-500 w-16 shrink-0">Created by</span>
                                            <span className="text-indigo-400 font-medium truncate">{business.creatorName || 'Unknown'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-slate-500 w-16 shrink-0">Email</span>
                                            <span className="text-slate-300 font-mono truncate">{business.creatorEmail || 'N/A'}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="text-slate-500 w-16 shrink-0">Created</span>
                                            <span className="text-slate-300">{formatDate(business.createdAt)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-2 mt-2">
                                <Link
                                    to={`/admin/${business._id}/login`}
                                    className="text-emerald-400 font-bold text-sm bg-emerald-500/10 py-2 px-4 rounded-xl inline-flex items-center justify-center w-full group-hover:bg-emerald-500/20 transition-colors"
                                >
                                    Open Dashboard →
                                </Link>
                                {isSuperAdmin && (
                                    <Link
                                        to={`/display/${business._id}`}
                                        className="text-indigo-400 font-bold text-sm bg-indigo-500/10 py-2 px-4 rounded-xl inline-flex items-center justify-center w-full hover:bg-indigo-500/20 transition-colors"
                                    >
                                        View Live Queue →
                                    </Link>
                                )}
                                {isSuperAdmin && business.subscription?.status !== 'paid' && (
                                    <button
                                        onClick={() => handleRenew(business._id)}
                                        className="text-amber-400 font-bold text-sm bg-amber-500/10 py-2 px-4 rounded-xl inline-flex items-center justify-center w-full hover:bg-amber-500/20 transition-colors"
                                    >
                                        👑 Renew Subscription
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-slate-800/30 p-12 rounded-3xl border border-slate-700/30 max-w-2xl mx-auto space-y-6 flex flex-col items-center">
                    <div className="text-5xl mb-2">🚀</div>
                    <h3 className="text-2xl font-bold text-white">No business found</h3>
                    <p className="text-slate-400 text-base max-w-md">
                        You haven't registered any businesses yet. Create one to get your personalized queue management panel and QR code.
                    </p>
                    <Link to="/signup" className="mt-4 inline-flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg hover:shadow-indigo-500/25">
                        Create a Business
                    </Link>
                </div>
            )}
        </div>
    );
}

export default LandingPage;
