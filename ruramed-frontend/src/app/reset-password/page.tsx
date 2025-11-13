'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, Check, X, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { authService } from '@/services/auth.service';
import toast from 'react-hot-toast';

function ResetPasswordContent() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Check verification status and time remaining
  useEffect(() => {
    const verified = sessionStorage.getItem('password_reset_verified');
    const identifier = sessionStorage.getItem('reset_identifier');
    const otp = sessionStorage.getItem('reset_otp');
    const verifiedAt = sessionStorage.getItem('reset_verified_at');

    // Debug log
    console.log('Reset Password - Session Check:', {
      verified,
      identifier,
      otp: otp ? 'present' : 'missing',
      verifiedAt,
    });

    if (!verified || !identifier || !otp || !verifiedAt) {
      setVerificationError('Please complete OTP verification first');
      return;
    }

    // Check and update time remaining every second
    const interval = setInterval(() => {
      const timePassed = Date.now() - parseInt(verifiedAt);
      const thirtyMinutes = 30 * 60 * 1000;
      const remaining = thirtyMinutes - timePassed;

      if (remaining <= 0) {
        setVerificationError('Verification expired. Please restart the process.');
        sessionStorage.clear();
        clearInterval(interval);
      } else {
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        setTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Password validation checks
  const passwordChecks = {
    minLength: formData.newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.newPassword),
    hasLowercase: /[a-z]/.test(formData.newPassword),
    hasNumber: /\d/.test(formData.newPassword),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.newPassword),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Password validation
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (!isPasswordValid) {
      newErrors.newPassword = 'Password does not meet all requirements';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    // Get stored data from sessionStorage
    const identifier = sessionStorage.getItem('reset_identifier');
    const otp = sessionStorage.getItem('reset_otp');
    const verified = sessionStorage.getItem('password_reset_verified');
    const verifiedAt = sessionStorage.getItem('reset_verified_at');

    if (!identifier || !otp || !verified) {
      toast.error('Invalid session. Please restart the password reset process.');
      router.push('/forgot-password');
      return;
    }

    // Check if 30 minutes have passed
    const timePassed = Date.now() - parseInt(verifiedAt || '0');
    const thirtyMinutes = 30 * 60 * 1000;

    if (timePassed > thirtyMinutes) {
      toast.error('Verification expired. Please restart the password reset process.');
      sessionStorage.clear();
      router.push('/forgot-password');
      return;
    }

    setIsLoading(true);

    try {
      // Send identifier, OTP, and new password
      await authService.resetPassword(identifier, otp, formData.newPassword);

      // Clear session storage
      sessionStorage.removeItem('reset_identifier');
      sessionStorage.removeItem('reset_otp');
      sessionStorage.removeItem('password_reset_verified');
      sessionStorage.removeItem('reset_verified_at');

      setSuccess(true);
      toast.success('Password reset successful!');

      // Redirect to login
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.message || 'Password reset failed. Please try again.';
      toast.error(errorMessage);

      // If OTP expired, redirect to forgot password
      if (errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
        setTimeout(() => {
          sessionStorage.clear();
          router.push('/forgot-password');
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // Show verification error screen
  if (verificationError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
        <div className="max-w-md w-full text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Verification Required</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{verificationError}</p>
          <Link href="/forgot-password" className="btn-primary inline-flex items-center gap-2">
            Go to Forgot Password
          </Link>
        </div>
      </div>
    );
  }

  // Show success screen
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4">
        <div className="max-w-md w-full text-center bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Password Reset Successful!</h2>
          <p className="text-slate-600 dark:text-slate-400 mb-6">
            Your password has been reset successfully. Redirecting to login...
          </p>
          <Link href="/login" className="btn-primary inline-flex items-center gap-2">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">Create New Password</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Enter your new password below
          </p>
        </div>

        {/* Time Remaining Display */}
        {timeRemaining && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center justify-center gap-2">
            <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Time remaining: <span className="font-bold">{timeRemaining}</span>
            </p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-8 space-y-6 bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl">
          <div className="space-y-4">
            {/* New Password Field */}
            <div>
              <label htmlFor="newPassword" className="label">
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={handleChange}
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                  className={`input-field pl-10 pr-10 ${errors.newPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              {(passwordFocused || formData.newPassword) && (
                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Password must contain:
                  </p>
                  <PasswordRequirement met={passwordChecks.minLength} text="At least 8 characters" />
                  <PasswordRequirement met={passwordChecks.hasUppercase} text="One uppercase letter (A-Z)" />
                  <PasswordRequirement met={passwordChecks.hasLowercase} text="One lowercase letter (a-z)" />
                  <PasswordRequirement met={passwordChecks.hasNumber} text="One number (0-9)" />
                  <PasswordRequirement met={passwordChecks.hasSpecial} text="One special character (!@#$%^&*)" />
                </div>
              )}

              {errors.newPassword && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.newPassword}</p>}
            </div>

            {/* Confirm Password Field */}
            <div>
              <label htmlFor="confirmPassword" className="label">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-field pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}`}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  ) : (
                    <Eye className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Resetting Password...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// Password Requirement Component
function PasswordRequirement({ met, text }: { met: boolean; text: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
      ) : (
        <X className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" />
      )}
      <span className={`text-xs ${met ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
        {text}
      </span>
    </div>
  );
}

// Main component with Suspense boundary
export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 dark:from-slate-900 dark:to-slate-800">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
