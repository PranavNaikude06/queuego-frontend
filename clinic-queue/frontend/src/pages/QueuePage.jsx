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

              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8">
                <span className="inline-block px-3 py-1 rounded bg-slate-700 text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">
                  Status
                </span>
                <div className="text-6xl text-slate-700 font-bold mb-4">—</div>
                <div className="text-slate-500">No one currently being served</div>
              </div>
            )}
          </div>
        </div>

        {/* Waiting List Section - Takes 1 column */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-[600px] lg:h-auto overflow-hidden lg:col-span-1 relative">



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
              queueData.waitingList.map((person, index) => (
                <div
                  key={person.queueNumber}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-slate-800 border border-slate-700/50 hover:bg-slate-700 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-slate-700 h-8 w-8 rounded flex items-center justify-center text-slate-400 text-xs font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="text-slate-200 font-medium text-sm">
                        {person.patientName}
                      </div>
                      <div className="text-xs text-slate-500">
                        joined {Math.floor((new Date() - new Date(person.createdAt)) / 60000)} mins ago
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-slate-500 group-hover:text-slate-300 transition-colors">
                    #{person.queueNumber}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="text-3xl mb-3 opacity-30">☕</div>
                <p className="text-sm font-medium">No one waiting</p>
              </div>
            )}
          </div>
        </div>

        {/* On Hold Section - Takes 1 column */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 flex flex-col h-[600px] lg:h-auto overflow-hidden lg:col-span-1 relative">


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
              queueData.onHoldList.map((person) => (
                <div
                  key={person._id}
                  className="flex items-center justify-between p-3.5 rounded-lg bg-slate-800 border border-red-900/20 hover:bg-red-900/10 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-red-900/20 h-8 w-8 rounded flex items-center justify-center text-red-400 text-xs font-bold">
                      ⏸
                    </div>
                    <div>
                      <div className="text-slate-200 font-medium text-sm">
                        {person.patientName}
                      </div>
                      <div className="text-xs text-red-400/70">
                        Please check with the counter
                      </div>
                    </div>
                  </div>
                  <div className="text-lg font-bold text-red-900/50 group-hover:text-red-400 transition-colors">
                    #{person.queueNumber}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-600">
                <div className="text-3xl mb-3 opacity-30">👍</div>
                <p className="text-sm font-medium">No one on hold</p>
              </div>
            )}
          </div>
        </div>

      </div>


    </div>
  );
}

export default QueuePage;
