import express from 'express';
import { isAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { testConnection, checkDatabaseHealth } from '../config/database.js';
import { cache } from '../utils/cache.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Basic health check (public)
router.get('/', asyncHandler(async (req, res) => {
    const healthData = {
        status: 'healthy',
        message: 'RuraMed API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime()),
        services: {
            api: 'healthy',
            database: 'checking...',
            cache: 'checking...'
        }
    };

    // Quick database check
    try {
        const dbHealth = await testConnection();
        healthData.services.database = dbHealth.success ? 'healthy' : 'unhealthy';
    } catch (error) {
        healthData.services.database = 'unhealthy';
        healthData.status = 'degraded';
    }

    // Cache check
    try {
        healthData.services.cache = 'healthy';
        healthData.cache_stats = cache.getStats();
    } catch (error) {
        healthData.services.cache = 'unhealthy';
        healthData.status = 'degraded';
    }

    logger.info('Health check requested', {
        endpoint: '/api/health',
        status: healthData.status,
        uptime: healthData.uptime
    });

    const statusCode = healthData.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(healthData);
}));

// Simple status check (public)
router.get('/status', asyncHandler(async (req, res) => {
    res.json({
        status: 'ok',
        message: 'Service is running',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        version: '2.0.0'
    });
}));

// Detailed system health (admin only)
router.get('/system', 
    isAdmin,
    asyncHandler(async (req, res) => {
        const systemHealth = {
            timestamp: new Date().toISOString(),
            system: {
                uptime: process.uptime(),
                memory: process.memoryUsage(),
                cpu_usage: process.cpuUsage(),
                node_version: process.version,
                platform: process.platform,
                arch: process.arch
            },
            services: {},
            performance: {}
        };

        // Database detailed health
        try {
            systemHealth.services.database = await checkDatabaseHealth();
        } catch (error) {
            systemHealth.services.database = {
                status: 'unhealthy',
                error: error.message
            };
        }

        // Cache detailed stats
        try {
            systemHealth.services.cache = {
                status: 'healthy',
                stats: cache.getStats(),
                memory_usage: cache.getMemoryUsage ? cache.getMemoryUsage() : 'unknown'
            };
        } catch (error) {
            systemHealth.services.cache = {
                status: 'unhealthy',
                error: error.message
            };
        }

        res.json(systemHealth);
    })
);

// Database health check (admin only)
router.get('/database', 
    isAdmin,
    asyncHandler(async (req, res) => {
        try {
            const dbHealth = await checkDatabaseHealth();
            res.json({
                timestamp: new Date().toISOString(),
                database: dbHealth
            });
        } catch (error) {
            res.status(503).json({
                timestamp: new Date().toISOString(),
                database: {
                    status: 'unhealthy',
                    error: error.message
                }
            });
        }
    })
);

// Cache health check (admin only)
router.get('/cache', 
    isAdmin,
    asyncHandler(async (req, res) => {
        try {
            const cacheStats = cache.getStats();
            res.json({
                timestamp: new Date().toISOString(),
                cache: {
                    status: 'healthy',
                    stats: cacheStats,
                    memory_usage: cache.getMemoryUsage ? cache.getMemoryUsage() : 'unknown'
                }
            });
        } catch (error) {
            res.status(503).json({
                timestamp: new Date().toISOString(),
                cache: {
                    status: 'unhealthy',
                    error: error.message
                }
            });
        }
    })
);

// Application metrics (admin only)
router.get('/metrics', 
    isAdmin,
    asyncHandler(async (req, res) => {
        const metrics = {
            timestamp: new Date().toISOString(),
            application: {
                uptime_seconds: Math.floor(process.uptime()),
                memory_usage_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
                heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
                external_mb: Math.round(process.memoryUsage().external / 1024 / 1024)
            },
            system: {
                load_average: process.platform !== 'win32' ? require('os').loadavg() : null,
                free_memory_mb: Math.round(require('os').freemem() / 1024 / 1024),
                total_memory_mb: Math.round(require('os').totalmem() / 1024 / 1024),
                cpu_count: require('os').cpus().length
            }
        };

        res.json(metrics);
    })
);

export default router;
