import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Eye, EyeOff, UserPlus } from 'lucide-react';
import { z } from 'zod';

const signupSchema = z.object({
  name: z.string().min(1, 'Full Name is required'),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Confirm password is required'),
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

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
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
    <div className="relative min-h-screen flex items-center justify-center bg-[#0d0e12] overflow-hidden font-sans">
      {/* Background Neon Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full filter blur-[100px] animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full filter blur-[100px] animate-pulse delay-700"></div>

      {/* Glassmorphic Card */}
      <div className="relative w-full max-w-md p-8 mx-4 bg-white/3 backdrop-blur-xl border border-white/8 rounded-2xl shadow-2xl transition-all duration-300 hover:border-white/15">
        
        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight text-white bg-clip-text bg-linear-to-r from-blue-400 to-purple-400">
            Create Account
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Join the AR Marketing Platform
          </p>
        </div>

        {error && (
          <div className="p-3 mb-6 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
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
                className={`w-full pl-10 pr-4 py-3 bg-[#15171e] border ${
                  validationError.name ? 'border-red-500/50' : 'border-white/8'
                } text-white rounded-lg placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all duration-200`}
                placeholder="John Doe"
              />
            </div>
            {validationError.name && (
              <p className="mt-1 text-xs text-red-400">{validationError.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
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
                className={`w-full pl-10 pr-4 py-3 bg-[#15171e] border ${
                  validationError.email ? 'border-red-500/50' : 'border-white/8'
                } text-white rounded-lg placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all duration-200`}
                placeholder="you@example.com"
              />
            </div>
            {validationError.email && (
              <p className="mt-1 text-xs text-red-400">{validationError.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
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
                className={`w-full pl-10 pr-10 py-3 bg-[#15171e] border ${
                  validationError.password ? 'border-red-500/50' : 'border-white/8'
                } text-white rounded-lg placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all duration-200`}
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
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
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
                className={`w-full pl-10 pr-10 py-3 bg-[#15171e] border ${
                  validationError.confirmPassword ? 'border-red-500/50' : 'border-white/8'
                } text-white rounded-lg placeholder-gray-500 focus:outline-none focus:border-blue-500/80 focus:ring-1 focus:ring-blue-500/80 transition-all duration-200`}
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
            className="relative w-full flex items-center justify-center gap-2 mt-6 py-3 px-4 bg-linear-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-lg shadow-lg hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all duration-200"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <UserPlus size={18} />
                <span>Register</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
};
