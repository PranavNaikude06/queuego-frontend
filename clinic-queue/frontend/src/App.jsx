import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useParams, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { UserAuthProvider, useUserAuth } from './context/UserAuthContext';
import BookingPage from './pages/BookingPage';
import QueuePage from './pages/QueuePage';
import ControlPanel from './pages/ControlPanel';
import AdminLogin from './pages/AdminLogin';
import UserLogin from './pages/UserLogin';
import LandingPage from './pages/LandingPage';
import SignupPage from './pages/SignupPage';
import StaffSearchPage from './pages/StaffSearchPage';
import AuthCallback from './pages/AuthCallback';
import VerifyEmail from './pages/VerifyEmail';

// Profile Dropdown Component
function ProfileDropdown() {
  const { user, logout } = useUserAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getFirstName = () => {
    if (user?.displayName) return user.displayName.split(' ')[0];
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getInitials = () => {
    if (user?.displayName) {
      const names = user.displayName.split(' ');
      return names.length > 1 ? `${names[0][0]}${names[1][0]}`.toUpperCase() : names[0][0].toUpperCase();
    }
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const handleLogout = async () => {
    setShowDropdown(false);
    await logout();
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) {
    return (
      <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium py-2 px-4 border border-slate-700 rounded-full hover:border-slate-500 transition-colors">
        Login
      </Link>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setShowDropdown(!showDropdown)} className="flex items-center gap-2 py-1.5 px-2 rounded-full hover:bg-slate-800/50 transition-colors">
        <span className="text-slate-400 text-sm hidden sm:block">
          {getGreeting()}, <span className="text-white font-medium">{getFirstName()}</span>
        </span>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-slate-600 overflow-hidden">
          {user.photoURL ? <img src={user.photoURL} alt="" className="w-full h-full object-cover" /> : <span>{getInitials()}</span>}
        </div>
      </button>
      {showDropdown && (
        <div className="absolute right-0 top-11 w-48 bg-slate-800 rounded-xl border border-slate-700 shadow-2xl overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-slate-700 bg-slate-900/50">
            <p className="text-white font-medium text-sm truncate">{user.displayName || 'User'}</p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
          </div>
          <div className="py-1">
            <Link to="/staff-search" onClick={() => setShowDropdown(false)} className="block px-3 py-2 text-slate-300 hover:bg-slate-700 text-sm">Staff Login</Link>
            <Link to="/signup" onClick={() => setShowDropdown(false)} className="block px-3 py-2 text-slate-300 hover:bg-slate-700 text-sm">For Business</Link>
          </div>
          <div className="border-t border-slate-700">
            <button onClick={handleLogout} className="w-full text-left px-3 py-2 text-red-400 hover:bg-red-500/10 text-sm">Logout</button>
          </div>
        </div>
      )}
    </div>
  );
}

function LandingPageLayout({ children }) {
  return (
    <div className="min-h-screen text-slate-200 selection:bg-indigo-500/30 selection:text-indigo-200 pt-[env(safe-area-inset-top)]">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between mb-10">
          <div className="flex items-center gap-4">
            <img src="/logo.svg" alt="QueueGo Logo" className="h-16 w-auto object-contain" />
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight">QueueGo</h1>
              <p className="text-slate-500 text-sm font-medium">Professional Queue Management</p>
            </div>
          </div>
          <ProfileDropdown />
        </header>
        {children}
        <footer className="mt-16 text-center text-slate-600 text-sm border-t border-slate-800 pt-8">
          <p>@ QueueGo 2026</p>
        </footer>
      </div>
    </div>
  );
}

function AdminProtectedRoute({ children }) {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    const { businessId } = useParams();
    return <Navigate to={`/admin/${businessId}/login`} replace />;
  }
  return children;
}

function UserProtectedRoute({ children }) {
  const { user, loading } = useUserAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children ? children : <Outlet />;
}

function SessionManager() {
  const location = useLocation();

  useEffect(() => {
    // If not on admin pages, clear the session
    if (!location.pathname.includes('/admin/')) {
      localStorage.removeItem('adminToken');
    }
  }, [location]);

  return null;
}

// Removed TenantLayout completely as we want isolated web app instances

function BackButtonHandler() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const backListener = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      // If we are at the home page or login page, exit the app
      if (location.pathname === '/' || location.pathname === '/login') {
        CapacitorApp.exitApp();
      } else {
        // Otherwise, navigate back
        navigate(-1);
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, [location, navigate]);

  return null;
}

function DeepLinkHandler() {
  const navigate = useNavigate();

  useEffect(() => {
    const linkListener = CapacitorApp.addListener('appUrlOpen', data => {
      console.log('App opened with URL:', data.url);
      try {
        const url = new URL(data.url);
        if (url.hostname === 'backend-8gmt.onrender.com' && url.pathname.startsWith('/join/')) {
          navigate(url.pathname);
        }
      } catch (e) {
        console.error('Invalid deep link:', e);
      }
    });

    return () => {
      linkListener.then(l => l.remove());
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <UserAuthProvider>
      <Router>
        <DeepLinkHandler />
        <BackButtonHandler />
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<UserLogin />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/staff-search" element={<StaffSearchPage />} />
          <Route path="/auth-callback" element={<AuthCallback />} />

          {/* Protected Consumer Routes */}
          <Route element={<UserProtectedRoute />}>
            <Route path="/" element={<LandingPageLayout><LandingPage /></LandingPageLayout>} />
            <Route path="/signup" element={<LandingPageLayout><SignupPage /></LandingPageLayout>} />
          </Route>

          {/* Standalone Web App Routes for QR (No Global Navigation Layout) */}
          <Route path="/join/:businessId" element={<BookingPage />} />
          <Route path="/display/:businessId" element={<QueuePage />} />

          {/* Admin Routes (Separate Auth) */}
          <Route path="/admin/:businessId">
            <Route path="login" element={<AdminLogin />} />
            <Route
              path="control"
              element={
                <AdminProtectedRoute>
                  <ControlPanel />
                </AdminProtectedRoute>
              }
            />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </UserAuthProvider>
  );
}

export default App;
