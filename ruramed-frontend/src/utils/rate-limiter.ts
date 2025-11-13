/**
 * Client-Side Rate Limiter
 * Prevents spam clicks and basic DDoS attacks
 */

interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
  blockDurationMs: number;
  storageKey: string;
}

interface RateLimitData {
  attempts: number;
  firstAttemptTime: number;
  blockedUntil: number | null;
  lastAttemptTime: number;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  /**
   * Check if action is allowed
   */
  canProceed(): { allowed: boolean; reason?: string; retryAfterSeconds?: number } {
    if (typeof window === 'undefined') {
      return { allowed: true };
    }

    const data = this.getData();
    const now = Date.now();

    // Check if currently blocked
    if (data.blockedUntil && now < data.blockedUntil) {
      const retryAfterSeconds = Math.ceil((data.blockedUntil - now) / 1000);
      return {
        allowed: false,
        reason: `Too many attempts. Please wait ${retryAfterSeconds} seconds.`,
        retryAfterSeconds,
      };
    }

    // Reset if window has passed
    if (now - data.firstAttemptTime > this.config.windowMs) {
      this.resetData();
      return { allowed: true };
    }

    // Check if max attempts exceeded
    if (data.attempts >= this.config.maxAttempts) {
      const blockedUntil = now + this.config.blockDurationMs;
      this.blockUser(blockedUntil);
      const retryAfterSeconds = Math.ceil(this.config.blockDurationMs / 1000);
      return {
        allowed: false,
        reason: `Too many attempts. Please wait ${retryAfterSeconds} seconds.`,
        retryAfterSeconds,
      };
    }

    return { allowed: true };
  }

  /**
   * Record an attempt
   */
  recordAttempt(): void {
    if (typeof window === 'undefined') return;

    const data = this.getData();
    const now = Date.now();

    // Reset if window expired
    if (now - data.firstAttemptTime > this.config.windowMs) {
      this.resetData();
      data.attempts = 0;
      data.firstAttemptTime = now;
    }

    data.attempts += 1;
    data.lastAttemptTime = now;

    this.saveData(data);
  }

  /**
   * Reset all data (e.g., after successful action)
   */
  reset(): void {
    this.resetData();
  }

  /**
   * Get remaining attempts
   */
  getRemainingAttempts(): number {
    const data = this.getData();
    const now = Date.now();

    if (now - data.firstAttemptTime > this.config.windowMs) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - data.attempts);
  }

  /**
   * Get time until unblock (in seconds)
   */
  getBlockTimeRemaining(): number {
    const data = this.getData();
    const now = Date.now();

    if (!data.blockedUntil || now >= data.blockedUntil) {
      return 0;
    }

    return Math.ceil((data.blockedUntil - now) / 1000);
  }

  /**
   * Check if currently blocked
   */
  isBlocked(): boolean {
    const data = this.getData();
    const now = Date.now();
    return !!(data.blockedUntil && now < data.blockedUntil);
  }

  // Private methods

  private getData(): RateLimitData {
    try {
      const stored = localStorage.getItem(this.config.storageKey);
      if (!stored) {
        return this.getDefaultData();
      }
      return JSON.parse(stored);
    } catch {
      return this.getDefaultData();
    }
  }

  private saveData(data: RateLimitData): void {
    try {
      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save rate limit data:', error);
    }
  }

  private resetData(): void {
    try {
      localStorage.removeItem(this.config.storageKey);
    } catch (error) {
      console.error('Failed to reset rate limit data:', error);
    }
  }

  private blockUser(blockedUntil: number): void {
    const data = this.getData();
    data.blockedUntil = blockedUntil;
    this.saveData(data);
  }

  private getDefaultData(): RateLimitData {
    return {
      attempts: 0,
      firstAttemptTime: Date.now(),
      blockedUntil: null,
      lastAttemptTime: 0,
    };
  }
}

// Preset configurations
export const RateLimitPresets = {
  LOGIN: {
    maxAttempts: 5,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 5 * 60 * 1000, // 5 minutes
    storageKey: 'rate_limit_login',
  },
  REGISTER: {
    maxAttempts: 3,
    windowMs: 60 * 1000, // 1 minute
    blockDurationMs: 10 * 60 * 1000, // 10 minutes
    storageKey: 'rate_limit_register',
  },
  OTP_REQUEST: {
    maxAttempts: 3,
    windowMs: 5 * 60 * 1000, // 5 minutes
    blockDurationMs: 15 * 60 * 1000, // 15 minutes
    storageKey: 'rate_limit_otp',
  },

  FORGOT_PASSWORD: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
    blockDurationMs: 60 * 60 * 1000, // 1 hour
    storageKey: 'rate_limit_forgot_password',
  },
  RESET_PASSWORD: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
    storageKey: 'rate_limit_reset_password',
  },

};

