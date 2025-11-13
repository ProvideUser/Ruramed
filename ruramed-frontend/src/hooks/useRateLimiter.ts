'use client';

import { useState, useEffect, useRef } from 'react';
import { RateLimiter } from '@/utils/rate-limiter';

interface UseRateLimiterOptions {
  onBlock?: (retryAfterSeconds: number) => void;
  onUnblock?: () => void;
}

export function useRateLimiter(
  rateLimiter: RateLimiter,
  options: UseRateLimiterOptions = {}
) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState(0);
  const [retryAfterSeconds, setRetryAfterSeconds] = useState(0);
  const [mounted, setMounted] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track previous blocked state to prevent duplicate callbacks
  const prevBlockedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    updateState();

    // Update state every second if blocked
    intervalRef.current = setInterval(() => {
      updateState();
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [rateLimiter]);

  const updateState = () => {
    const blocked = rateLimiter.isBlocked();
    const remaining = rateLimiter.getRemainingAttempts();
    const retryAfter = rateLimiter.getBlockTimeRemaining();

    setIsBlocked(blocked);
    setRemainingAttempts(remaining);
    setRetryAfterSeconds(retryAfter);

    // Only trigger callbacks on state change (not every second)
    if (blocked && !prevBlockedRef.current) {
      // Just became blocked
      options.onBlock?.(retryAfter);
      prevBlockedRef.current = true;
    } else if (!blocked && prevBlockedRef.current) {
      // Just became unblocked
      options.onUnblock?.();
      prevBlockedRef.current = false;
    }
  };

  const attempt = async <T,>(action: () => Promise<T>): Promise<T> => {
    const check = rateLimiter.canProceed();

    if (!check.allowed) {
      throw new Error(check.reason || 'Too many attempts');
    }

    rateLimiter.recordAttempt();
    updateState();

    try {
      const result = await action();
      // Success - reset rate limiter
      rateLimiter.reset();
      updateState();
      return result;
    } catch (error) {
      // Failed attempt - keep counter
      updateState();
      throw error;
    }
  };

  const reset = () => {
    rateLimiter.reset();
    updateState();
  };

  return {
    isBlocked,
    remainingAttempts,
    retryAfterSeconds,
    attempt,
    reset,
    canProceed: () => rateLimiter.canProceed(),
    mounted,
  };
}
