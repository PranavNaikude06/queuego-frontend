import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../services/axiosConfig';

function ExplorePage() {
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [userLocation, setUserLocation] = useState(null);
    const [sortByNearest, setSortByNearest] = useState(false);
    const [locating, setLocating] = useState(false);

    useEffect(() => {
        const fetchBusinesses = async () => {
            try {
                const response = await apiClient.get('/businesses');
                setBusinesses(response.data);
            } catch (err) {
                console.error('Error fetching businesses:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchBusinesses();
    }, []);

    // Haversine Formula to calculate distance in km
    const calculateDistance = (lat1, lon1, lat2, lon2) => {
        if (!lat1 || !lon1 || !lat2 || !lon2) return null;

        const R = 6371; // Radius of the earth in km
        const dLat = deg2rad(lat2 - lat1);
        const dLon = deg2rad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const d = R * c; // Distance in km
        return d.toFixed(1);
    };

    const deg2rad = (deg) => {
        return deg * (Math.PI / 180);
    };

    const handleSortByNearest = async () => {
        if (sortByNearest) {
            setSortByNearest(false);
            return;
        }

        setLocating(true);

        try {
            // Import Capacitor Geolocation dynamically
            const { Geolocation } = await import('@capacitor/geolocation');

            // Request permission first
            const permission = await Geolocation.checkPermissions();

            if (permission.location === 'denied') {
                // Try to request permission
                const requestResult = await Geolocation.requestPermissions();
                if (requestResult.location === 'denied') {
                    alert('Location permission denied. Please enable location access in your device settings.');
                    setLocating(false);
                    return;
                }
            }

            // Get current position with options
            const position = await Geolocation.getCurrentPosition({
                enableHighAccuracy: true,
                timeout: 10000 // 10 second timeout
            });

            setUserLocation({
                lat: position.coords.latitude,
                lng: position.coords.longitude
            });
            setSortByNearest(true);
        } catch (error) {
            console.error('Location error:', error);
            // Better error message
            const msg = error.message?.includes('timeout')
                ? 'Location request timed out. Please check if your GPS is on and try again.'
                : 'Unable to retrieve your location. Please make sure location services are enabled.';
            alert(msg);
        } finally {
            setLocating(false);
        }
    };

    const getSortedBusinesses = () => {
        let filtered = businesses.filter(b =>
            b.name.toLowerCase().includes(search.toLowerCase())
        );

        if (sortByNearest && userLocation) {
            return filtered.map(b => {
                const dist = b.location ? calculateDistance(userLocation.lat, userLocation.lng, b.location.lat, b.location.lng) : Infinity;
                return { ...b, distance: dist };
            }).sort((a, b) => {
                // Businesses with location come first, then sorted by distance
                if (a.distance === Infinity && b.distance === Infinity) return 0;
                if (a.distance === Infinity) return 1;
                if (b.distance === Infinity) return -1;
                return a.distance - b.distance;
            });
        }

        return filtered;
    };

    const displayedBusinesses = getSortedBusinesses();

    return (
        <div className="max-w-5xl mx-auto py-12 px-4">
            <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors text-sm font-medium group">
                <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Home
            </Link>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">Explore Services</h2>
                    <p className="text-slate-400">Discover and join queues for businesses near you.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                        onClick={handleSortByNearest}
                        className={`px-4 py-3 rounded-xl border font-bold flex items-center justify-center gap-2 transition-all ${sortByNearest
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white hover:border-slate-500'
                            }`}
                    >
                        {locating ? (
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : sortByNearest ? (
                            '📍 Nearest First'
                        ) : (
                            '📍 Sort by Nearest'
                        )}
                    </button>
                    <div className="relative w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Search businesses..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-12 py-3 text-white focus:outline-none focus:border-indigo-500 transition-all font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-xl">🔍</span>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {displayedBusinesses.map(b => (
                        <Link
                            key={b._id}
                            to={`/join/${b._id}`}
                            className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 transition-all group relative overflow-hidden flex flex-col h-full"
                        >
                            <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 scale-y-0 group-hover:scale-y-100 transition-transform origin-top"></div>
                            <div className="flex justify-between items-start mb-4">
                                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                    🏢
                                </div>
                                {b.distance && b.distance !== Infinity && (
                                    <span className="px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 flex items-center gap-1">
                                        📍 {b.distance} km
                                    </span>
                                )}
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2">{b.name}</h3>
                            {b.address && (
                                <p className="text-slate-400 text-sm mb-1 truncate">
                                    {b.address}
                                </p>
                            )}
                            <p className="text-slate-500 text-xs mb-6 capitalize">{b.slug?.replace(/-/g, ' ')}</p>

                            <div className="mt-auto flex items-center text-indigo-400 text-sm font-bold">
                                View Services & Join →
                            </div>
                        </Link>
                    ))}
                    {displayedBusinesses.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
                            <p className="text-slate-500 text-lg">No businesses found matching "{search}"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default ExplorePage;
