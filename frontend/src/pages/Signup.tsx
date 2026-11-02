import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-react';
import { z } from 'zod';
import { GoogleButton } from '../components/GoogleButton';
import { AuthCard } from '../components/AuthCard';
import { Spinner } from '../components/ui';

const signupSchema = z.object({
  name: z.string().nonempty('Full Name is required'),
  email: z.email('Invalid email address').nonempty('Email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string().nonempty('Confirm password is required'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const Signup: React.FC = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateForm = () => {
    const result = signupSchema.safeParse({ name, email, password, confirmPassword });
    if (!result.success) {
      const errors: typeof validationError = {};
      result.error.issues.forEach((issue) => {
        const path = issue.path[0] as keyof typeof validationError;
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
      await signup(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard title="Create Account" subtitle="Join the AR Marketing Platform">
      {error && (
        <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Full Name
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <User size={18} />
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={!!validationError.name}
              className="field pl-10"
              placeholder="John Doe"
            />
          </div>
          {validationError.name && (
            <p className="mt-1 text-xs text-red-400">{validationError.name}</p>
          )}
        </div>

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
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
              <Lock size={18} />
            </span>
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              aria-invalid={!!validationError.confirmPassword}
              className="field pl-10 pr-10"
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {validationError.confirmPassword && (
            <p className="mt-1 text-xs text-red-400">{validationError.confirmPassword}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full mt-6 py-3 px-4"
        >
          {isSubmitting ? (
            <Spinner size="sm" tone="on-accent" />
          ) : (
            <>
              <UserPlus size={18} />
              <span>Register</span>
            </>
          )}
        </button>
      </form>

      <GoogleButton label="Sign up with Google" />

      {/* Footer */}
      <p className="mt-8 text-center text-sm text-gray-400">
        Already have an account?{' '}
        <Link to="/login" className="text-accent-ink hover:text-white font-medium transition-colors">
          Sign In
        </Link>
      </p>
    </AuthCard>
  );
};