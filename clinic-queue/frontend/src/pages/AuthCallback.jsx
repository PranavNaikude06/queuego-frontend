import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function AuthCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    useEffect(() => {
        const token = searchParams.get('token');
        const businessId = searchParams.get('businessId');

        if (token && businessId) {
            localStorage.setItem('adminToken', token);
            navigate(`/admin/${businessId}/control`);
        } else {
            navigate('/');
        }
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center text-white">
            <div className="text-center">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-400">Completing authentication...</p>
            </div>
        </div>
    );
}

export default AuthCallback;
