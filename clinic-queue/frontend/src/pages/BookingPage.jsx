import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { bookAppointment } from '../services/api';
import apiClient from '../services/axiosConfig';

function BookingPage() {
  const { businessId } = useParams();
  const navigate = useNavigate();

  const [businessName, setBusinessName] = useState('');
  const [businessLocation, setBusinessLocation] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const fetchBusiness = async () => {
      try {
        const businessRes = await apiClient.get(`/businesses/${businessId}`);
        setBusinessName(businessRes.data.name);

        if (businessRes.data.location?.coordinates) {
          const [lng, lat] = businessRes.data.location.coordinates;
          setBusinessLocation({ lat, lng });
        }
      } catch (err) {
        console.error('Error fetching details:', err);
      }
    };
    fetchBusiness();
  }, [businessId]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const toRadians = (deg) => deg * (Math.PI / 180);
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    setError('');

    if (!patientName.trim() || !phoneNumber.trim()) {
      setError('Please fill in Name and Phone Number');
      return;
    }

    if (phoneNumber.length !== 10) {
      setError('Phone number must be exactly 10 digits');
      return;
    }

    setLoading(true);

    if (businessLocation) {
      if (!navigator.geolocation) {
        setError('Geolocation is not supported by your browser. Cannot book appointment.');
        setLoading(false);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          const distance = calculateDistance(businessLocation.lat, businessLocation.lng, userLat, userLng);

          if (distance > 100) {
            setError(`You must be within 100 meters of the business to book. You are currently ${Math.round(distance)} meters away.`);
            setLoading(false);
            return;
          }

          await submitBooking();
        },
        (err) => {
          console.error("Geolocation error:", err);
          setError('Failed to get your location. Please grant location permissions to book.');
          setLoading(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      await submitBooking();
    }
  };

  const submitBooking = async () => {
    try {
      const result = await bookAppointment(
        businessId,
        patientName.trim(),
        phoneNumber.trim(),
        null, // No specific serviceId
        email.trim()
      );

      setSuccess(result.appointment);
      setPatientName('');
      setPhoneNumber('');
      setEmail('');
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = !!success;

  return (
    <div className="min-h-screen bg-[#0f1115] relative overflow-hidden font-sans">
      {/* Dynamic Background Effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[100px] mix-blend-screen pointer-events-none"></div>

      <div className="max-w-md mx-auto px-4 py-12 relative z-10 flex flex-col justify-center min-h-screen">

        {/* Header / Business Info */}
        <div className="text-center mb-8">
          <div className="inline-block p-1 rounded-full bg-gradient-to-r from-indigo-500/30 to-emerald-500/30 mb-4 ring-1 ring-white/10">
            <div className="bg-slate-900 rounded-full px-4 py-1.5 flex items-center justify-center">
              <span className="text-xs font-semibold text-slate-300 tracking-wider uppercase">Quick Join</span>
            </div>
          </div>
          {businessName ? (
            <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-100 to-indigo-200 mb-2 drop-shadow-sm">
              {businessName}
            </h1>
          ) : (
            <div className="h-10 bg-slate-800/50 rounded animate-pulse w-3/4 mx-auto mb-2"></div>
          )}
          <p className="text-slate-400 font-medium">Get in line instantly</p>
        </div>

        {/* Action Button: View Live Queue */}
        <div className="mb-6 flex justify-center">
          <Link
            to={`/display/${businessId}`}
            className="group relative inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 hover:border-indigo-500/50 transition-all shadow-lg backdrop-blur-md"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-indigo-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold text-slate-200 group-hover:text-white transition-colors relative">
              View Live Queue
            </span>
            <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-400 transition-colors relative" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl rounded-3xl p-6 md:p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 opacity-50"></div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2">
              <span className="text-red-400 text-lg mt-0.5">⚠️</span>
              <p className="font-medium text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success ? (
            <div className="text-center py-8 animate-in zoom-in duration-300">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/30 relative">
                <div className="absolute inset-0 rounded-full bg-emerald-400 blur-md opacity-20 animate-pulse"></div>
                <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">You're in!</h3>
              <p className="text-slate-400 text-sm mb-8">Your spot in the queue has been secured.</p>

              <div className="bg-slate-950 rounded-2xl p-6 border border-slate-800 shadow-inner inline-block min-w-[240px] relative overflow-hidden group">
                <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500/20 to-emerald-500/20 opacity-0 group-hover:opacity-100 transition-opacity blur"></div>
                <div className="relative">
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">Ticket Number</div>
                  <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 mb-2">
                    #{success.queueNumber}
                  </div>
                  <div className="text-slate-300 font-medium text-lg">
                    {success.patientName}
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <Link
                  to={`/display/${businessId}`}
                  className="block w-full py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-all border border-slate-700"
                >
                  Track Queue Status
                </Link>
                <button
                  onClick={() => setSuccess(null)}
                  className="block w-full py-3 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Book another person
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBooking} className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">Enter Details</h2>
                <p className="text-slate-400 text-xs">Fill in your information to join the queue</p>
              </div>

              <div className="space-y-4">
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="patientName"
                    type="text"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white placeholder:-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Full Name"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none flex-row gap-2">
                    <span className="text-slate-500 text-sm font-medium border-r border-slate-700 pr-2 group-focus-within:text-indigo-400 transition-colors">+91</span>
                  </div>
                  <input
                    id="phoneNumber"
                    type="tel"
                    className="w-full pl-16 pr-4 py-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white placeholder:-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono tracking-wide"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneNumber(value);
                    }}
                    placeholder="Phone Number"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-slate-950/50 border border-slate-800 text-white placeholder:-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email Address (Optional)"
                    disabled={loading}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full relative group overflow-hidden rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100 disabled:hover:bg-indigo-600 mt-2 shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] border border-indigo-500/50"
                disabled={loading || phoneNumber.length !== 10 || !patientName.trim()}
              >
                <div className="relative py-4 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Booking...
                    </>
                  ) : (
                    <>
                      Confirm Booking
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </>
                  )}
                </div>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default BookingPage;
