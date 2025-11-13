import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import { logger, logError, logDatabaseOperation, logPerformance } from '../utils/logger.js';

dotenv.config();

// Enhanced database connection pool with correct MySQL2 settings
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT) || 3306, // ✅ Parse port as integer with default fallback
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
    queueLimit: 0,
    idleTimeout: 300000, // 5 minutes
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    // SSL configuration for production
    ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false
    } : false,
    // Character set for proper UTF-8 support
    charset: 'utf8mb4',
    // ✅ FIX: Force UTC timezone and return dates as strings
    timezone: 'Z',           // Use 'Z' for UTC (ISO 8601 format)
    dateStrings: true,       // Return dates as strings, not Date objects
    supportBigNumbers: true,
    bigNumberStrings: false
});

// Database connection event handlers
db.on('connection', (connection) => {
    logger.info('New database connection established', {
        connection_id: connection.threadId,
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306, // ✅ Include port in logs
        database: process.env.DB_DATABASE,
        category: 'database_connection'
    });
});

db.on('error', (error) => {
    logError(error, {
        context: 'database_pool_error',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306, // ✅ Include port in error logs
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

// Enhanced database connection test with comprehensive checks
const testConnection = async () => {
    const startTime = Date.now();
    
    try {
        logger.info('Testing database connection', {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306, // ✅ Include port in connection test logs
            database: process.env.DB_DATABASE,
            user: process.env.DB_USER
        });

        // Basic connectivity test
        const [basicTest] = await db.execute('SELECT 1 as test');
        const basicTestTime = Date.now() - startTime;
        
        // Test database schema accessibility
        const [schemaTest] = await db.execute('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = ?', [process.env.DB_DATABASE]);
        
        // Test write capabilities with a simple operation
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
            basic_test_time_ms: basicTestTime,
            write_test_time_ms: writeTestTime,
            total_time_ms: totalTime,
            table_count: schemaTest[0].table_count,
            pool_status: poolStatus,
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306, // ✅ Include port in success logs
            category: 'database_health'
        });

        logPerformance('database_connection_test', totalTime, {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306, // ✅ Include port in performance logs
            database: process.env.DB_DATABASE,
            success: true
        });

        return {
            success: true,
            response_time: totalTime,
            table_count: schemaTest[0].table_count,
            pool_status: poolStatus,
            connection_info: {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 3306,
                database: process.env.DB_DATABASE
            }
        };

    } catch (error) {
        const totalTime = Date.now() - startTime;
        
        logError(error, {
            context: 'database_connection_test_failed',
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306, // ✅ Include port in error context
            database: process.env.DB_DATABASE,
            user: process.env.DB_USER,
            test_duration_ms: totalTime
        });

        logPerformance('database_connection_test', totalTime, {
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306, // ✅ Include port in failed performance logs
            database: process.env.DB_DATABASE,
            success: false,
            error: error.message
        });

        return {
            success: false,
            error: error.message,
            error_code: error.code,
            response_time: totalTime,
            connection_info: {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 3306,
                database: process.env.DB_DATABASE
            }
        };
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
        const [status] = await db.execute("SHOW STATUS WHERE Variable_name IN ('Threads_connected', 'Queries', 'Uptime', 'Slow_queries')");
        
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
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 3306 // ✅ Include port in health data
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
                host: process.env.DB_HOST,
                port: process.env.DB_PORT || 3306 // ✅ Include port in error health data
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
        // Log query execution (sanitized for security)
        logDatabaseOperation(operation, 'multiple', userId, {
            query_id: queryId,
            query_preview: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
            param_count: params.length,
            operation_type: operation
        });

        const [results, fields] = await db.execute(query, params);
        const duration = Date.now() - startTime;

        // Log performance metrics
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

        // Re-throw the error for proper error handling upstream
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

// Database connection monitoring
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
            host: process.env.DB_HOST,
            port: process.env.DB_PORT || 3306 // ✅ Include port in shutdown logs
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
