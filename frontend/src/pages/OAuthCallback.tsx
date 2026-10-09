import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AuthCard } from '../components/AuthCard';

/** Đích của redirect sau Google OAuth: backend đưa access token qua ?token=...
 * Đọc xong phải xoá token khỏi URL ngay để nó không nằm lại trong lịch sử trình duyệt. */
export const OAuthCallback: React.FC = () => {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  // React.StrictMode chạy effect 2 lần ở dev — chỉ xử lý token một lần.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get('token');
    window.history.replaceState(null, '', window.location.pathname);

    if (!token) {
      setError('Missing sign-in token. Please try again.');
      return;
    }

    loginWithToken(token)
      .then(() => navigate('/dashboard', { replace: true }))
      .catch((err: Error) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <AuthCard title="Sign-in failed">
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{error}</div>
        <Link to="/login" className="block text-center text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Back to Sign In
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Signing you in…">
      <div className="flex justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </AuthCard>
  );
};
