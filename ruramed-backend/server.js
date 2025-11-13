import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Import configuration
import { testConnection } from './config/database.js';

// Import new utilities and middleware
import { logger, logError, requestLoggerMiddleware } from './utils/logger.js';
import { scheduleCacheCleanup, warmCache, cache } from './utils/cache.js';

// Import middleware
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { deviceFingerprint, sessionManager, securityEventLogger } from './middleware/security.js';
import { securityHeaders, requestId } from './middleware/errorHandler.js';

// Import route modules
import authRoutes from './routes/auth.js';
import medicineRoutes from './routes/medicines.js';
import userRoutes from './routes/users.js';
import addressRoutes from './routes/addresses.js';
import deliveryRoutes from './routes/delivery.js';
import doctorRoutes from './routes/doctors.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import geocodingRoutes from './routes/geocoding.js';
import healthRoutes from './routes/health.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize application
const initializeApp = async () => {
    try {
        logger.info('🚀 Initializing RuraMed Server v2.0.0', {
            environment: process.env.NODE_ENV || 'development',
            port: PORT,
            node_version: process.version
        });

        // Test database connection
        logger.info('📊 Testing database connection', {
            host: process.env.DB_HOST,
            database: process.env.DB_DATABASE,
            user: process.env.DB_USER
        });
        
        await testConnection();
        
        // Initialize cache system
        logger.info('💾 Initializing cache system');
        scheduleCacheCleanup(30); // Cleanup every 30 minutes
        
        // Warm up cache with common data
        logger.info('🔥 Warming up cache');
        await warmCache.medicines();
        await warmCache.popularMedicines();
        
        logger.info('✅ Application initialization completed successfully');
        return true;
        
    } catch (error) {
        logError(error, { context: 'application_initialization' });
        throw error;
    }
};

// Middleware setup
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? [process.env.FRONTEND_URL] 
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    optionsSuccessStatus: 200
}));

// SECURITY HEADERS
app.use(requestId);
app.use(securityHeaders);

app.use(express.json({ 
    limit: '10mb',
    verify: (req, res, buf, encoding) => {
        // Log large requests
        if (buf.length > 1024 * 1024) { // > 1MB
            logger.warn('Large request received', {
                size: buf.length,
                endpoint: req.originalUrl,
                ip: req.ip
            });
        }
    }
}));

app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware (structured logging)
app.use(requestLoggerMiddleware);

// SECURITY MIDDLEWARE
app.use(deviceFingerprint);
// Note: sessionManager temporarily disabled until database tables are verified
app.use(sessionManager);
app.use(securityEventLogger);

// Static file serving with logging
// app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
//     setHeaders: (res, path, stat) => {
//         logger.debug('Static file served', { 
//             file: path.split('/').pop(),
//             size: stat.size 
//         });
//     }
// }));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/medicines', medicineRoutes);
app.use('/api/users', userRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/delivery', deliveryRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/geocode', geocodingRoutes);
app.use('/api/health', healthRoutes);

// Enhanced health check endpoint (legacy support)
app.get('/api/health', (req, res) => {
    const healthData = {
        status: 'success',
        message: 'RuraMed API is running',
        timestamp: new Date().toISOString(),
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: Math.floor(process.uptime()),
        cache_stats: cache.getStats()
    };

    logger.info('Health check requested', {
        endpoint: '/api/health',
        uptime: healthData.uptime
    });

    res.json(healthData);
});

// Enhanced root endpoint
app.get('/', (req, res) => {
    const welcomeData = {
        message: 'Welcome to RuraMed API',
        version: '2.0.0',
        environment: process.env.NODE_ENV || 'development',
        timestamp: new Date().toISOString(),
        documentation: {
            health: '/api/health',
            system_health: '/api/health/system',
            database_health: '/api/health/database',
            cache_health: '/api/health/cache'
        },
        endpoints: {
            auth: '/api/auth',
            medicines: '/api/medicines',
            users: '/api/users',
            addresses: '/api/addresses',
            delivery: '/api/delivery',
            doctors: '/api/doctors',
            orders: '/api/orders',
            admin: '/api/admin',
            geocoding: '/api/geocode',
            health: '/api/health'
        }
    };

    logger.info('Root endpoint accessed', {
        ip: req.ip,
        user_agent: req.get('User-Agent')
    });

    res.json(welcomeData);
});

// Cache statistics endpoint (development only)
if (process.env.NODE_ENV !== 'production') {
    app.get('/api/cache/stats', (req, res) => {
        logger.info('Cache stats requested', { ip: req.ip });
        res.json({
            cache_statistics: cache.getStats(),
            timestamp: new Date().toISOString()
        });
    });
}

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
    try {
        // Initialize application
        await initializeApp();
        
        // Start listening
        const server = app.listen(PORT, () => {
            logger.info('🚀 RuraMed Server v2.0.0 started successfully!', {
                port: PORT,
                base_url: `http://localhost:${PORT}`,
                health_check: `http://localhost:${PORT}/api/health`,
                environment: process.env.NODE_ENV || 'development',
                memory_usage: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB'
            });
        });

        // Server event handlers
        server.on('error', (error) => {
            logError(error, { context: 'server_error' });
        });

        // Graceful shutdown handler
        const gracefulShutdown = (signal) => {
            logger.info(`🔄 ${signal} received, initiating graceful shutdown`, {
                uptime: process.uptime(),
                memory_usage: process.memoryUsage().rss
            });

            server.close((err) => {
                if (err) {
                    logError(err, { context: 'server_shutdown' });
                    process.exit(1);
                }

                logger.info('✅ Server closed successfully');
                
                // Close database connections
                // Note: db.end() would be called here if using a different connection pool
                
                logger.info('🔄 Graceful shutdown completed');
                process.exit(0);
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                logger.error('❌ Forced shutdown due to timeout');
                process.exit(1);
            }, 10000);
        };

        // Process event handlers
        process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
        process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    } catch (error) {
        logError(error, { context: 'server_startup' });
        process.exit(1);
    }
};

// Handle uncaught exceptions with structured logging
process.on('uncaughtException', (error) => {
    logError(error, { 
        context: 'uncaught_exception',
        fatal: true 
    });
    
    // Give logger time to write
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

process.on('unhandledRejection', (reason, promise) => {
    logError(new Error(`Unhandled Rejection: ${reason}`), { 
        context: 'unhandled_rejection',
        promise: promise.toString(),
        fatal: true 
    });
    
    // Give logger time to write
    setTimeout(() => {
        process.exit(1);
    }, 1000);
});

// Memory monitoring (development only)
if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
        const memUsage = process.memoryUsage();
        const memUsageMB = Math.round(memUsage.rss / 1024 / 1024);
        
        // Log if memory usage is high (> 500MB)
        if (memUsageMB > 500) {
            logger.warn('High memory usage detected', {
                memory_usage_mb: memUsageMB,
                heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
                cache_size: cache.cache.size
            });
        }
    }, 60000); // Check every minute
}

// Start the server
startServer().catch((error) => {
    logError(error, { context: 'server_startup_failed' });
    process.exit(1);
});
