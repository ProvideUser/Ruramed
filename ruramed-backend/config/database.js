import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { logger, logError, logDatabaseOperation, logPerformance } from '../utils/logger.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Get SSL configuration for Cloud SQL
const getSSLConfig = () => {
    // If not production or no SSL cert provided, return false
    if (!isProduction) {
        return false;
    }

    // Check if using Cloud SQL Unix socket (recommended for GCP)
    if (process.env.DB_SOCKET_PATH) {
        return {
            socketPath: process.env.DB_SOCKET_PATH
        };
    }

    // If SSL certificates are provided (base64 encoded in Secret Manager)
    if (process.env.DB_SSL_CA) {
        return {
            ssl: {
                ca: Buffer.from(process.env.DB_SSL_CA, 'base64').toString('utf-8'),
                cert: process.env.DB_SSL_CERT 
                    ? Buffer.from(process.env.DB_SSL_CERT, 'base64').toString('utf-8') 
                    : undefined,
                key: process.env.DB_SSL_KEY 
                    ? Buffer.from(process.env.DB_SSL_KEY, 'base64').toString('utf-8') 
                    : undefined,
                rejectUnauthorized: true
            }
        };
    }

    // Fallback: basic SSL without certificate verification (not recommended)
    return {
        ssl: {
            rejectUnauthorized: false
        }
    };
};

// Build connection configuration
const connectionConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: isProduction 
        ? parseInt(process.env.DB_CONNECTION_LIMIT) || 10  // Lower limit for Cloud Run
        : parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
    queueLimit: 0,
    idleTimeout: 300000, // 5 minutes
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    charset: 'utf8mb4',
    timezone: 'Z',
    dateStrings: true,
    supportBigNumbers: true,
    bigNumberStrings: false,
    connectTimeout: 10000, // 10 seconds connection timeout
    acquireTimeout: 10000, // 10 seconds acquire timeout
    ...getSSLConfig()
};

// Remove socketPath from config if not being used
if (!process.env.DB_SOCKET_PATH) {
    delete connectionConfig.socketPath;
}

// Enhanced database connection pool
const db = mysql.createPool(connectionConfig);

// Database connection event handlers
db.on('connection', (connection) => {
    logger.info('New database connection established', {
        connection_id: connection.threadId,
        host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
        port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306),
        database: process.env.DB_DATABASE,
        ssl_enabled: !!process.env.DB_SSL_CA || !!process.env.DB_SOCKET_PATH,
        category: 'database_connection'
    });
});

db.on('error', (error) => {
    logError(error, {
        context: 'database_pool_error',
        host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
        port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306),
        database: process.env.DB_DATABASE
    });
    
    // Log specific MySQL errors
    if (error.code === 'PROTOCOL_CONNECTION_LOST') {
        logger.error('Database connection lost', {
            error_code: error.code,
            fatal: error.fatal,
            category: 'database_error'
        });
    }
});

