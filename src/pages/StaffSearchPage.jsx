import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../services/axiosConfig';

function StaffSearchPage() {
    const [businesses, setBusinesses] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                const response = await apiClient.get('/businesses');
                setBusinesses(response.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchBusinesses();
    }, []);

    const filtered = businesses.filter(b =>
        b.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="max-w-xl mx-auto py-20 px-4">
            <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors text-sm font-medium group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Home
            </Link>

            <div className="bg-slate-800 rounded-3xl border border-slate-700 p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>

                <h2 className="text-3xl font-bold text-white mb-2">Staff Login</h2>
                <p className="text-slate-500 text-sm mb-10">Select your business to continue to the control panel.</p>

                <div className="relative mb-8">
                    <input
                        type="text"
                        placeholder="Search your business..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-12 py-4 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">🔍</span>
                </div>

                <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-10 text-slate-600">Loading businesses...</div>
                    ) : filtered.map(b => (
                        <button
                            key={b._id}
                            onClick={() => navigate(`/admin/${b._id}/login`)}
                            className="w-full text-left p-5 rounded-2xl bg-slate-900/50 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-700/30 transition-all group flex justify-between items-center"
                        >
                            <span className="text-white font-bold">{b.name}</span>
                            <span className="text-xs text-indigo-400 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Select →</span>
                        </button>
                    ))}
                    {!loading && filtered.length === 0 && (
                        <div className="text-center py-10 text-slate-600 text-sm italic">
                            No business found. Are you signed up?
                        </div>
                    )}
                </div>

                <div className="mt-10 pt-8 border-t border-slate-700/50 text-center">
                    <p className="text-slate-500 text-xs">
                        Don't see your business? <Link to="/signup" className="text-indigo-400 font-bold hover:underline">Register now</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default StaffSearchPage;
