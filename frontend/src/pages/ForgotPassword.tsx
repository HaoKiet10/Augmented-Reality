import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Send } from 'lucide-react';
import { z } from 'zod';
import { API_URL } from '../config';
import { RATE_LIMIT_MESSAGE } from '../context/AuthContext';
import { AuthCard } from '../components/AuthCard';
import { Spinner } from '../components/ui';

const emailSchema = z.email('Invalid email address');

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.status === 429) throw new Error(RATE_LIMIT_MESSAGE);
      if (!response.ok) throw new Error('Something went wrong. Please try again.');

      // Backend luôn trả cùng một kết quả dù email có tồn tại hay không — UI cũng
      // không được phép tiết lộ khác biệt đó.
      setSent(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (sent) {
    return (
      <AuthCard title="Check your email" subtitle="If an account exists for that address, we've sent a reset link. It expires in 1 hour.">
        <Link to="/login" className="block text-center text-accent-ink hover:text-white font-medium transition-colors">
          Back to Sign In
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Forgot password?" subtitle="Enter your email and we'll send you a reset link">
      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Email Address</label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Mail size={18} />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field pl-10"
              placeholder="you@example.com"
            />
          </div>
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
              <Send size={18} />
              <span>Send reset link</span>
            </>
          )}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-gray-400">
        Remembered it?{' '}
        <Link to="/login" className="text-accent-ink hover:text-white font-medium transition-colors">
          Sign In
        </Link>
      </p>
    </AuthCard>
  );
};
