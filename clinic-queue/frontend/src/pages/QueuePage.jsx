import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { getQueue } from '../services/api';
import { useUserAuth } from '../context/UserAuthContext';
import apiClient from '../services/axiosConfig';

function QueuePage() {
  const { businessId } = useParams();
  const { user, login } = useUserAuth(); // access user to check subscription
  const [queueData, setQueueData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [utr, setUtr] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Premium Check — business owners & superadmin always bypass
  const isBusinessOwner = (() => {
    const adminToken = localStorage.getItem('adminToken');
    const userToken = localStorage.getItem('userToken') || localStorage.getItem('token');
    const tokenToCheck = adminToken || userToken;
    if (!tokenToCheck) return false;
    try {
      const payload = JSON.parse(atob(tokenToCheck.split('.')[1]));
      return payload.isSuperAdmin === true || payload.businessId === businessId;
    } catch { return false; }
  })();
  const isPremium = isBusinessOwner || user?.subscription?.status === 'premium';

  const abortControllerRef = useRef(null);

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
      if (err.response) {
        setError(err.response.data?.error || 'Failed to load queue. Please refresh.');
      } else if (err.request) {
        setError('Cannot connect to server. Please make sure the backend is running on port 5000.');
      } else {
        setError('An unexpected error occurred. Please refresh.');
      }
      console.error('Error fetching queue:', err);
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  // Helper to load script
  const loadScript = (src) => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleRazorpaySubscription = async () => {
    setSubmittingPayment(true);
    try {
      // 1. Load SDK
      const res = await loadScript('https://checkout.razorpay.com/v1/checkout.js');
      if (!res) {
        alert('Razorpay SDK failed to load. Are you online?');
        setSubmittingPayment(false);
        return;
      }

      // 2. Create Subscription on Backend
      const { data } = await apiClient.post('/payments/create-subscription', {
        userId: user._id
      });

      if (!data.success) {
        alert('Failed to create subscription. New Error.');
        setSubmittingPayment(false);
        return;
      }

      // 3. Open Razorpay Checkout
      const options = {
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: "QueueGo Premium",
        description: "Monthly Premium Subscription",
        handler: async function (response) {
          try {
            // 4. Verify Payment on Backend
            await apiClient.post('/payments/verify-subscription', {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id
            });

            alert('Subscription Activated Successfully!');
            window.location.reload();

          } catch (err) {
            console.error(err);
            alert('Payment verification failed. Please contact support.');
          }
        },
        prefill: {
          name: user.displayName || user.name,
          email: user.email,
          contact: user.phone || ""
        },
        theme: {
          color: "#10B981"
        },
        modal: {
          ondismiss: function () {
            setSubmittingPayment(false);
          }
        }
      };

      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response) {
        alert(response.error.description);
        setSubmittingPayment(false);
      });
      rzp1.open();

    } catch (err) {
      console.error(err);
      alert('Something went wrong. Please try again.');
      setSubmittingPayment(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(() => {
      fetchQueue();
    }, 3000);

    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchQueue]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-slate-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto p-4 rounded-lg bg-red-900/20 border border-red-900/40 text-center">
        <div className="text-red-300 font-medium mb-3">{error}</div>
        <button className="px-4 py-2 rounded bg-red-900/40 hover:bg-red-900/60 text-red-100 text-sm transition-colors" onClick={fetchQueue}>
          Retry
        </button>
      </div>
    );
  }

  if (!queueData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-slate-500">Initializing queue...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4 p-4 md:p-8 min-h-screen bg-slate-900 text-slate-200">
      <div className="grid lg:grid-cols-3 gap-6 flex-grow mt-4">
        {/* Now Serving Section - Takes 1 column */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-xl p-8 md:p-12 text-center bg-slate-800 border border-slate-700 h-full flex flex-col justify-center">
            {queueData.nowServing ? (
              <div>
                <span className="inline-block px-3 py-1 rounded bg-emerald-900/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-8">
                  Now Serving
                </span>
                <div className="text-8xl md:text-9xl font-bold text-white mb-6 tracking-tighter leading-none">
                  <span className="text-emerald-500 text-6xl align-top mr-2">#</span>{queueData.nowServing.queueNumber}
                </div>
                <div className="text-2xl font-semibold text-slate-200 mb-2">
                  {queueData.nowServing.patientName}
                </div>
                <div className="text-slate-500 text-sm">
                  Please proceed to Room 1
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8">
                <span className="inline-block px-3 py-1 rounded bg-slate-700 text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">
                  Status
                </span>
                <div className="text-6xl text-slate-700 font-bold mb-4">—</div>
                <div className="text-slate-500">No active patients</div>
              </div>
            )}
          </div>
        </div>

        {/* Waiting List Section - Takes 1 column */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-[600px] lg:h-auto overflow-hidden lg:col-span-1 relative">

          {/* PREMIUM GATE OVERLAY */}
          {!isPremium && (
            <div className="absolute inset-0 z-10 backdrop-blur-md bg-slate-900/60 flex flex-col items-center justify-center text-center p-6">
              <div className="bg-slate-800 p-6 rounded-2xl border border-emerald-500/30 shadow-2xl max-w-sm">
                <div className="text-4xl mb-4">👑</div>
                <h3 className="text-xl font-bold text-white mb-2">Premium Feature</h3>
                <p className="text-slate-400 mb-6 text-sm">
                  Subscribe to see exactly who is waiting and their estimated times.
                </p>
                {user ? (
                  <button
                    onClick={() => setShowPayModal(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold hover:shadow-lg hover:shadow-emerald-500/20 transition-all active:scale-95"
                  >
                    Start Free Trial — then ₹199/mo
                  </button>
                ) : (
                  <button
                    onClick={() => window.location.href = `/login?from=/queue/${businessId}`}
                    className="w-full py-3 rounded-xl bg-slate-700 text-white font-bold hover:bg-slate-600 transition-all"
                  >
                    Login to Subscribe
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Waiting Queue
            </h3>
            <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded text-xs font-bold">
              {queueData.waitingList.length}
            </span>
          </div>

          <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar flex-grow bg-slate-900/30">
            {queueData.waitingList.length > 0 ? (
              queueData.waitingList.map((patient, index) => (
                <div
                  key={patient.queueNumber}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-slate-800 border border-slate-700/50 hover:bg-slate-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-700 h-8 w-8 rounded flex items-center justify-center text-slate-400 text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      {/* Obfuscate name if not premium */}
                      <div className="text-slate-200 font-medium text-sm">
                        {isPremium ? patient.patientName : 'Patient #' + patient.queueNumber}
                      </div>
                      <div className="text-xs text-slate-500">
                        booked {Math.floor((new Date() - new Date(patient.createdAt)) / 60000)} mins ago
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                    #{patient.queueNumber}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="text-3xl mb-3 opacity-30">☕</div>
                <p className="text-sm font-medium">No patients waiting</p>
              </div>
            )}
          </div>
        </div>

        {/* On Hold Section - Takes 1 column */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-[600px] lg:h-auto overflow-hidden lg:col-span-1 relative">
          {/* PREMIUM GATE OVERLAY (Simpler version for Hold section) */}
          {!isPremium && (
            <div className="absolute inset-0 z-10 backdrop-blur-sm bg-slate-900/50"></div>
          )}

          <div className="p-5 border-b border-slate-700 flex justify-between items-center bg-slate-800">
            <h3 className="text-base font-bold text-red-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              On Hold
            </h3>
            <span className="bg-red-900/30 text-red-300 px-2 py-1 rounded text-xs font-bold border border-red-900/50">
              {queueData.onHoldList?.length || 0}
            </span>
          </div>

          <div className="overflow-y-auto p-2 space-y-2 custom-scrollbar flex-grow bg-slate-900/30">
            {queueData.onHoldList && queueData.onHoldList.length > 0 ? (
              queueData.onHoldList.map((patient) => (
                <div
                  key={patient._id}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-slate-800 border border-red-900/20 hover:bg-red-900/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-red-900/20 h-8 w-8 rounded flex items-center justify-center text-red-400 text-xs font-bold">
                      ⏸
                    </div>
                    <div>
                      <div className="text-slate-200 font-medium text-sm">
                        {isPremium ? patient.patientName : 'Patient #' + patient.queueNumber}
                      </div>
                      <div className="text-xs text-red-400/70">
                        Please see receptionist
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-red-900/50 group-hover:text-red-400 transition-colors">
                    #{patient.queueNumber}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="text-3xl mb-3 opacity-30">👍</div>
                <p className="text-sm font-medium">No patients on hold</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* PAYMENT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-800 w-full max-w-md rounded-2xl border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-white">Unlock Premium</h3>
                  <p className="text-slate-400 text-sm mt-1">Autopay ₹100 / month</p>
                </div>
                <button
                  onClick={() => setShowPayModal(false)}
                  className="p-1 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* Razorpay Subscription Flow */}
              <div className="flex flex-col gap-4">
                <div className="bg-slate-700/30 p-4 rounded-xl flex items-center gap-3 border border-slate-600/50">
                  <div className="bg-blue-500/20 p-2.5 rounded-lg text-blue-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Recurring Subscription</h4>
                    <p className="text-xs text-slate-400">Cancel anytime via settings.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm font-medium text-slate-300 px-1">
                    <span>Monthly Plan</span>
                    <span>₹100 / mo</span>
                  </div>
                  <div className="h-px bg-slate-700/50"></div>
                  <div className="flex justify-between items-center text-lg font-bold text-white px-1">
                    <span>Total</span>
                    <span>₹100</span>
                  </div>
                </div>

                <button
                  onClick={handleRazorpaySubscription}
                  disabled={submittingPayment}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2 group"
                >
                  {submittingPayment ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <span>Start Subscription</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </>
                  )}
                </button>

                <p className="text-center text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                  Secure Checkout by Razorpay
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default QueuePage;
