'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, Loader2, AlertTriangle, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { RateLimiter, RateLimitPresets } from '@/utils/rate-limiter';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import toast from 'react-hot-toast';

// Create rate limiter instance
const loginRateLimiter = new RateLimiter(RateLimitPresets.LOGIN);

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, isAuthenticated, _hasHydrated } = useAuthStore();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Rate limiter hook
  const {
    isBlocked,
    remainingAttempts,
    retryAfterSeconds,
    attempt,
    mounted: rateLimiterMounted,
  } = useRateLimiter(loginRateLimiter, {
    onBlock: (seconds) => {
      toast.error(`Too many login attempts. Please wait ${seconds} seconds.`, {
        duration: 5000,
      });
    },
  });

  // Redirect if already authenticated - ONLY AFTER HYDRATION
  useEffect(() => {
    if (_hasHydrated && isAuthenticated) {
      const redirect = searchParams.get('redirect') || '/dashboard';
      router.replace(redirect);
    }
  }, [_hasHydrated, isAuthenticated, router, searchParams]);

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    // Check rate limit
    if (isBlocked) {
      toast.error(`Too many attempts. Please wait ${retryAfterSeconds} seconds.`);
      return;
    }

    try {
      // Use rate limiter wrapper
      await attempt(async () => {
        console.log('🔐 Attempting login...');
        await login(formData.email, formData.password);
        
        // CRITICAL DEBUG: Verify tokens were stored
        const token = localStorage.getItem('jwt_token');
        const sessionId = localStorage.getItem('session_id');
        
        console.log('✅ Login completed:', {
          hasToken: !!token,
          hasSessionId: !!sessionId,
          tokenLength: token?.length || 0,
          sessionIdLength: sessionId?.length || 0,
        });

        if (!token || !sessionId) {
          console.error('❌ CRITICAL: Tokens not stored after login!');
          toast.error('Login succeeded but session not created. Please try again.');
          return;
        }

        toast.success('Login successful!');

        // Redirect to previous page or dashboard
        const redirect = searchParams.get('redirect') || '/dashboard';
        console.log('🔄 Redirecting to:', redirect);
        router.replace(redirect);
      });
    } catch (error: any) {
      console.error('❌ Login failed:', error);
      toast.error(error.response?.data?.message || error.message || 'Login failed. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  // Show loading spinner while hydrating
  if (!_hasHydrated || !rateLimiterMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Don't render login form if already authenticated
  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <img 
                src="/logo.svg" 
                alt="RuraMed Logo" 
                className="w-20 h-20 object-contain drop-shadow-lg rounded-xl"
              />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome Back</h2>
            {/* or "sign up" for register page */}
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Join RuraMed for better healthcare
            </p>
          </div>

        {/* Rate Limit Warning */}
        {isBlocked && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">
                Too Many Attempts
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                Please wait {retryAfterSeconds} seconds before trying again.
              </p>
            </div>
          </div>
        )}

        {/* Attempts Remaining */}
        {!isBlocked && remainingAttempts <= 2 && remainingAttempts > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm text-yellow-700 dark:text-yellow-300">
              {remainingAttempts} {remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="space-y-4">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="label">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isBlocked}
                  className={`input-field pl-10 ${errors.email ? 'border-red-500 focus:ring-red-500' : ''} ${
                    isBlocked ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isBlocked}
                  className={`input-field pl-10 pr-10 ${errors.password ? 'border-red-500 focus:ring-red-500' : ''} ${
                    isBlocked ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isBlocked}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
            </div>
          </div>

          {/* Remember & Forgot */}
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                disabled={isBlocked}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-slate-300 rounded disabled:opacity-50"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isBlocked}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : isBlocked ? (
              <>
                <Clock className="w-5 h-5" />
                Wait {retryAfterSeconds}s
              </>
            ) : (
              'Sign In'
            )}
          </button>

          {/* Sign Up Link */}
          <div className="text-center">
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Don't have an account?{' '}
              <Link href="/register" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                Sign up
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
