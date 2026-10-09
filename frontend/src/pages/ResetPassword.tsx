import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { API_URL } from '../config';
import { RATE_LIMIT_MESSAGE } from '../context/AuthContext';
import { AuthCard } from '../components/AuthCard';

const resetSchema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password is too long'),
    confirmPassword: z.string().nonempty('Confirm password is required'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [validationError, setValidationError] = useState<{ newPassword?: string; confirmPassword?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!token) {
    return (
      <AuthCard title="Invalid link" subtitle="This reset link is missing its token.">
        <Link to="/forgot-password" className="block text-center text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Request a new link
        </Link>
      </AuthCard>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = resetSchema.safeParse({ newPassword, confirmPassword });
    if (!parsed.success) {
      const errors: typeof validationError = {};
      parsed.error.issues.forEach((issue) => {
        errors[issue.path[0] as keyof typeof validationError] = issue.message;
      });
      setValidationError(errors);
      return;
    }
    setValidationError({});

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });

      if (response.status === 429) throw new Error(RATE_LIMIT_MESSAGE);

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(data.message) ? data.message[0] : data.message;
        throw new Error(message || 'Reset failed. The link may have expired.');
      }

      setDone(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (done) {
    return (
      <AuthCard title="Password updated" subtitle="You've been signed out everywhere. Redirecting to Sign In…">
        <Link to="/login" className="block text-center text-blue-400 hover:text-blue-300 font-medium transition-colors">
          Go to Sign In now
        </Link>
      </AuthCard>
    );
  }

  const inputClass = (hasError?: string) =>
    `w-full pl-10 pr-4 py-3 bg-[#15171e] border ${
      hasError ? 'border-red-500/50' : 'border-white/8'
    } text-white rounded-lg placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all duration-200`;

  return (
    <AuthCard title="Set a new password" subtitle="Choose a password you haven't used before">
      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {error}{' '}
          <Link to="/forgot-password" className="underline">
            Request a new link
          </Link>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">New Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Lock size={18} />
            </span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass(validationError.newPassword)} placeholder="••••••••" />
          </div>
          {validationError.newPassword && <p className="mt-1 text-xs text-red-400">{validationError.newPassword}</p>}
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Confirm Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Lock size={18} />
            </span>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={inputClass(validationError.confirmPassword)} placeholder="••••••••" />
          </div>
          {validationError.confirmPassword && <p className="mt-1 text-xs text-red-400">{validationError.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
        >
          {isSubmitting ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <KeyRound size={18} />
              <span>Reset password</span>
            </>
          )}
        </button>
      </form>
    </AuthCard>
  );
};
