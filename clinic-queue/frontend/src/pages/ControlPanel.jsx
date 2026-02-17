import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import apiClient from '../services/axiosConfig';
import { getQueue, moveToNext } from '../services/api';

// This function creates a short audio tone.
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
    oscillator.start(audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, audioContext.currentTime + 0.3);
    oscillator.stop(audioContext.currentTime + 0.3);
  } catch (e) {
    console.warn('Could not play notification sound.', e);
  }
};

function ControlPanel() {
  const { businessId } = useParams();
  const [queueData, setQueueData] = useState(null);
  const [businessName, setBusinessName] = useState('Queue Controls');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('queue');
  const [services, setServices] = useState([]);
  const [serviceForm, setServiceForm] = useState({ name: '', price: '', duration: '15' });
  const [showQR, setShowQR] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [qrData, setQrData] = useState(null);
  const abortControllerRef = useRef(null);
  const waitingListCountRef = useRef(null);
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmName, setConfirmName] = useState('');

  // Settings State
  const [settingsForm, setSettingsForm] = useState({ name: '', address: '' });
  const [location, setLocation] = useState(null);
  const [locating, setLocating] = useState(false);


  const fetchServices = useCallback(async () => {
    try {
      const response = await apiClient.get(`/${businessId}/appointments/services`);
      setServices(response.data);
    } catch (err) {
      console.error('Error fetching services:', err);
    }
  }, [businessId]);

  useEffect(() => {
    if (activeTab === 'services') fetchServices();
  }, [activeTab, fetchServices]);

  const handleUpdateLocation = async () => {
    setLocating(true);
    try {
      const { Geolocation } = await import('@capacitor/geolocation');

      // Check/Request permissions
      const permission = await Geolocation.checkPermissions();
      if (permission.location === 'denied') {
        const requestResult = await Geolocation.requestPermissions();
        if (requestResult.location === 'denied') {
          alert('Location permission denied. Please enable it in device settings.');
          setLocating(false);
          return;
        }
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000 // 10 second timeout
      });

      setLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude
      });

      // Suggest address update
      try {
        const { reverseGeocode } = await import('../services/geocoding');
        const address = await reverseGeocode(position.coords.latitude, position.coords.longitude);
        if (address && !settingsForm.address) {
          setSettingsForm(prev => ({ ...prev, address: address }));
        }
      } catch (geocodeErr) {
        console.warn('Geocoding failed:', geocodeErr);
      }
    } catch (err) {
      console.error(err);
      const msg = err.message?.includes('timeout')
        ? 'Location request timed out. Please check if your GPS is on and try again.'
        : 'Unable to retrieve location. Please make sure location services are enabled.';
      alert(msg);
    } finally {
      setLocating(false);
    }
  };

  const handleSaveSettings = async () => {
    setProcessing(true);
    setError('');
    try {
      await apiClient.patch(`/businesses/${businessId}`, {
        name: settingsForm.name,
        address: settingsForm.address,
        location: location
      });
      setBusinessName(settingsForm.name);
      alert('Settings updated successfully!');
    } catch (err) {
      console.error(err);
      setError('Failed to update settings');
    } finally {
      setProcessing(false);
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await apiClient.post(`/${businessId}/appointments/services`, serviceForm);
      setServiceForm({ name: '', price: '', duration: '15' });
      await fetchServices();
    } catch (err) {
      setError('Failed to add service');
    } finally {
      setProcessing(false);
    }
  };

  const toggleServiceStatus = async (serviceId, currentStatus) => {
    setProcessing(true);
    try {
      await apiClient.patch(`/${businessId}/appointments/services/${serviceId}`, { isActive: !currentStatus });
      await fetchServices();
    } catch (err) {
      setError('Failed to update service');
    } finally {
      setProcessing(false);
    }
  };

  const fetchQueue = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const data = await getQueue(businessId, abortControllerRef.current.signal);
      setQueueData(data);
      setError('');
    } catch (err) {
      if (err.name === 'AbortError' || err.name === 'CanceledError') return;
      console.error('Error fetching queue:', err);
    }
  }, [businessId]);

  // Initial Load
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);

        // Verify admin has access to this business
        const token = localStorage.getItem('adminToken');
        if (!token) {
          navigate(`/admin/${businessId}/login`);
          return;
        }

        // Decode JWT to check businessId
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          if (payload.businessId !== businessId) {
            setError('You are not authorized to access this business');
            setTimeout(() => navigate('/explore'), 2000);
            return;
          }
        } catch (e) {
          console.error('Token decode error:', e);
          localStorage.removeItem('adminToken');
          navigate(`/admin/${businessId}/login`);
          return;
        }

        // Parallel fetch for queue and business details
        const [qData, bData] = await Promise.all([
          getQueue(businessId),
          apiClient.get(`/businesses/${businessId}`).then(res => res.data).catch(() => ({ name: 'Queue Controls' }))
        ]);
        setQueueData(qData);
        setBusinessName(bData.name);

        // Populate Settings Form
        setSettingsForm({
          name: bData.name || '',
          address: bData.address || ''
        });
        if (bData.location) {
          setLocation(bData.location);
        }

      } catch (err) {
        setError('Failed to load initial data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [businessId, navigate]);

  useEffect(() => {
    const interval = setInterval(fetchQueue, 1000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchQueue]);

  // Effect to play sound when a new patient joins the queue
  useEffect(() => {
    if (!queueData) return;
    const currentCount = (queueData.waitingList?.length || 0);
    if (waitingListCountRef.current === null) {
      waitingListCountRef.current = currentCount;
      return;
    }
    if (currentCount > waitingListCountRef.current) {
      playNotificationSound();
    }
    waitingListCountRef.current = currentCount;
  }, [queueData]);

  const advanceQueue = async () => {
    setProcessing(true);
    setError('');
    try {
      await moveToNext(businessId);
      await fetchQueue();
    } catch (err) {
      if (err.response) {
        setError(err.response.data?.error || 'Failed to move to next patient.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
      console.error('Error advancing queue:', err);
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsDone = async () => {
    await advanceQueue();
  };

  const handleHoldPatient = async () => {
    if (!queueData?.nowServing) return;
    try {
      await apiClient.patch(`/${businessId}/appointments/${queueData.nowServing._id}/status`, {
        status: 'on-hold'
      });
      init();
    } catch (err) {
      setError('Failed to hold patient');
    }
  };

  const handleRecallFromHold = async (patientId) => {
    try {
      await apiClient.patch(`/${businessId}/appointments/${patientId}/status`, {
        status: 'waiting'
      });
      init();
    } catch (err) {
      setError('Failed to recall patient');
    }
  };

  const handleShowQR = async () => {
    try {
      const response = await apiClient.get(`/${businessId}/appointments/qr`);
      setQrCode(response.data.qrCode);
      setQrData(response.data); // Keep original qrData for download link
      setShowQR(true);
    } catch (err) {
      setError('Failed to load QR code');
    }
  };

  const handleDeleteBusiness = async () => {
    if (confirmSlug !== businessData.slug) {
      setError('Business slug does not match.');
      return;
    }

    setIsDeleting(true);
    try {
      await apiClient.delete(`/businesses/${businessId}`);
      alert('Business deleted successfully.');
      navigate('/explore');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete business.');
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-200 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6 relative">
        {/* QR Code Modal */}
        {showQR && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-800 rounded-3xl p-8 max-w-sm w-full border border-slate-700 shadow-2xl scale-in-center">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Your Business QR</h3>
                <button onClick={() => setShowQR(false)} className="text-slate-400 hover:text-white p-2">✕</button>
              </div>
              <div className="bg-white p-6 rounded-2xl mb-6 shadow-inner">
                {qrData && <img src={qrData.qrCode} alt="Business QR Code" className="w-full" />}
              </div>
              <p className="text-slate-400 text-sm text-center mb-6 px-4">
                Patients can scan this to join your queue instantly.
              </p>
              <div className="flex flex-col gap-3">
                <a
                  href={qrData?.qrCode}
                  download={`queue-qr-${businessId}.png`}
                  className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-center transition-all"
                >
                  Download PNG
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrData?.url);
                    alert('Link copied!');
                  }}
                  className="w-full py-4 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all"
                >
                  Copy Join Link
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header with Back Button */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors border border-slate-700 text-slate-400 hover:text-white">
              <span className="sr-only">Home</span>
              ←
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">{businessName}</h1>
              <p className="text-slate-500 text-sm">Flow Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <button
              onClick={handleShowQR}
              className="flex-1 md:flex-none py-2.5 px-4 rounded-lg bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600/20 hover:text-indigo-300 font-bold text-sm transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
              Show QR
            </button>
            <div className="px-3 py-2.5 bg-emerald-900/20 text-emerald-500 text-xs font-bold border border-emerald-900/30 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-900/20 border border-red-900/40 text-red-300 text-sm flex items-start gap-3">
            <span>⚠️</span>
            {error}
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-700 mb-6">
          <button
            onClick={() => setActiveTab('queue')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'queue' ? 'text-indigo-400 border-indigo-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
          >
            Queue Management
          </button>
          <button
            onClick={() => setActiveTab('services')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'services' ? 'text-indigo-400 border-indigo-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
          >
            Service Catalog
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-bold text-sm transition-all border-b-2 ${activeTab === 'settings' ? 'text-indigo-400 border-indigo-400' : 'text-slate-500 border-transparent hover:text-slate-300'}`}
          >
            Settings
          </button>
        </div>

        {activeTab === 'queue' ? (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Active Patient Card */}
              <div className="bg-slate-800 rounded-xl p-8 border border-slate-700">
                <div>
                  <span className="inline-block px-2 py-1 rounded bg-slate-700 text-slate-400 text-xs font-bold uppercase tracking-wider mb-4">
                    Current Patient
                  </span>
                  <div className="text-5xl font-bold text-white tracking-tight mb-2">
                    {queueData?.nowServing ? `#${queueData.nowServing.queueNumber}` : '—'}
                  </div>
                  {queueData?.nowServing ? (
                    <div className="text-lg text-indigo-400 font-medium">
                      {queueData.nowServing.patientName}
                    </div>
                  ) : (
                    <div className="text-slate-500 italic font-medium">No active appointment</div>
                  )}
                </div>
              </div>

              {/* Action Card */}
              <div className="flex flex-col gap-4">
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700 flex items-center justify-between">
                  <div>
                    <div className="text-slate-400 text-xs uppercase font-bold mb-1">Waiting</div>
                    <div className="text-3xl font-bold text-white">{queueData?.waitingList?.length || 0}</div>
                  </div>
                  <div className="h-10 w-10 rounded bg-slate-700 flex items-center justify-center text-slate-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                </div>

                {queueData?.nowServing ? (
                  <div className="flex gap-4">
                    <button
                      className="flex-1 py-4 rounded-xl font-bold text-lg transition-colors bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-50"
                      onClick={handleMarkAsDone}
                      disabled={processing}
                    >
                      ✓ Done
                    </button>
                    <button
                      className="flex-1 py-4 rounded-xl font-bold text-lg transition-colors bg-red-600 hover:bg-red-500 text-white disabled:opacity-50"
                      onClick={handleHoldPatient}
                      disabled={processing}
                    >
                      ✗ Hold
                    </button>
                  </div>
                ) : (
                  <button
                    className="w-full py-5 rounded-xl font-bold text-lg transition-all bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                    onClick={advanceQueue}
                    disabled={processing || queueData?.waitingList?.length === 0}
                  >
                    Call Next Patient →
                  </button>
                )}
              </div>
            </div>

            {/* On Hold List */}
            {queueData?.onHoldList?.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-bold text-red-400 mb-3 ml-1 uppercase tracking-wider">On Hold Patients</h3>
                <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                  <div className="divide-y divide-slate-700">
                    {queueData.onHoldList.map((patient) => (
                      <div key={patient._id} className="p-4 flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-500 font-mono text-xs w-4">
                            <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                          </span>
                          <div>
                            <div className="text-red-300 font-medium text-sm">{patient.patientName}</div>
                            <div className="text-xs text-slate-500"># {patient.queueNumber}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRecallFromHold(patient._id)}
                          className="px-3 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-100 text-xs font-bold border border-red-900/50 transition-colors"
                        >
                          Re-Call
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}


            {/* Waiting List Preview */}
            <div className="mt-6">
              <h3 className="text-sm font-bold text-slate-400 mb-3 ml-1 uppercase tracking-wider">Up Next</h3>
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                {queueData && queueData.waitingList.length > 0 ? (
                  <div className="divide-y divide-slate-700">
                    {queueData.waitingList.slice(0, 5).map((patient, index) => (
                      <div key={patient.queueNumber} className="p-4 flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-500 font-mono text-xs w-4">{index + 1}</span>
                          <span className="text-slate-300 font-medium text-sm">{patient.patientName}</span>
                        </div>
                        <span className="px-2 py-1 rounded bg-slate-900 text-slate-400 text-xs font-bold border border-slate-700">#{patient.queueNumber}</span>
                      </div>
                    ))}
                    {queueData.waitingList.length > 5 && (
                      <div className="p-3 text-center text-slate-500 text-xs bg-slate-800">
                        +{queueData.waitingList.length - 5} more patients
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 text-sm">
                    No upcoming patients
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === 'services' ? (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-1">
              {/* ... (existing service form) */}
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700 sticky top-6">
                <h3 className="font-bold text-white mb-6 flex items-center gap-2">
                  <span className="p-1.5 rounded bg-emerald-500/10 text-emerald-500">✚</span>
                  Add New Service
                </h3>
                <form onSubmit={handleAddService} className="space-y-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Name</label>
                    <input
                      type="text"
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                      value={serviceForm.name}
                      onChange={e => setServiceForm({ ...serviceForm, name: e.target.value })}
                      placeholder="e.g. Haircut"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Price (₹)</label>
                      <input
                        type="number"
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                        value={serviceForm.price}
                        onChange={e => setServiceForm({ ...serviceForm, price: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Duration (min)</label>
                      <input
                        type="number"
                        required
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                        value={serviceForm.duration}
                        onChange={e => setServiceForm({ ...serviceForm, duration: e.target.value })}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/10" disabled={processing}>
                    {processing ? 'Saving...' : 'Save Service'}
                  </button>
                </form>
              </div>
            </div>

            <div className="md:col-span-2 space-y-4">
              {services.map(s => (
                <div key={s._id} className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex justify-between items-center group">
                  <div>
                    <div className="font-bold text-white text-lg">{s.name}</div>
                    <div className="flex gap-4 text-xs text-slate-500 mt-1">
                      <span>₹{s.price}</span>
                      <span>•</span>
                      <span>{s.duration} mins</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => toggleServiceStatus(s._id, s.isActive)}
                      className={`px-3 py-1 my-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${s.isActive ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-400 border border-slate-600'}`}
                      disabled={processing}
                    >
                      {s.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </div>
                </div>
              ))}
              {services.length === 0 && (
                <div className="p-12 text-center bg-slate-800/20 rounded-3xl border border-dashed border-slate-700">
                  <p className="text-slate-500">No services defined yet.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-2xl space-y-8">
            {/* General Settings Card */}
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-6 md:p-8">
              <h3 className="font-bold text-white mb-6 flex items-center gap-2 text-lg">
                <span className="p-1.5 rounded bg-indigo-500/10 text-indigo-500">⚙️</span>
                Business Details
              </h3>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Business Name</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors"
                    value={settingsForm.name}
                    onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                    placeholder="e.g. Acme Clinic"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Business Address</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-indigo-500 outline-none transition-colors"
                    value={settingsForm.address}
                    onChange={(e) => setSettingsForm({ ...settingsForm, address: e.target.value })}
                    placeholder="e.g. 123 Main St, Mumbai"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 mb-2 block">GPS Location</label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-slate-400 text-sm flex items-center gap-2">
                      <span>📍</span>
                      {location ? (
                        <span>{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</span>
                      ) : (
                        <span className="italic opacity-50">No location set</span>
                      )}
                    </div>
                    <button
                      onClick={handleUpdateLocation}
                      disabled={locating}
                      className="px-4 py-3 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 font-bold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      {locating ? (
                        <>
                          <span className="w-4 h-4 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin"></span>
                          Locating...
                        </>
                      ) : (
                        'Update GPS'
                      )}
                    </button>
                  </div>
                  <p className="text-slate-500 text-xs mt-2">
                    Click "Update GPS" while at your business location to allow customers to find you by distance.
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-700">
                  <button
                    onClick={handleSaveSettings}
                    disabled={processing}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-2"
                  >
                    {processing ? 'Saving Changes...' : 'Save Settings'}
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-2xl border border-red-900/30 overflow-hidden">
              <div className="p-6 bg-red-900/10 border-b border-red-900/20">
                <h3 className="text-red-400 font-bold flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Danger Zone
                </h3>
              </div>
              <div className="p-8 space-y-6">
                <div>
                  <h4 className="text-white font-bold mb-2">Delete this business</h4>
                  <p className="text-slate-400 text-sm">
                    Once you delete a business, there is no going back. All appointments, services, and staff accounts will be permanently removed.
                  </p>
                </div>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="px-6 py-3 bg-red-600/10 border border-red-500/20 text-red-500 hover:bg-red-600/20 font-bold rounded-xl transition-all"
                  >
                    Delete Business...
                  </button>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                    <div className="p-4 bg-slate-900 rounded-xl border border-slate-700">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        Type <span className="text-white font-mono">"{businessName}"</span> to confirm
                      </label>
                      <input
                        type="text"
                        className="w-full bg-slate-800 border border-slate-600 rounded-lg px-4 py-2 text-white outline-none focus:border-red-500 transition-colors"
                        value={confirmName}
                        onChange={(e) => setConfirmName(e.target.value)}
                        placeholder="Business name"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDeleteBusiness}
                        disabled={confirmName !== businessName || processing}
                        className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all disabled:opacity-50 disabled:grayscale"
                      >
                        {processing ? 'Deleting...' : 'Permanently Delete'}
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setConfirmName('');
                        }}
                        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ControlPanel;