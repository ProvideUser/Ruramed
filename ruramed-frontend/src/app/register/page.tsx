'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Loader2, Check, X, AlertTriangle, Clock } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { locationService } from '@/services/location.service';
import { RateLimiter, RateLimitPresets } from '@/utils/rate-limiter';
import { useRateLimiter } from '@/hooks/useRateLimiter';
import toast from 'react-hot-toast';
import OTPModal from '@/components/OTPModal';
import { useSharedLocation } from '@/components/LocationProvider';

// Create rate limiter instance
const registerRateLimiter = new RateLimiter(RateLimitPresets.REGISTER);

export default function RegisterPage() {
  const router = useRouter();
  const { register, isLoading, setLoading } = useAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    location: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  
  // Use shared location from provider
  const { location: sharedLocation, loading: sharedLocationLoading } = useSharedLocation();

  // Rate limiter hook
  const {
    isBlocked,
    remainingAttempts,
    retryAfterSeconds,
    attempt,
    mounted: rateLimiterMounted,
  } = useRateLimiter(registerRateLimiter, {
    onBlock: (seconds) => {
      toast.error(`Too many registration attempts. Please wait ${seconds} seconds.`, {
        duration: 5000,
      });
    },
  });

  // Password validation checks
  const passwordChecks = {
    minLength: formData.password.length >= 8,
    hasUppercase: /[A-Z]/.test(formData.password),
    hasLowercase: /[a-z]/.test(formData.password),
    hasNumber: /\d/.test(formData.password),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  };

  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  // Auto-fill location from shared provider
  useEffect(() => {
    // Only fill if location field is empty
    if (!formData.location && sharedLocation && !sharedLocationLoading) {
      const locationString = locationService.formatLocation(sharedLocation);
      setFormData(prev => ({ 
        ...prev, 
        location: locationString 
      }));
      console.log(`✅ [Register] Location auto-filled: ${locationString}`);
    }
  }, [sharedLocation, sharedLocationLoading, formData.location]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    } else if (formData.name.trim().length > 100) {
      newErrors.name = 'Name must not exceed 100 characters';
    }

    // Email validation
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone validation
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else {
      const cleanPhone = formData.phone.replace(/\s+/g, '');
      if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
        newErrors.phone = 'Phone must be 10 digits starting with 6-9';
      }
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!isPasswordValid) {
      newErrors.password = 'Password does not meet all requirements';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Location validation (optional but if provided, max 255 chars)
    if (formData.location && formData.location.length > 255) {
      newErrors.location = 'Location must not exceed 255 characters';
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

    // Check rate limit
    if (isBlocked) {
      toast.error(`Too many attempts. Please wait ${retryAfterSeconds} seconds.`);
      return;
    }

    setLoading(true);
    try {
      // Use rate limiter wrapper
      await attempt(async () => {
        // Step 1: Request OTP
        const response = await authService.register({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.replace(/\s+/g, ''),
          password: formData.password,
          location: formData.location.trim() || undefined,
        });

        // Check if OTP verification is required
        if (response.emailVerificationRequired) {
          setShowOtpModal(true);
          toast.success(`OTP sent to ${formData.email}`);
        } else {
          toast.success('Registration successful! Welcome to RuraMed.');
          router.push('/dashboard');
        }
      });
    } catch (error: any) {
      const errorMessage = error.message || error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (otp: string) => {
    try {
      // Step 2: Complete registration with OTP
      await register({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.replace(/\s+/g, ''),
        password: formData.password,
        location: formData.location.trim() || undefined,
        otp: otp,
      });
      setShowOtpModal(false);
      toast.success('Registration successful! Welcome to RuraMed.');
      router.push('/dashboard');
    } catch (error: any) {
      const errorMessage = error.message || error.response?.data?.message || 'OTP verification failed.';
      toast.error(errorMessage);
      throw error; // Re-throw to keep modal open and reset hasSubmitted flag
    }
  };

  const handleResendOtp = async () => {
    try {
      await authService.requestOTP(formData.email);
      toast.success('OTP resent successfully');
    } catch (error: any) {
      toast.error('Failed to resend OTP. Please try again.');
      throw error;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
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
            <div className="flex justify-center mb-4">
              <img 
                src="/logo.svg" 
                alt="RuraMed Logo" 
                className="w-20 h-20 object-contain drop-shadow-lg rounded-xl"
              />
            </div>

            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Welcome Back
            </h2>
            {/* or "sign in" for login page */}
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
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="label">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={formData.name}
                    onChange={handleChange}
                    disabled={isBlocked}
                    className={`input-field pl-10 ${errors.name ? 'border-red-500 focus:ring-red-500' : ''} ${
                      isBlocked ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    placeholder="John Doe"
                  />
                </div>
                {errors.name && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>}
              </div>

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
                {errors.email && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>}
              </div>

              {/* Phone Field */}
              <div>
                <label htmlFor="phone" className="label">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isBlocked}
                    className={`input-field pl-10 ${errors.phone ? 'border-red-500 focus:ring-red-500' : ''} ${
                      isBlocked ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    placeholder="9876543210"
                    maxLength={10}
                  />
                </div>
                {errors.phone && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.phone}</p>}
              </div>

              {/* Location Field (Optional with auto-detect) */}
              <div>
                <label htmlFor="location" className="label">
                  Location (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    {sharedLocationLoading ? (
                      <Loader2 className="h-5 w-5 text-primary-500 animate-spin" />
                    ) : (
                      <MapPin className="h-5 w-5 text-slate-400" />
                    )}
                  </div>
                  <input
                    id="location"
                    name="location"
                    type="text"
                    value={formData.location}
                    onChange={handleChange}
                    disabled={sharedLocationLoading || isBlocked}
                    className={`input-field pl-10 ${errors.location ? 'border-red-500 focus:ring-red-500' : ''} ${
                      sharedLocationLoading || isBlocked ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    placeholder={sharedLocationLoading ? "Detecting your location..." : "City, State"}
                    maxLength={255}
                  />
                </div>
                {errors.location && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.location}</p>}
                {formData.location && !sharedLocationLoading && !isBlocked && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Location detected. You can edit if needed.
                  </p>
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
                    autoComplete="new-password"
                    value={formData.password}
                    onChange={handleChange}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
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
                
                {/* Password Requirements */}
                {(passwordFocused || formData.password) && !isBlocked && (
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
                
                {errors.password && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>}
              </div>

              {/* Confirm Password Field */}
              <div>
                <label htmlFor="confirmPassword" className="label">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-slate-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    disabled={isBlocked}
                    className={`input-field pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''} ${
                      isBlocked ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={isBlocked}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
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
              disabled={isLoading || sharedLocationLoading || isBlocked}
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
                  Wait {retryAfterSeconds}s
                </>
              ) : (
                'Continue'
              )}
            </button>

            {/* Sign In Link */}
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Already have an account?{' '}
                <Link href="/login" className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400">
                  Sign in
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      {/* OTP Modal */}
      <OTPModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onSubmit={handleOtpSubmit}
        onResend={handleResendOtp}
        email={formData.email}
        isLoading={isLoading}
      />
    </>
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
