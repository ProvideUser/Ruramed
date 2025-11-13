'use client';

import { useState, useRef, useEffect, useCallback, KeyboardEvent } from 'react';
import { X, Loader2 } from 'lucide-react';

interface OTPModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  email: string;
  isLoading: boolean;
}

export default function OTPModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  onResend, 
  email,
  isLoading 
}: OTPModalProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false); // NEW: Track if already submitted
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setOtp(['', '', '', '', '', '']);
      setHasSubmitted(false);
      
      // Disable body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Focus first input
      setTimeout(() => inputRefs.current[0]?.focus(), 100);
    } else {
      // Re-enable body scroll when modal is closed
      document.body.style.overflow = 'unset';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Auto-submit when all 6 digits are filled - FIXED with useCallback and hasSubmitted flag
  const handleAutoSubmit = useCallback(async () => {
    const otpString = otp.join('');
    if (otpString.length === 6 && !isLoading && !hasSubmitted) {
      setHasSubmitted(true); // Prevent multiple submissions
      try {
        await onSubmit(otpString);
      } catch (error) {
        // Reset on error to allow retry
        setHasSubmitted(false);
      }
    }
  }, [otp, isLoading, hasSubmitted, onSubmit]);

  useEffect(() => {
    handleAutoSubmit();
  }, [otp]); // Only depend on otp, not the function

  const handleChange = (index: number, value: string) => {
    // Only allow numbers
    if (value && !/^\d$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Move to next input if value is entered
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (otp[index]) {
        // Clear current input
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
        setHasSubmitted(false); // Allow resubmit after editing
      } else if (index > 0) {
        // Move to previous input if current is empty
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        setHasSubmitted(false); // Allow resubmit after editing
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('');
    while (newOtp.length < 6) newOtp.push('');
    setOtp(newOtp);
    setHasSubmitted(false); // Allow submission after paste

    // Focus last filled input
    const lastIndex = Math.min(pastedData.length - 1, 5);
    inputRefs.current[lastIndex]?.focus();
  };

  const handleResend = async () => {
    setIsResending(true);
    try {
      await onResend();
      setOtp(['', '', '', '', '', '']);
      setHasSubmitted(false); // Reset submission flag
      inputRefs.current[0]?.focus();
    } finally {
      setIsResending(false);
    }
  };

  const handleClose = () => {
    if (!isLoading) {
      setOtp(['', '', '', '', '', '']);
      setHasSubmitted(false);
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the backdrop itself, not its children
    if (e.target === e.currentTarget && !isLoading) {
      // DO NOT close on backdrop click - user must use X button
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="otp-modal-title"
    >
      {/* Backdrop - blocks all interaction */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in zoom-in-95 duration-200 z-10">
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading}
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full mb-4">
            <svg className="w-8 h-8 text-primary-600 dark:text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 id="otp-modal-title" className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Enter OTP
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            We've sent a 6-digit code to<br />
            <span className="font-medium text-slate-900 dark:text-white">{email}</span>
          </p>
        </div>

        {/* OTP Inputs */}
        <div className="flex gap-3 justify-center mb-6" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              disabled={isLoading}
              className={`
                w-12 h-14 text-center text-2xl font-bold rounded-xl
                border-2 transition-all duration-200
                ${digit 
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-900 dark:text-primary-100' 
                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white'
                }
                focus:border-primary-500 focus:ring-4 focus:ring-primary-100 dark:focus:ring-primary-900/30
                focus:outline-none
                disabled:opacity-50 disabled:cursor-not-allowed
                hover:border-primary-400 dark:hover:border-primary-500
              `}
              autoComplete="off"
              aria-label={`OTP digit ${index + 1}`}
            />
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center gap-2 text-primary-600 dark:text-primary-400 mb-4">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span className="text-sm font-medium">Verifying OTP...</span>
          </div>
        )}

        {/* Resend Button */}
        <div className="text-center">
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || isLoading}
            className="text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResending ? (
              <span className="flex items-center gap-2 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Resending...
              </span>
            ) : (
              'Resend OTP'
            )}
          </button>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
            OTP expires in 10 minutes
          </p>
        </div>
      </div>
    </div>
  );
}
