import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { logger, logError, logDatabaseOperation, logPerformance } from '../utils/logger.js';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Build PostgreSQL connection configuration
const connectionConfig = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      idleTimeoutMillis: 300000,
      connectionTimeoutMillis: 10000,
    }
  : {
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_DATABASE,
      port: parseInt(process.env.DB_PORT) || 5432,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      max: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
      idleTimeoutMillis: 300000,
      connectionTimeoutMillis: 10000,
    };

const db = new Pool(connectionConfig);

// Database connection event handlers
db.on('connect', () => {
  logger.info('New database connection established', {
    database: process.env.DB_DATABASE || 'postgres',
    ssl_enabled: !!isProduction,
    category: 'database_connection',
  });
});

db.on('error', (error) => {
  logError(error, {
    context: 'database_pool_error',
    database: process.env.DB_DATABASE,
  });
});

// Test connection with retry logic
const testConnection = async (retries = 3, delayMs = 2000) => {
  const startTime = Date.now();

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      logger.info(`Testing database connection (attempt ${attempt}/${retries})`);
      const client = await db.connect();
      await client.query('SELECT 1 as test');
      const schemaTest = await client.query(
        "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'"
      );
      client.release();
      const totalTime = Date.now() - startTime;

      logger.info('✅ Database connection test successful', {
        attempt,
        total_time_ms: totalTime,
        table_count: schemaTest.rows[0].table_count,
        category: 'database_health',
      });

      return {
        success: true,
        response_time: totalTime,
        table_count: schemaTest.rows[0].table_count,
      };
    } catch (error) {
      if (attempt === retries) {
        const totalTime = Date.now() - startTime;
        logError(error, {
          context: 'database_connection_test_failed',
          test_duration_ms: totalTime,
          attempts: retries,
        });
        return {
          success: false,
          error: error.message,
          response_time: totalTime,
        };
      }
      logger.warn(`Database connection attempt ${attempt} failed, retrying...`, {
        error: error.message,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

// Health check
const checkDatabaseHealth = async () => {
  const startTime = Date.now();

  try {
    const client = await db.connect();
    await client.query('SELECT 1');
    const criticalTables = ['users', 'doctors', 'medicines', 'orders', 'addresses'];
    const tableChecks = await Promise.all(
      criticalTables.map(async (table) => {
        try {
          const result = await client.query(`SELECT COUNT(*) as count FROM ${table} LIMIT 1`);
          return { table, status: 'accessible', count: result.rows[0].count };
        } catch (error) {
          return { table, status: 'error', error: error.message };
        }
      })
    );
    client.release();

    const healthData = {
      status: 'healthy',
      response_time: Date.now() - startTime,
      table_checks: tableChecks,
      timestamp: new Date().toISOString(),
    };

    logger.info('Database health check completed', healthData);
    return healthData;
  } catch (error) {
    const healthData = {
      status: 'unhealthy',
      response_time: Date.now() - startTime,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
    logError(error, { context: 'database_health_check_failed', ...healthData });
    return healthData;
  }
};

// PostgreSQL-style query execution
const executeQuery = async (query, params = [], userId = null, operation = 'SELECT') => {
  const startTime = Date.now();
  const queryId = `query_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  try {
    logDatabaseOperation(operation, 'multiple', userId, {
      query_id: queryId,
      query_preview: query.substring(0, 100),
      param_count: params.length,
    });

    const result = await db.query(query, params);
    const duration = Date.now() - startTime;

    logPerformance(`database_${operation.toLowerCase()}`, duration, {
      query_id: queryId,
      row_count: result.rowCount,
      success: true,
    });

    if (duration > 1000) {
      logger.warn('Slow query detected', {
        query_id: queryId,
        duration_ms: duration,
        query_preview: query.substring(0, 200),
        category: 'performance_warning',
      });
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logError(error, {
      context: 'database_query_execution_failed',
      query_id: queryId,
      operation: operation,
      duration_ms: duration,
      query_preview: query.substring(0, 100),
      param_count: params.length,
    });
    throw error;
  }
};

// Transaction wrapper
const withTransaction = async (callback, userId = null) => {
  const client = await db.connect();
  const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  const startTime = Date.now();

  try {
    await client.query('BEGIN');
    logger.info('Database transaction started', {
      transaction_id: transactionId,
      user_id: userId,
    });

    const result = await callback(client);

    await client.query('COMMIT');
    const duration = Date.now() - startTime;

    logger.info('Database transaction committed', {
      transaction_id: transactionId,
      duration_ms: duration,
    });

    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    const duration = Date.now() - startTime;

    logError(error, {
      context: 'database_transaction_failed',
      transaction_id: transactionId,
      duration_ms: duration,
    });

    throw error;
  } finally {
    client.release();
  }
};

const closeDatabase = async () => {
  try {
    logger.info('Closing database connections...');
    await db.end();
    logger.info('Database connections closed successfully');
  } catch (error) {
    logError(error, { context: 'database_shutdown' });
  }
};

process.on('SIGTERM', closeDatabase);
process.on('SIGINT', closeDatabase);

export {
  db,
  testConnection,
  checkDatabaseHealth,
  executeQuery,
  withTransaction,
  closeDatabase,
};
export default db;
