import { db } from '../config/database.js';
import { logPerformance, logError } from './logger.js';

// In-memory cache implementation with TTL support
class MemoryCache {
    constructor() {
        this.cache = new Map();
        this.timers = new Map();
        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
            flushes: 0
        };
    }

    // Set a value with optional TTL (time to live) in seconds
    set(key, value, ttlSeconds = 3600) {
        try {
            // Clear existing timer if key exists
            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
                this.timers.delete(key);
            }

            // Store the value with metadata
            const cacheEntry = {
                value: value,
                createdAt: Date.now(),
                ttl: ttlSeconds,
                accessed: 0
            };

            this.cache.set(key, cacheEntry);
            this.stats.sets++;

            // Set TTL timer if specified
            if (ttlSeconds > 0) {
                const timer = setTimeout(() => {
                    this.delete(key);
                }, ttlSeconds * 1000);
                
                this.timers.set(key, timer);
            }

            logPerformance('cache_set', 0, { key: key.substring(0, 50), ttl: ttlSeconds });
            return true;
        } catch (error) {
            logError(error, { operation: 'cache_set', key });
            return false;
        }
    }

    // Get a value from cache
    get(key) {
        try {
            if (!this.cache.has(key)) {
                this.stats.misses++;
                logPerformance('cache_miss', 0, { key: key.substring(0, 50) });
                return null;
            }

            const entry = this.cache.get(key);
            entry.accessed++;
            this.stats.hits++;

            logPerformance('cache_hit', 0, { 
                key: key.substring(0, 50),
                age: Date.now() - entry.createdAt,
                accessed: entry.accessed
            });

            return entry.value;
        } catch (error) {
            logError(error, { operation: 'cache_get', key });
            return null;
        }
    }

    // Delete a specific key
    delete(key) {
        try {
            if (this.cache.has(key)) {
                this.cache.delete(key);
                this.stats.deletes++;
            }

            if (this.timers.has(key)) {
                clearTimeout(this.timers.get(key));
                this.timers.delete(key);
            }

            return true;
        } catch (error) {
            logError(error, { operation: 'cache_delete', key });
            return false;
        }
    }

    // Check if key exists
    has(key) {
        return this.cache.has(key);
    }

    // Clear all cache entries
    flush() {
        try {
            // Clear all timers
            this.timers.forEach(timer => clearTimeout(timer));
            this.timers.clear();
            
            // Clear cache
            this.cache.clear();
            this.stats.flushes++;
            
            logPerformance('cache_flush', 0, { cleared: true });
            return true;
        } catch (error) {
            logError(error, { operation: 'cache_flush' });
            return false;
        }
    }

    // Get cache statistics
    getStats() {
        const hitRate = this.stats.hits + this.stats.misses > 0 
            ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
            : 0;

        return {
            ...this.stats,
            size: this.cache.size,
            hitRate: `${hitRate}%`,
            memoryUsage: this.getMemoryUsage()
        };
    }

    // Estimate memory usage (rough calculation)
    getMemoryUsage() {
        let size = 0;
        this.cache.forEach((entry, key) => {
            size += key.length * 2; // UTF-16 characters
            size += JSON.stringify(entry.value).length * 2;
            size += 100; // Metadata overhead estimate
        });
        return `${(size / 1024).toFixed(2)} KB`;
    }

    // Clean expired entries (manual cleanup)
    cleanup() {
        let cleaned = 0;
        const now = Date.now();
        
        this.cache.forEach((entry, key) => {
            const age = (now - entry.createdAt) / 1000;
            if (entry.ttl > 0 && age > entry.ttl) {
                this.delete(key);
                cleaned++;
            }
        });
        
        logPerformance('cache_cleanup', 0, { entriesRemoved: cleaned });
        return cleaned;
    }
}

// Create global cache instance
const cache = new MemoryCache();