// Enhanced database connection test with retry logic
const testConnection = async (retries = 3, delayMs = 2000) => {
    const startTime = Date.now();
    
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            logger.info(`Testing database connection (attempt ${attempt}/${retries})`, {
                host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
                port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306),
                database: process.env.DB_DATABASE,
                user: process.env.DB_USER,
                ssl_enabled: !!process.env.DB_SSL_CA || !!process.env.DB_SOCKET_PATH
            });

            // Basic connectivity test
            const [basicTest] = await db.execute('SELECT 1 as test');
            const basicTestTime = Date.now() - startTime;
            
            // Test database schema accessibility
            const [schemaTest] = await db.execute(
                'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = ?',
                [process.env.DB_DATABASE]
            );
            
            // Test write capabilities
            const writeTestStart = Date.now();
            await db.execute('SELECT 1 as write_test');
            const writeTestTime = Date.now() - writeTestStart;
            
            // Get connection pool status
            const poolStatus = {
                total_connections: db._allConnections ? db._allConnections.length : 'unknown',
                free_connections: db._freeConnections ? db._freeConnections.length : 'unknown',
                acquired_connections: db._acquiringConnections ? db._acquiringConnections.length : 'unknown'
            };

            const totalTime = Date.now() - startTime;
            
            logger.info('✅ Database connection test successful', {
                attempt,
                basic_test_time_ms: basicTestTime,
                write_test_time_ms: writeTestTime,
                total_time_ms: totalTime,
                table_count: schemaTest[0].table_count,
                pool_status: poolStatus,
                host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
                port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306),
                ssl_enabled: !!process.env.DB_SSL_CA || !!process.env.DB_SOCKET_PATH,
                category: 'database_health'
            });

            logPerformance('database_connection_test', totalTime, {
                host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
                port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306),
                database: process.env.DB_DATABASE,
                success: true,
                attempt
            });

            return {
                success: true,
                response_time: totalTime,
                table_count: schemaTest[0].table_count,
                pool_status: poolStatus,
                connection_info: {
                    host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
                    port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306),
                    database: process.env.DB_DATABASE,
                    ssl_enabled: !!process.env.DB_SSL_CA || !!process.env.DB_SOCKET_PATH
                }
            };

        } catch (error) {
            const totalTime = Date.now() - startTime;
            
            if (attempt === retries) {
                // Final attempt failed
                logError(error, {
                    context: 'database_connection_test_failed',
                    host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
                    port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306),
                    database: process.env.DB_DATABASE,
                    user: process.env.DB_USER,
                    test_duration_ms: totalTime,
                    attempts: retries
                });

                logPerformance('database_connection_test', totalTime, {
                    host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
                    port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306),
                    database: process.env.DB_DATABASE,
                    success: false,
                    error: error.message,
                    attempts: retries
                });

                return {
                    success: false,
                    error: error.message,
                    error_code: error.code,
                    response_time: totalTime,
                    connection_info: {
                        host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
                        port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306),
                        database: process.env.DB_DATABASE
                    }
                };
            }

            // Log retry attempt
            logger.warn(`Database connection test failed, retrying in ${delayMs}ms`, {
                attempt,
                retries,
                error: error.message,
                error_code: error.code
            });

            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
};

// Database health check function
const checkDatabaseHealth = async () => {
    const startTime = Date.now();
    
    try {
        // Check basic connectivity
        await db.execute('SELECT 1');
        
        // Check critical tables exist
        const criticalTables = ['users', 'doctors', 'medicines', 'orders', 'addresses'];
        const tableChecks = await Promise.all(
            criticalTables.map(async (table) => {
                try {
                    const [result] = await db.execute(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
                    return { table, status: 'accessible', count: result[0].count };
                } catch (error) {
                    return { table, status: 'error', error: error.message };
                }
            })
        );

        // Get database performance metrics
        const [processlist] = await db.execute('SHOW PROCESSLIST');
        const [status] = await db.execute(
            "SHOW STATUS WHERE Variable_name IN ('Threads_connected', 'Queries', 'Uptime', 'Slow_queries')"
        );
        
        const statusObj = status.reduce((acc, row) => {
            acc[row.Variable_name.toLowerCase()] = row.Value;
            return acc;
        }, {});

        const healthData = {
            status: 'healthy',
            response_time: Date.now() - startTime,
            active_connections: processlist.length,
            server_stats: statusObj,
            table_checks: tableChecks,
            connection_info: {
                host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
                port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306),
                ssl_enabled: !!process.env.DB_SSL_CA || !!process.env.DB_SOCKET_PATH
            },
            timestamp: new Date().toISOString()
        };

        logger.info('Database health check completed', {
            ...healthData,
            category: 'database_health'
        });

        return healthData;

    } catch (error) {
        const healthData = {
            status: 'unhealthy',
            response_time: Date.now() - startTime,
            error: error.message,
            error_code: error.code,
            connection_info: {
                host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
                port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306)
            },
            timestamp: new Date().toISOString()
        };

        logError(error, {
            context: 'database_health_check_failed',
            ...healthData
        });

        return healthData;
    }
};

