import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../services/axiosConfig';
import { useUserAuth } from '../context/UserAuthContext';

function SignupPage() {
    const { user } = useUserAuth();
    const [formData, setFormData] = useState({
        businessName: '',
        adminName: '',
        address: ''
    });
    const [location, setLocation] = useState(null); // { lat, lng }
    const [gettingLocation, setGettingLocation] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    // Pre-fill admin name from user's display name if available
    useEffect(() => {
        if (user?.displayName) {
            setFormData(prev => ({ ...prev, adminName: user.displayName }));
        }
    }, [user]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleGetLocation = async () => {
        setGettingLocation(true);
        setError('');

        try {
            const { Geolocation } = await import('@capacitor/geolocation');

            // Check/Request permissions
            const permission = await Geolocation.checkPermissions();
            if (permission.location === 'denied') {
                const requestResult = await Geolocation.requestPermissions();
                if (requestResult.location === 'denied') {
                    setError('Location permission denied. Please enable it in settings.');
                    setGettingLocation(false);
                    return;
                }
            }

            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000
            });

            setLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });

            // Auto-fill address
            try {
                const { reverseGeocode } = await import('../services/geocoding');
                const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
                if (address) {
                    setFormData(prev => ({ ...prev, address: address }));
                }
            } catch (geocodeErr) {
                console.warn('Geocoding failed:', geocodeErr);
            }
        } catch (err) {
            console.error(err);
            setError('Unable to retrieve your location. Please check if GPS is enabled.');
        } finally {
            setGettingLocation(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (!user) {
            setError('You must be logged in to create a business.');
            setLoading(false);
            return;
        }

        try {
            // Get Firebase ID token (force refresh to avoid expired tokens)
            const idToken = await user.getIdToken(true);

            const response = await apiClient.post('/auth/business-signup-firebase', {
                businessName: formData.businessName,
                adminName: formData.adminName,
                address: formData.address, // Send address
                location: location, // Send GPS coords
                idToken
            });

            if (response.data.success) {
                localStorage.setItem('adminToken', response.data.token);
                navigate(`/admin/${response.data.businessId}/control`);
            }
        } catch (err) {
            console.error('Business creation error:', err.response?.data || err.message);
            const serverError = err.response?.data?.error;
            if (serverError) {
                setError(serverError);
            } else if (err.message?.includes('network') || err.code === 'ERR_NETWORK') {
                setError('Network error. Please check connection: ' + err.message);
            } else {
                // If the backend returns HTML or an unexpected object, show it
                const rawError = err.response?.data ? (typeof err.response.data === 'string' ? err.response.data.substring(0, 100) : JSON.stringify(err.response.data)) : err.message;
                setError(`Business creation failed: ${rawError}`);
            }
        } finally {
            setLoading(false);
        }
    };

    // Redirect to login if not authenticated
    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] py-12">
                <div className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700 p-8 md:p-10 shadow-2xl text-center">
                    <h2 className="text-2xl font-bold text-white mb-4">Login Required</h2>
                    <p className="text-slate-400 mb-6">Please login first to create a business.</p>
                    <Link
                        to="/user-login?from=/signup"
                        className="inline-block py-3 px-8 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold transition-all"
                    >
                        Login →
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] py-12 relative">
            <Link to="/" className="absolute top-0 left-4 md:left-0 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Back
            </Link>
            <div className="w-full max-w-lg bg-slate-800 rounded-2xl border border-slate-700 p-8 md:p-10 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-indigo-500"></div>

                <div className="text-center mb-10">
                    <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Launch your Queue</h2>
                    <p className="text-slate-500 text-sm">Join the next generation of business management</p>
                    <p className="text-emerald-400 text-xs mt-2">Signed in as {user.email}</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-900/20 text-red-300 text-sm border border-red-900/30 flex items-center gap-3">
                        <span className="text-xl">⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSignup} className="space-y-5">
                    <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1" htmlFor="businessName">
                                Business Name
                            </label>
                            <input
                                id="businessName"
                                type="text"
                                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 transition-all"
                                value={formData.businessName}
                                onChange={handleChange}
                                placeholder="e.g. Acme Clinic"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase ml-1" htmlFor="adminName">
                                Your Name
                            </label>
                            <input
                                id="adminName"
                                type="text"
                                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 transition-all"
                                value={formData.adminName}
                                onChange={handleChange}
                                placeholder="e.g. John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1" htmlFor="address">
                            Business Address
                        </label>
                        <input
                            id="address"
                            type="text"
                            className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-white focus:outline-none focus:border-emerald-500 transition-all"
                            value={formData.address}
                            onChange={handleChange}
                            placeholder="e.g. 123 Main Street, Mumbai"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">
                            GPS Location (For Nearby Search)
                        </label>
                        <button
                            type="button"
                            onClick={handleGetLocation}
                            disabled={gettingLocation}
                            className={`w-full py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all font-bold text-sm ${location
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                                }`}
                        >
                            {gettingLocation ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></span>
                                    Locating...
                                </>
                            ) : location ? (
                                <>
                                    <span>📍</span> Location Secured ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})
                                </>
                            ) : (
                                <>
                                    <span>📍</span> Use Current Location
                                </>
                            )}
                        </button>
                    </div>

                    <button
                        type="submit"
                        className="w-full py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition-all shadow-lg shadow-emerald-500/20 mt-4 disabled:opacity-50"
                        disabled={loading}
                    >
                        {loading ? 'Creating business...' : 'Create & Launch →'}
                    </button>

                    <p className="text-center text-slate-500 text-[10px] mt-6 leading-relaxed">
                        By signing up, you agree to our Terms of Service.<br />
                        Try completely FREE for 15 days — then just ₹600/month.
                    </p>
                </form>
            </div>
        </div>
    );
}

export default SignupPage;