// Cache key generators for different data types
export const cacheKeys = {
    // Medicine cache keys
    medicine: (id) => `medicine:${id}`,
    medicinesByCategory: (category, page = 1) => `medicines:category:${category}:page:${page}`,
    medicineSearch: (query, category = '', page = 1) => `medicines:search:${query}:${category}:page:${page}`,
    medicineCategories: () => 'medicines:categories',
    medicineForms: () => 'medicines:forms',

    // Doctor cache keys
    doctor: (id) => `doctor:${id}`,
    doctorsByLocation: (lat, lng, radius, page = 1) => `doctors:location:${lat}:${lng}:${radius}:page:${page}`,
    doctorsBySpecialty: (specialty, page = 1) => `doctors:specialty:${specialty}:page:${page}`,
    doctorSpecialties: () => 'doctors:specialties',

    // User cache keys
    user: (id) => `user:${id}`,
    userAddresses: (userId) => `user:${userId}:addresses`,
    userOrders: (userId, status = '', page = 1) => `user:${userId}:orders:${status}:page:${page}`,

    // Order cache keys
    order: (id) => `order:${id}`,
    ordersByStatus: (status, page = 1) => `orders:status:${status}:page:${page}`,

    // Geocoding cache keys
    geocodeForward: (query) => `geocode:forward:${encodeURIComponent(query)}`,
    geocodeReverse: (lat, lng) => `geocode:reverse:${lat}:${lng}`,

    // Service area cache keys
    serviceAreas: () => 'service:areas',
    serviceAreaByPostal: (postalCode) => `service:area:postal:${postalCode}`,

    // Statistics cache keys
    dashboardStats: (userId = 'admin') => `stats:dashboard:${userId}`,
    popularMedicines: (days = 30) => `stats:medicines:popular:${days}days`,
    orderStats: (period = 'month') => `stats:orders:${period}`
};

// Healthcare-specific caching functions
export const medicineCache = {
    // Cache single medicine
    set: (id, medicineData, ttl = 3600) => {
        return cache.set(cacheKeys.medicine(id), medicineData, ttl);
    },

    get: (id) => {
        return cache.get(cacheKeys.medicine(id));
    },

    // Cache medicine search results
    setSearch: (query, category, page, results, ttl = 1800) => {
        return cache.set(cacheKeys.medicineSearch(query, category, page), results, ttl);
    },

    getSearch: (query, category = '', page = 1) => {
        return cache.get(cacheKeys.medicineSearch(query, category, page));
    },

    // Cache categories
    setCategories: (categories, ttl = 7200) => {
        return cache.set(cacheKeys.medicineCategories(), categories, ttl);
    },

    getCategories: () => {
        return cache.get(cacheKeys.medicineCategories());
    },

    // Invalidate medicine-related cache
    invalidate: (id = null) => {
        if (id) {
            cache.delete(cacheKeys.medicine(id));
        }
        // Clear search and category caches
        cache.delete(cacheKeys.medicineCategories());
        // Pattern-based deletion would require more complex implementation
    }
};

export const doctorCache = {
    // Cache single doctor
    set: (id, doctorData, ttl = 3600) => {
        return cache.set(cacheKeys.doctor(id), doctorData, ttl);
    },

    get: (id) => {
        return cache.get(cacheKeys.doctor(id));
    },

    // Cache doctors by location
    setByLocation: (lat, lng, radius, page, results, ttl = 1800) => {
        return cache.set(cacheKeys.doctorsByLocation(lat, lng, radius, page), results, ttl);
    },

    getByLocation: (lat, lng, radius, page = 1) => {
        return cache.get(cacheKeys.doctorsByLocation(lat, lng, radius, page));
    },

    // Cache doctors by specialty
    setBySpecialty: (specialty, page, results, ttl = 3600) => {
        return cache.set(cacheKeys.doctorsBySpecialty(specialty, page), results, ttl);
    },

    getBySpecialty: (specialty, page = 1) => {
        return cache.get(cacheKeys.doctorsBySpecialty(specialty, page));
    },

    // Cache specialties
    setSpecialties: (specialties, ttl = 7200) => {
        return cache.set(cacheKeys.doctorSpecialties(), specialties, ttl);
    },

    getSpecialties: () => {
        return cache.get(cacheKeys.doctorSpecialties());
    }
};

export const userCache = {
    // Cache user data (without sensitive info)
    set: (id, userData, ttl = 1800) => {
        // Remove sensitive fields before caching
        const safeUserData = { ...userData };
        delete safeUserData.password;
        return cache.set(cacheKeys.user(id), safeUserData, ttl);
    },

    get: (id) => {
        return cache.get(cacheKeys.user(id));
    },

    // Cache user addresses
    setAddresses: (userId, addresses, ttl = 3600) => {
        return cache.set(cacheKeys.userAddresses(userId), addresses, ttl);
    },

    getAddresses: (userId) => {
        return cache.get(cacheKeys.userAddresses(userId));
    },

    // Cache user orders
    setOrders: (userId, status, page, orders, ttl = 1800) => {
        return cache.set(cacheKeys.userOrders(userId, status, page), orders, ttl);
    },

    getOrders: (userId, status = '', page = 1) => {
        return cache.get(cacheKeys.userOrders(userId, status, page));
    },

    // Invalidate user cache
    invalidate: (userId) => {
        cache.delete(cacheKeys.user(userId));
        cache.delete(cacheKeys.userAddresses(userId));
        // Clear user orders cache would require pattern matching
    }
};

