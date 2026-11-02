import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, KeyRound } from 'lucide-react';
import { z } from 'zod';
import { API_URL } from '../config';
import { RATE_LIMIT_MESSAGE } from '../context/AuthContext';
import { AuthCard } from '../components/AuthCard';
import { Spinner } from '../components/ui';

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
        <Link to="/forgot-password" className="block text-center text-accent-ink hover:text-white font-medium transition-colors">
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
        <Link to="/login" className="block text-center text-accent-ink hover:text-white font-medium transition-colors">
          Go to Sign In now
        </Link>
      </AuthCard>
    );
  }

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
          <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Lock size={18} />
            </span>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} aria-invalid={!!validationError.newPassword} className="field pl-10" placeholder="••••••••" />
          </div>
          {validationError.newPassword && <p className="mt-1 text-xs text-red-400">{validationError.newPassword}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Lock size={18} />
            </span>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} aria-invalid={!!validationError.confirmPassword} className="field pl-10" placeholder="••••••••" />
          </div>
          {validationError.confirmPassword && <p className="mt-1 text-xs text-red-400">{validationError.confirmPassword}</p>}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full py-3 px-4"
        >
          {isSubmitting ? (
            <Spinner size="sm" tone="on-accent" />
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