// Enhanced query execution wrapper with logging
const executeQuery = async (query, params = [], userId = null, operation = 'SELECT') => {
    const startTime = Date.now();
    const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
        logDatabaseOperation(operation, 'multiple', userId, {
            query_id: queryId,
            query_preview: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            param_count: params.length,
            operation_type: operation
        });

        const [results, fields] = await db.execute(query, params);
        const duration = Date.now() - startTime;

        logPerformance(`database_${operation.toLowerCase()}`, duration, {
            query_id: queryId,
            affected_rows: results.affectedRows || results.length || 0,
            changed_rows: results.changedRows || 0,
            success: true
        });

        // Log slow queries (> 1000ms)
        if (duration > 1000) {
            logger.warn('Slow query detected', {
                query_id: queryId,
                duration_ms: duration,
                query_preview: query.substring(0, 200),
                operation: operation,
                category: 'performance_warning'
            });
        }

        return [results, fields];

    } catch (error) {
        const duration = Date.now() - startTime;
        
        logError(error, {
            context: 'database_query_execution_failed',
            query_id: queryId,
            operation: operation,
            duration_ms: duration,
            query_preview: query.substring(0, 100),
            param_count: params.length
        });

        logPerformance(`database_${operation.toLowerCase()}`, duration, {
            query_id: queryId,
            success: false,
            error: error.message
        });

        throw error;
    }
};

// Transaction wrapper with logging
const withTransaction = async (callback, userId = null) => {
    const connection = await db.getConnection();
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();
    
    try {
        await connection.beginTransaction();
        
        logger.info('Database transaction started', {
            transaction_id: transactionId,
            user_id: userId,
            category: 'database_transaction'
        });

        const result = await callback(connection);
        
        await connection.commit();
        const duration = Date.now() - startTime;
        
        logger.info('Database transaction committed', {
            transaction_id: transactionId,
            user_id: userId,
            duration_ms: duration,
            category: 'database_transaction'
        });

        logPerformance('database_transaction', duration, {
            transaction_id: transactionId,
            success: true,
            user_id: userId
        });

        return result;

    } catch (error) {
        await connection.rollback();
        const duration = Date.now() - startTime;
        
        logError(error, {
            context: 'database_transaction_failed',
            transaction_id: transactionId,
            user_id: userId,
            duration_ms: duration
        });

        logPerformance('database_transaction', duration, {
            transaction_id: transactionId,
            success: false,
            error: error.message,
            user_id: userId
        });

        throw error;
    } finally {
        connection.release();
        
        logger.debug('Database connection released', {
            transaction_id: transactionId,
            category: 'database_connection'
        });
    }
};

// Database connection monitoring (disabled in production)
const startConnectionMonitoring = () => {
    if (process.env.NODE_ENV === 'development') {
        setInterval(async () => {
            try {
                const health = await checkDatabaseHealth();
                
                if (health.active_connections > 15) {
                    logger.warn('High database connection count', {
                        active_connections: health.active_connections,
                        category: 'database_monitoring'
                    });
                }
            } catch (error) {
                logError(error, { context: 'database_monitoring' });
            }
        }, 300000); // Check every 5 minutes
    }
};

// Graceful shutdown
const closeDatabase = async () => {
    try {
        logger.info('Closing database connections...', {
            host: process.env.DB_SOCKET_PATH ? 'unix_socket' : process.env.DB_HOST,
            port: process.env.DB_SOCKET_PATH ? 'N/A' : (process.env.DB_PORT || 3306)
        });
        await db.end();
        logger.info('Database connections closed successfully');
    } catch (error) {
        logError(error, { context: 'database_shutdown' });
    }
};

// Handle process termination
process.on('SIGTERM', closeDatabase);
process.on('SIGINT', closeDatabase);

// Initialize monitoring (only if not in test environment)
if (process.env.NODE_ENV !== 'test') {
    startConnectionMonitoring();
}

export { 
    db, 
    testConnection, 
    checkDatabaseHealth, 
    executeQuery, 
    withTransaction, 
    closeDatabase 
};

export default db;