export const geocodingCache = {
    // Cache forward geocoding results
    setForward: (query, results, ttl = 86400) => { // 24 hours
        return cache.set(cacheKeys.geocodeForward(query), results, ttl);
    },

    getForward: (query) => {
        return cache.get(cacheKeys.geocodeForward(query));
    },

    // Cache reverse geocoding results
    setReverse: (lat, lng, results, ttl = 86400) => {
        return cache.set(cacheKeys.geocodeReverse(lat, lng), results, ttl);
    },

    getReverse: (lat, lng) => {
        return cache.get(cacheKeys.geocodeReverse(lat, lng));
    }
};

export const statsCache = {
    // Cache dashboard statistics
    setDashboard: (userId, stats, ttl = 900) => { // 15 minutes
        return cache.set(cacheKeys.dashboardStats(userId), stats, ttl);
    },

    getDashboard: (userId = 'admin') => {
        return cache.get(cacheKeys.dashboardStats(userId));
    },

    // Cache popular medicines
    setPopularMedicines: (days, medicines, ttl = 3600) => {
        return cache.set(cacheKeys.popularMedicines(days), medicines, ttl);
    },

    getPopularMedicines: (days = 30) => {
        return cache.get(cacheKeys.popularMedicines(days));
    }
};

// Cache middleware for Express routes
export const cacheMiddleware = (keyGenerator, ttl = 3600) => {
    return (req, res, next) => {
        const cacheKey = typeof keyGenerator === 'function' 
            ? keyGenerator(req) 
            : keyGenerator;
        
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
            logPerformance('cache_middleware_hit', 0, { 
                endpoint: req.originalUrl,
                key: cacheKey.substring(0, 50)
            });
            
            return res.json({
                ...cachedData,
                _cached: true,
                _cache_key: process.env.NODE_ENV === 'development' ? cacheKey : undefined
            });
        }

        // Store original res.json to intercept response
        const originalJson = res.json;
        res.json = function(data) {
            // Cache successful responses only
            if (res.statusCode >= 200 && res.statusCode < 300) {
                cache.set(cacheKey, data, ttl);
                
                logPerformance('cache_middleware_set', 0, { 
                    endpoint: req.originalUrl,
                    key: cacheKey.substring(0, 50),
                    ttl
                });
            }
            
            // Call original json method
            return originalJson.call(this, data);
        };

        next();
    };
};

// Cache warming functions (preload commonly accessed data)
export const warmCache = {
    // Warm medicine categories
    medicines: async () => {
        try {
            // Use direct database query instead of import to avoid circular dependency
            const [categories] = await db.execute(
                'SELECT DISTINCT category FROM medicines WHERE is_active = 1 ORDER BY category'
            );
            const categoryList = categories.map(row => row.category);
            
            medicineCache.setCategories(categoryList, 7200);
            
            logPerformance('cache_warm_medicines', 0, { 
                categories: categoryList.length 
            });
        } catch (error) {
            logError(error, { operation: 'cache_warm_medicines' });
        }
    },


    // Warm popular medicines
    popularMedicines: async () => {
        try {
            // This would require a query to get popular medicines
            // Implementation depends on your business logic
            logPerformance('cache_warm_popular', 0, { status: 'todo' });
        } catch (error) {
            logError(error, { operation: 'cache_warm_popular' });
        }
    }
};

// Cache cleanup scheduler
export const scheduleCacheCleanup = (intervalMinutes = 30) => {
    setInterval(() => {
        const cleaned = cache.cleanup();
        logPerformance('cache_scheduled_cleanup', 0, { 
            entriesRemoved: cleaned,
            cacheSize: cache.cache.size
        });
    }, intervalMinutes * 60 * 1000);
    
    console.log(`📋 Cache cleanup scheduled every ${intervalMinutes} minutes`);
};

// Main cache instance export
export { cache };

// Default export
export default cache;
