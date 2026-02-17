import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { useUserAuth } from '../context/UserAuthContext';
import { bookAppointment } from '../services/api';
import apiClient from '../services/axiosConfig';

function BookingPage() {
  const { businessId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useUserAuth();

  const [step, setStep] = useState('select-service'); // 'select-service', 'details', 'verify-phone'
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [patientName, setPatientName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (user) {
      setPatientName(user.displayName || user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || ''); // Pre-fill phone if available
    }
  }, [user]);

  useEffect(() => {
    // Fetch services for this business
    const fetchServices = async () => {
      try {
        const response = await apiClient.get(`/${businessId}/appointments/services`);
        setServices(response.data);
      } catch (err) {
        console.error('Error fetching services:', err);
      }
    };
    fetchServices();
  }, [businessId]);

  const handleSendOTP = async (e) => {
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
    try {
      // Send OTP via backend
      await apiClient.post('/auth/send-otp', {
        phoneNumber: `+91${phoneNumber}`, // Assuming India for now, or format based on input
        // email: email // Optional: send to email too if provided?
      });

      setStep('verify-phone');
    } catch (err) {
      console.error('Send OTP error:', err);
      setError(err.response?.data?.error || 'Failed to send verification code.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndBook = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 1. Verify OTP
      await apiClient.post('/auth/verify-otp', {
        phoneNumber: `+91${phoneNumber}`,
        otp
      });

      // 2. Proceed with Booking
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
      setOtp('');
      setStep('select-service'); // Reset for next booking (or keep on success screen)
    } catch (err) {
      console.error('Verification/Booking error:', err);
      setError(err.response?.data?.error || 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isSuccess = !!success;

  return (
    <div className="max-w-4xl mx-auto px-4 relative pt-10">
      {/* Persistent Back Button to Directory */}
      <Link
        to="/explore"
        className="absolute top-0 left-4 flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium group"
      >
        <span className="group-hover:-translate-x-1 transition-transform">←</span> Back to Directory
      </Link>

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
                  if (!user) {
                    // Start guest booking flow (or login redirect if mandatory)
                    // For now, allow guest booking with OTP
                    setStep('details');
                  } else {
                    setStep('details');
                  }
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
                {isSuccess ? 'Booking Confirmed' : step === 'verify-phone' ? 'Verify Phone' : 'Enter Details'}
              </h2>
              <p className="text-slate-400 text-sm mt-0.5">
                {selectedService ? `For ${selectedService.name}` : ''}
              </p>
            </div>
            {!isSuccess && (
              <button
                onClick={() => {
                  if (step === 'verify-phone') setStep('details');
                  else setStep('select-service');
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
            ) : step === 'verify-phone' ? (
              <form onSubmit={handleVerifyAndBook} className="space-y-6">
                <div className="text-center mb-4">
                  <p className="text-slate-300 text-sm">
                    Enter the code sent to <span className="font-bold text-white">+91 {phoneNumber}</span>
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">SMS Code</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className="w-full bg-slate-900/50 border border-slate-700 px-5 py-3.5 rounded-2xl text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all font-bold text-center text-2xl tracking-[0.5em]"
                    placeholder="000000"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    required
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify & Book →'}
                </button>

                <button
                  type="button"
                  onClick={handleSendOTP}
                  disabled={loading}
                  className="w-full text-center text-sm text-indigo-400 hover:text-indigo-300 mt-2"
                >
                  Resend Code
                </button>
              </form>
            ) : (
              <form onSubmit={handleSendOTP} className="space-y-5">
                {(!user || !patientName) && (
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
                )}

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

                {(!user || !email) && (
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
                )}

                <button
                  type="submit"
                  className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-lg transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/20 disabled:opacity-50 mt-4"
                  disabled={loading || phoneNumber.length !== 10 || !patientName.trim()}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      Sending Code...
                    </span>
                  ) : (
                    'Get OTP →'
                  )}
                </button>
                <div className="text-center">
                  <p className="text-xs text-slate-500 mt-2">
                    Verify your number to confirm booking.
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
