import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { bookAppointment } from '../services/api';
import apiClient from '../services/axiosConfig';

function BookingPage() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [step, setStep] = useState('select-service'); // 'select-service', 'details'
  const [services, setServices] = useState([]);
  const [businessName, setBusinessName] = useState('');
  const [businessLocation, setBusinessLocation] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    // Fetch services for this business and business name
    const fetchServices = async () => {
      try {
        const [servicesRes, businessRes] = await Promise.all([
          apiClient.get(`/${businessId}/appointments/services`),
          apiClient.get(`/businesses/${businessId}`) // Assuming this route exists to get business details
        ]);
        setServices(servicesRes.data);
        setBusinessName(businessRes.data.name);

        // Ensure we load the business location parameters
        if (businessRes.data.location?.coordinates) {
          const [lng, lat] = businessRes.data.location.coordinates;
          setBusinessLocation({ lat, lng });
        }
      } catch (err) {
        console.error('Error fetching details:', err);
      }
    };
    fetchServices();
  }, [businessId]);

  // Haversine formula to calculate distance in meters between two lat/lng coordinates
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const toRadians = (deg) => deg * (Math.PI / 180);
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in meters
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

    // Geofencing Check
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

          // If within distance, proceed with booking
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
      // Business hasn't set location, allow booking directly
      console.warn('Business location not set. Bypassing geofencing.');
      await submitBooking();
    }
  };

  const submitBooking = async () => {
    try {
      const result = await bookAppointment(
        businessId,
        patientName.trim(),
        phoneNumber.trim(),
        selectedService._id,
        email.trim()
      );

      setSuccess(result.appointment);
      setPatientName('');
      setPhoneNumber('');
      setEmail('');
      setStep('select-service');
    } catch (err) {
      console.error('Booking error:', err);
      setError(err.response?.data?.error || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = !!success;

  return (
    <div className="max-w-4xl mx-auto px-4 relative pt-10 min-h-screen">
      {businessName && (
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-indigo-500">{businessName}</h1>
        </div>
      )}

      {step === 'select-service' && !isSuccess ? (
        <>
          <div className="mb-10 text-center md:text-left">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-bold mb-4">
              ✨ Schedule faster with one pick
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Select your service</h2>
            <p className="text-slate-400 max-w-2xl">
              Choose what you need today. Our team is ready to provide you with exceptional care.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {services.map((service) => (
              <button
                key={service._id}
                onClick={() => {
                  setSelectedService(service);
                  setStep('details');
                }}
                className="group bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-indigo-500/50 p-6 rounded-2xl transition-all text-left flex justify-between items-center"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold text-lg">{service.name}</span>
                    {service.isPopular && (
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        Popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="bg-slate-700/50 px-2 py-0.5 rounded text-indigo-400">{service.category || 'General'}</span>
                    <span>{service.duration} min</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-white font-bold text-xl mb-1">₹{service.price}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                    Click to select
                  </div>
                </div>
              </button>
            ))}

            {services.length === 0 && (
              <div className="col-span-2 py-12 text-center bg-slate-800/20 rounded-2xl border border-dashed border-slate-700">
                <p className="text-slate-500">No services available at the moment.</p>
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="max-w-lg mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h2 className="text-xl font-bold text-white">
                {isSuccess ? 'Booking Confirmed' : 'Enter Details'}
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                {selectedService ? `For ${selectedService.name}` : ''}
              </p>
            </div>
            {!isSuccess && (
              <button
                onClick={() => {
                  setStep('select-service');
                  setError('');
                }}
                className="text-slate-500 hover:text-slate-300 text-sm font-bold flex items-center gap-2 transition-colors"
              >
                ← Back
              </button>
            )}
          </div>

          <div className="bg-slate-800 rounded-xl p-8 border border-slate-700 shadow-sm">
            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-900/30 text-red-300 text-sm flex items-start gap-3 border border-red-900/50">
                <span className="text-lg">⚠️</span>
                <div className="font-medium mt-0.5">{error}</div>
              </div>
            )}

            {success ? (
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl border border-emerald-900/50 text-emerald-500">
                  ✓
                </div>
                <h3 className="text-white text-lg font-bold mb-2">Booking Confirmed</h3>
                <p className="text-slate-400 mb-8 text-sm">You are in the queue.</p>

                <div className="bg-slate-900 rounded-xl p-6 border border-slate-700 mb-4 inline-block min-w-[200px]">
                  <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-2">Your Ticket</div>
                  <div className="text-5xl font-bold text-emerald-400 mb-3 tracking-tighter">#{success.queueNumber}</div>
                  <div className="text-slate-300 font-medium">
                    {success.patientName}
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-4">
                  <button
                    onClick={() => {
                      setSuccess(null);
                      setStep('select-service');
                    }}
                    className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition-colors"
                  >
                    Book another patient
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleBooking} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-400 ml-1" htmlFor="patientName">
                    Full Name
                  </label>
                  <input
                    id="patientName"
                    type="text"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. John Doe"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-400 ml-1" htmlFor="phoneNumber">
                    Phone Number
                  </label>
                  <input
                    id="phoneNumber"
                    type="tel"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    value={phoneNumber}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhoneNumber(value);
                    }}
                    placeholder="e.g. 9999999999"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-400 ml-1" htmlFor="email">
                    Email Address (Optional)
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-slate-700 text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@example.com"
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-emerald-600/20 disabled:opacity-50 mt-4"
                  disabled={loading || phoneNumber.length !== 10 || !patientName.trim()}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      Booking...
                    </span>
                  ) : (
                    'Confirm Booking ✓'
                  )}
                </button>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mt-2">
                    Enter your phone number to confirm your booking.
                  </p>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default BookingPage;
