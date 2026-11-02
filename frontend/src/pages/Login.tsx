import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { z } from 'zod';
import { GoogleButton } from '../components/GoogleButton';
import { AuthCard } from '../components/AuthCard';
import { Spinner } from '../components/ui';

const loginSchema = z.object({
  email: z.email('Invalid email address').nonempty('Email is required'),
  password: z.string().nonempty('Password is required'),
});

export const Login: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  // Backend redirect về /login?error=google_auth_failed khi bước cuối của Google OAuth lỗi.
  const [error, setError] = useState<string | null>(
    searchParams.get('error') === 'google_auth_failed' ? 'Google sign-in failed. Please try again.' : null
  );
  const [validationError, setValidationError] = useState<{ email?: string; password?: string }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as 'email' | 'password';
        errors[path] = issue.message;
      });
      setValidationError(errors);
      return false;
    }
    setValidationError({});
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Welcome Back" subtitle="Sign in to your AR Designer account">
      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Mail size={18} />
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!validationError.email}
              className="field pl-10"
              placeholder="you@example.com"
            />
          </div>
          {validationError.email && (
            <p className="mt-1 text-xs text-red-400">{validationError.email}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Lock size={18} />
            </span>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!validationError.password}
              className="field pl-10 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {validationError.password && (
            <p className="mt-1 text-xs text-red-400">{validationError.password}</p>
          )}
          <div className="mt-2 text-right">
            <Link to="/forgot-password" className="text-xs text-accent-ink hover:text-white transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full py-3 px-4"
        >
          {isSubmitting ? (
            <Spinner size="sm" tone="on-accent" />
          ) : (
            <>
              <LogIn size={18} />
              <span>Sign In</span>
            </>
          )}
        </button>
      </form>

      <GoogleButton />

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-gray-400">
        Don't have an account?{' '}
        <Link to="/signup" className="text-accent-ink hover:text-white font-medium transition-colors">
          Create Account
        </Link>
      </p>
    </AuthCard>
  );
};
