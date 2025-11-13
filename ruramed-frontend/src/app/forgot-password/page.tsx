'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Phone, ArrowLeft, Loader2, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { authService } from '@/services/auth.service';
import { RateLimiter } from '@/utils/rate-limiter';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import toast from 'react-hot-toast';
import OTPModal from '@/components/OTPModal';

// Create rate limiter for forgot password
const forgotPasswordRateLimiter = new RateLimiter({
  maxAttempts: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  blockDurationMs: 60 * 60 * 1000, // 1 hour block
  storageKey: 'rate_limit_forgot_password',
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [error, setError] = useState('');

  // Rate limiter hook
  const {
    isBlocked,
    remainingAttempts,
    retryAfterSeconds,
    attempt,
    mounted: rateLimiterMounted,
  } = useRateLimiter(forgotPasswordRateLimiter, {
    onBlock: (seconds) => {
      toast.error(`Too many attempts. Please wait ${Math.ceil(seconds / 60)} minutes.`, {
        duration: 5000,
      });
    },
  });

  const validateIdentifier = () => {
    if (!identifier.trim()) {
      setError('Email or phone number is required');
      return false;
    }

    // Check if it's email or phone
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanIdentifier = identifier.replace(/\s+/g, '');

    if (!emailRegex.test(identifier) && !phoneRegex.test(cleanIdentifier)) {
      setError('Please enter a valid email or 10-digit phone number');
      return false;
    }

    setError('');
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateIdentifier()) return;

    // Check rate limit
    if (isBlocked) {
      toast.error(`Too many attempts. Please wait ${Math.ceil(retryAfterSeconds / 60)} minutes.`);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await attempt(async () => {
        // Send OTP request
        await authService.forgotPassword(identifier.trim());
        
        // Success - Open OTP modal
        setShowOtpModal(true);
        toast.success('OTP sent to your registered email');
      });
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset OTP. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (otp: string) => {
    try {
        // Verify OTP
        await authService.verifyOTP(identifier.trim(), otp, 'forgot_password');
        
        // ✅ Store identifier AND OTP for password reset
        sessionStorage.setItem('reset_identifier', identifier.trim());
        sessionStorage.setItem('reset_otp', otp);
        sessionStorage.setItem('password_reset_verified', 'true');
        sessionStorage.setItem('reset_verified_at', Date.now().toString());
        
        toast.success('OTP verified successfully! You have 30 minutes to reset your password.');
        setShowOtpModal(false);
        
        // Navigate to reset password page
        router.push('/reset-password');
    } catch (error: any) {
        const errorMessage = error.message || 'Invalid or expired OTP. Please try again.';
        toast.error(errorMessage);
        throw error;
    }
    };

  const handleResendOtp = async () => {
    try {
      await authService.forgotPassword(identifier.trim());
      toast.success('OTP resent successfully');
    } catch (error: any) {
      toast.error('Failed to resend OTP. Please try again.');
      throw error;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIdentifier(e.target.value);
    if (error) setError('');
  };

  // Show loading while rate limiter is mounting
  if (!rateLimiterMounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Header */}
          <div className="text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>

            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-primary-600 dark:text-primary-400" />
              </div>
            </div>

            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Forgot Password?</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Enter your email or phone number and we'll send you an OTP
            </p>
          </div>

          {/* Rate Limit Warning */}
          {isBlocked && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-red-900 dark:text-red-200">Too Many Attempts</h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Please wait {Math.ceil(retryAfterSeconds / 60)} minutes before trying again.
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
            <div>
              <label htmlFor="identifier" className="label">
                Email or Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  {/^[0-9]/.test(identifier) ? (
                    <Phone className="h-5 w-5 text-slate-400" />
                  ) : (
                    <Mail className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  value={identifier}
                  onChange={handleChange}
                  disabled={isBlocked}
                  className={`input-field pl-10 ${error ? 'border-red-500 focus:ring-red-500' : ''} ${
                    isBlocked ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  placeholder="you@example.com or 9876543210"
                  autoComplete="username"
                />
              </div>
              {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                Enter your registered email address or 10-digit phone number
              </p>
            </div>

            <button
              type="submit"
              disabled={isLoading || isBlocked}
              className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Sending OTP...
                </>
              ) : isBlocked ? (
                <>
                  <Clock className="w-5 h-5" />
                  Wait {Math.ceil(retryAfterSeconds / 60)}m
                </>
              ) : (
                <>
                  <Mail className="w-5 h-5" />
                  Send OTP
                </>
              )}
            </button>

            {/* Back to Login */}
            <div className="text-center">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Remember your password? Sign in
              </Link>
            </div>
          </form>

          {/* Help Text */}
          <div className="text-center">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              For security reasons, we don't reveal whether an account exists.
            </p>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      <OTPModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onSubmit={handleOtpSubmit}
        onResend={handleResendOtp}
        email={identifier}
        isLoading={isLoading}
      />
    </>
  );
}
