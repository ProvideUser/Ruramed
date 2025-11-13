import { db } from '../config/database.js';
import { logDatabaseOperation, logError, logPerformance } from './logger.js';


// Generic query builder class
export class QueryBuilder {
    constructor(tableName) {
        this.tableName = tableName;
        this.queryType = null;
        this.selectFields = ['*'];
        this.whereConditions = [];
        this.joinClauses = [];
        this.orderByClause = '';
        this.limitClause = '';
        this.groupByClause = '';
        this.havingClause = '';
        this.params = [];
    }


    // SELECT query builder
    select(fields = ['*']) {
        this.queryType = 'SELECT';
        this.selectFields = Array.isArray(fields) ? fields : [fields];
        return this;
    }


    // WHERE conditions
    where(condition, value = null) {
        if (value !== null) {
            this.whereConditions.push(condition);
            this.params.push(value);
        } else {
            this.whereConditions.push(condition);
        }
        return this;
    }


    // WHERE IN condition
    whereIn(field, values) {
        if (!Array.isArray(values) || values.length === 0) {
            throw new Error('whereIn requires non-empty array');
        }
        const placeholders = values.map(() => '?').join(',');
        this.whereConditions.push(`${field} IN (${placeholders})`);
        this.params.push(...values);
        return this;
    }


    // WHERE BETWEEN condition
    whereBetween(field, start, end) {
        this.whereConditions.push(`${field} BETWEEN ? AND ?`);
        this.params.push(start, end);
        return this;
    }


    // LIKE condition for search
    whereLike(field, pattern) {
        this.whereConditions.push(`${field} LIKE ?`);
        this.params.push(`%${pattern}%`);
        return this;
    }


    // JOIN clauses
    join(table, condition) {
        this.joinClauses.push(`JOIN ${table} ON ${condition}`);
        return this;
    }


    leftJoin(table, condition) {
        this.joinClauses.push(`LEFT JOIN ${table} ON ${condition}`);
        return this;
    }


    // ORDER BY
    orderBy(field, direction = 'ASC') {
        this.orderByClause = `ORDER BY ${field} ${direction.toUpperCase()}`;
        return this;
    }


    // GROUP BY
    groupBy(fields) {
        const groupFields = Array.isArray(fields) ? fields.join(', ') : fields;
        this.groupByClause = `GROUP BY ${groupFields}`;
        return this;
    }


    // HAVING
    having(condition, value = null) {
        if (value !== null) {
            this.havingClause = `HAVING ${condition}`;
            this.params.push(value);
        } else {
            this.havingClause = `HAVING ${condition}`;
        }
        return this;
    }


    // LIMIT and OFFSET
    limit(count, offset = 0) {
        this.limitClause = offset > 0 ? `LIMIT ${offset}, ${count}` : `LIMIT ${count}`;
        return this;
    }


    // Build the final query
    buildQuery() {
        if (this.queryType !== 'SELECT') {
            throw new Error('Only SELECT queries are supported by this method');
        }


        let query = `SELECT ${this.selectFields.join(', ')} FROM ${this.tableName}`;
        
        if (this.joinClauses.length > 0) {
            query += ` ${this.joinClauses.join(' ')}`;
        }
        
        if (this.whereConditions.length > 0) {
            query += ` WHERE ${this.whereConditions.join(' AND ')}`;
        }
        
        if (this.groupByClause) {
            query += ` ${this.groupByClause}`;
        }
        
        if (this.havingClause) {
            query += ` ${this.havingClause}`;
        }
        
        if (this.orderByClause) {
            query += ` ${this.orderByClause}`;
        }
        
        if (this.limitClause) {
            query += ` ${this.limitClause}`;
        }


        return { query, params: this.params };
    }


    // Execute the query
    async execute(userId = null) {
        const startTime = Date.now();
        const { query, params } = this.buildQuery();
        
        try {
            logDatabaseOperation('SELECT', this.tableName, userId, { 
                query: query.substring(0, 200) + (query.length > 200 ? '...' : ''),
                paramCount: params.length 
            });


            const [rows] = await db.execute(query, params);
            
            const duration = Date.now() - startTime;
            logPerformance(`query_${this.tableName}`, duration, { 
                rowCount: rows.length,
                hasJoins: this.joinClauses.length > 0
            });


            return rows;
        } catch (error) {
            logError(error, { 
                query, 
                params, 
                table: this.tableName,
                operation: 'SELECT' 
            });
            throw error;
        }
    }
}


// Prepared statement utilities for common operations
export const preparedQueries = {
    // User queries
    users: {
        findById: async (id) => {
            const query = 'SELECT id, name, email, phone, location, created_at FROM users WHERE id = ?';
            const [rows] = await db.execute(query, [id]);
            return rows[0] || null;
        },


        findByEmail: async (email) => {
            const query = 'SELECT * FROM users WHERE email = ?';
            const [rows] = await db.execute(query, [email]);
            return rows[0] || null;
        },


        findByPhone: async (phone) => {
            const query = 'SELECT * FROM users WHERE phone = ?';
            const [rows] = await db.execute(query, [phone]);
            return rows[0] || null;
        },


        findByEmailOrPhone: async (identifier) => {
            const query = 'SELECT * FROM users WHERE email = ? OR phone = ?';
            const [rows] = await db.execute(query, [identifier, identifier]);
            return rows[0] || null;
        },


        create: async (userData, userId = null) => {
            const { name, email, phone, password, location } = userData;
            const query = 'INSERT INTO users (name, email, phone, password, location) VALUES (?, ?, ?, ?, ?)';
            
            logDatabaseOperation('INSERT', 'users', userId, { email });
            const [result] = await db.execute(query, [name, email, phone, password, location]);
            return result.insertId;
        },


        updateById: async (id, updateData, userId = null) => {
            const fields = Object.keys(updateData);
            const values = Object.values(updateData);
            const setClause = fields.map(field => `${field} = ?`).join(', ');
            
            const query = `UPDATE users SET ${setClause} WHERE id = ?`;
            values.push(id);
            
            logDatabaseOperation('UPDATE', 'users', userId, { targetUserId: id, fields });
            const [result] = await db.execute(query, values);
            return result.affectedRows > 0;
        }
    },

    // User Profiles queries
    userProfiles: {
        findByUserId: async (userId) => {
            const query = `
                SELECT 
                    id, 
                    user_id, 
                    full_name, 
                    profile_picture, 
                    gender, 
                    DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth,
                    blood_group, 
                    email_verified, 
                    mobile_verified, 
                    alternate_contact, 
                    customer_unique_id, 
                    created_at, 
                    updated_at
                FROM user_profiles 
                WHERE user_id = ?
            `;
            const [rows] = await db.execute(query, [userId]);
            return rows[0] || null;
        },

        findByCustomerId: async (customerUniqueId) => {
            const query = `
                SELECT 
                    id, 
                    user_id, 
                    full_name, 
                    profile_picture, 
                    gender, 
                    DATE_FORMAT(date_of_birth, '%Y-%m-%d') as date_of_birth,
                    blood_group, 
                    email_verified, 
                    mobile_verified, 
                    alternate_contact, 
                    customer_unique_id, 
                    created_at, 
                    updated_at
                FROM user_profiles 
                WHERE customer_unique_id = ?
            `;
            const [rows] = await db.execute(query, [customerUniqueId]);
            return rows[0] || null;
        },

        create: async (profileData, userId = null) => {
            const {
                user_id,
                full_name,
                profile_picture,
                gender,
                date_of_birth,
                blood_group,
                email_verified,
                mobile_verified,
                alternate_contact,
                customer_unique_id
            } = profileData;

            // ✅ Format date_of_birth before inserting
            let formattedDOB = null;
            if (date_of_birth) {
                if (typeof date_of_birth === 'string') {
                    formattedDOB = date_of_birth.split('T')[0];
                } else if (date_of_birth instanceof Date) {
                    formattedDOB = date_of_birth.toISOString().split('T')[0];
                }
            }

            const query = `
                INSERT INTO user_profiles 
                (user_id, full_name, profile_picture, gender, date_of_birth, 
                blood_group, email_verified, mobile_verified, alternate_contact, customer_unique_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;

            logDatabaseOperation('INSERT', 'user_profiles', userId, { user_id, customer_unique_id });

            const [result] = await db.execute(query, [
                user_id,
                full_name || null,
                profile_picture || null,
                gender || null,
                formattedDOB || null,
                blood_group || null,
                email_verified || 0,
                mobile_verified || 0,
                alternate_contact || null,
                customer_unique_id
            ]);

            return result.insertId;
        },

        updateById: async (userId, updateData, adminUserId = null) => {
            // ✅ Format date_of_birth if present in updateData
            if (updateData.date_of_birth) {
                if (typeof updateData.date_of_birth === 'string') {
                    updateData.date_of_birth = updateData.date_of_birth.split('T')[0];
                } else if (updateData.date_of_birth instanceof Date) {
                    updateData.date_of_birth = updateData.date_of_birth.toISOString().split('T')[0];
                }
            }

            const fields = Object.keys(updateData);
            const values = Object.values(updateData);
            const setClause = fields.map(field => `${field} = ?`).join(', ');

            const query = `UPDATE user_profiles SET ${setClause} WHERE user_id = ?`;
            values.push(userId);

            logDatabaseOperation('UPDATE', 'user_profiles', adminUserId, { 
                targetUserId: userId, 
                fields 
            });

            const [result] = await db.execute(query, values);
            return result.affectedRows > 0;
        },

        deleteField: async (userId, fieldName) => {
            // Validate field name to prevent SQL injection
            const allowedFields = [
                'full_name', 'profile_picture', 'gender', 'date_of_birth',
                'blood_group', 'alternate_contact'
            ];

            if (!allowedFields.includes(fieldName)) {
                throw new Error(`Invalid field name: ${fieldName}`);
            }

            const query = `UPDATE user_profiles SET ${fieldName} = NULL WHERE user_id = ?`;
            const [result] = await db.execute(query, [userId]);
            return result.affectedRows > 0;
        },

        deleteAllFields: async (userId) => {
            const query = `
                UPDATE user_profiles 
                SET full_name = NULL, profile_picture = NULL, gender = NULL, 
                    date_of_birth = NULL, blood_group = NULL, alternate_contact = NULL
                WHERE user_id = ?
            `;
            const [result] = await db.execute(query, [userId]);
            return result.affectedRows > 0;
        }
    },


    // Medicine queries
    medicines: {
        findById: async (id) => {
            const query = 'SELECT * FROM medicines WHERE id = ? AND is_active = 1';
            const [rows] = await db.execute(query, [id]);
            return rows[0] || null;
        },


        search: async (searchTerm, category = null, limit = 10, offset = 0) => {
            let query = `
                SELECT m.*, 
                       MATCH(m.name, m.generic_name, m.short_description) AGAINST (? IN NATURAL LANGUAGE MODE) as relevance
                FROM medicines m 
                WHERE m.is_active = 1 
                AND (m.name LIKE ? OR m.generic_name LIKE ? OR m.short_description LIKE ?)
            `;
            
            const params = [searchTerm, `%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];
            
            if (category) {
                query += ' AND m.category = ?';
                params.push(category);
            }
            
            query += ' ORDER BY relevance DESC, m.name ASC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            const [rows] = await db.execute(query, params);
            return rows;
        },


        findByCategory: async (category, limit = 10, offset = 0) => {
            const query = `
                SELECT * FROM medicines 
                WHERE category = ? AND is_active = 1 
                ORDER BY name ASC 
                LIMIT ? OFFSET ?
            `;
            const [rows] = await db.execute(query, [category, limit, offset]);
            return rows;
        },


        getCategories: async () => {
            const query = 'SELECT DISTINCT category FROM medicines WHERE is_active = 1 ORDER BY category';
            const [rows] = await db.execute(query);
            return rows.map(row => row.category);
        },


        create: async (medicineData, userId = null) => {
            const {
                name, generic_name, manufacturer, category, form, strength,
                price, mrp, sku, image_url, short_description, requires_prescription
            } = medicineData;


            const query = `
                INSERT INTO medicines 
                (name, generic_name, manufacturer, category, form, strength, price, mrp, sku, image_url, short_description, requires_prescription)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            logDatabaseOperation('INSERT', 'medicines', userId, { name, category });
            const [result] = await db.execute(query, [
                name, generic_name, manufacturer, category, form, strength,
                price, mrp, sku, image_url, short_description, requires_prescription
            ]);
            return result.insertId;
        }
    },


    // Doctor queries
    doctors: {
        findById: async (id) => {
            const query = 'SELECT * FROM doctors WHERE id = ? AND available = 1';
            const [rows] = await db.execute(query, [id]);
            return rows[0] || null;
        },


        findByLocation: async (latitude, longitude, radiusKm = 50, limit = 10) => {
            const query = `
                SELECT *,
                (6371 * acos(cos(radians(?)) * cos(radians(latitude)) * 
                cos(radians(longitude) - radians(?)) + sin(radians(?)) * 
                sin(radians(latitude)))) AS distance
                FROM doctors 
                WHERE available = 1 
                AND latitude IS NOT NULL 
                AND longitude IS NOT NULL
                HAVING distance < ?
                ORDER BY distance ASC
                LIMIT ?
            `;
            const [rows] = await db.execute(query, [latitude, longitude, latitude, radiusKm, limit]);
            return rows;
        },


        findBySpecialty: async (specialty, limit = 10, offset = 0) => {
            const query = `
                SELECT * FROM doctors 
                WHERE specialty LIKE ? AND available = 1 
                ORDER BY rating DESC, experience DESC 
                LIMIT ? OFFSET ?
            `;
            const [rows] = await db.execute(query, [`%${specialty}%`, limit, offset]);
            return rows;
        },


        create: async (doctorData, userId = null) => {
            const {
                name, email, specialty, location, latitude, longitude,
                experience, consultation_fee, phone
            } = doctorData;


            const query = `
                INSERT INTO doctors 
                (name, email, specialty, location, latitude, longitude, experience, consultation_fee, phone)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            logDatabaseOperation('INSERT', 'doctors', userId, { name, specialty, location });
            const [result] = await db.execute(query, [
                name, email, specialty, location, latitude, longitude,
                experience, consultation_fee, phone
            ]);
            return result.insertId;
        }
    },


    // Order queries
    orders: {
        findById: async (id, userId = null) => {
            let query = `
                SELECT o.*, u.name as user_name, u.email as user_email,
                       a.address_line1, a.city, a.state, a.postal_code
                FROM orders o
                JOIN users u ON o.user_id = u.id
                LEFT JOIN addresses a ON o.address_id = a.id
                WHERE o.id = ?
            `;
            
            let params = [id];
            if (userId) {
                query += ' AND o.user_id = ?';
                params.push(userId);
            }
            
            const [rows] = await db.execute(query, params);
            return rows[0] || null;
        },


        findByUserId: async (userId, status = null, limit = 10, offset = 0) => {
            let query = `
                SELECT o.*, a.address_line1, a.city, a.state 
                FROM orders o
                LEFT JOIN addresses a ON o.address_id = a.id
                WHERE o.user_id = ?
            `;
            const params = [userId];
            
            if (status) {
                query += ' AND o.status = ?';
                params.push(status);
            }
            
            query += ' ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
            params.push(limit, offset);
            
            const [rows] = await db.execute(query, params);
            return rows;
        },


        create: async (orderData, userId) => {
            const { user_id, medicines, total_amount, address_id, prescription_id } = orderData;
            
            const query = `
                INSERT INTO orders (user_id, medicines, total_amount, address_id, prescription_id, delivery_address)
                VALUES (?, ?, ?, ?, ?, ?)
            `;
            
            // Get address for delivery_address field
            let deliveryAddress = '';
            if (address_id) {
                const [addressRows] = await db.execute(
                    'SELECT address_line1, address_line2, city, state, postal_code FROM addresses WHERE id = ?',
                    [address_id]
                );
                if (addressRows.length > 0) {
                    const addr = addressRows[0];
                    deliveryAddress = `${addr.address_line1}${addr.address_line2 ? ', ' + addr.address_line2 : ''}, ${addr.city}, ${addr.state} - ${addr.postal_code}`;
                }
            }
            
            logDatabaseOperation('INSERT', 'orders', userId, { 
                order_user_id: user_id, 
                total_amount,
                medicine_count: Array.isArray(medicines) ? medicines.length : JSON.parse(medicines).length 
            });
            
            const [result] = await db.execute(query, [
                user_id, 
                typeof medicines === 'string' ? medicines : JSON.stringify(medicines), 
                total_amount, 
                address_id, 
                prescription_id,
                deliveryAddress
            ]);
            return result.insertId;
        },


        updateStatus: async (orderId, status, userId = null) => {
            const query = 'UPDATE orders SET status = ? WHERE id = ?';
            
            logDatabaseOperation('UPDATE', 'orders', userId, { 
                orderId, 
                newStatus: status 
            });
            
            const [result] = await db.execute(query, [status, orderId]);
            return result.affectedRows > 0;
        }
    },


    // Address queries
    addresses: {
        findByUserId: async (userId) => {
            const query = `
                SELECT * FROM addresses 
                WHERE user_id = ? 
                ORDER BY is_default DESC, created_at DESC
            `;
            const [rows] = await db.execute(query, [userId]);
            return rows;
        },

        findDefault: async (userId) => {
            const query = 'SELECT * FROM addresses WHERE user_id = ? AND is_default = 1';
            const [rows] = await db.execute(query, [userId]);
            return rows[0] || null;
        },

        create: async (addressData, userId) => {
            const {
                user_id, address_line1, address_line2, city, state, postal_code,
                latitude, longitude, is_default, address_type, landmark,
                contact_name, contact_phone, delivery_instructions
            } = addressData;

            // If this is default address, unset other defaults
            if (is_default) {
                await db.execute('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [user_id]);
            }

            const query = `
                INSERT INTO addresses 
                (user_id, address_line1, address_line2, city, state, postal_code, 
                latitude, longitude, is_default, address_type, landmark, 
                contact_name, contact_phone, delivery_instructions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `;
            
            logDatabaseOperation('INSERT', 'addresses', userId, { city, state, is_default });
            
            // ✅ FIX: Convert undefined to null for MySQL compatibility
            const [result] = await db.execute(query, [
                user_id,
                address_line1,
                address_line2 || null,              // ✅ Convert undefined to null
                city,
                state,
                postal_code,
                latitude || null,                    // ✅ Convert undefined to null
                longitude || null,                   // ✅ Convert undefined to null
                is_default || 0,
                address_type || 'home',
                landmark || null,                    // ✅ Convert undefined to null
                contact_name || null,                // ✅ Convert undefined to null
                contact_phone || null,               // ✅ Convert undefined to null
                delivery_instructions || null        // ✅ Convert undefined to null
            ]);

            return result.insertId;
        }
    }
};


// Transaction helper
export const withTransaction = async (callback) => {
    const connection = await db.getConnection();
    await connection.beginTransaction();
    
    try {
        const result = await callback(connection);
        await connection.commit();
        return result;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
};


// Batch operations helper
export const batchInsert = async (tableName, data, userId = null) => {
    if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Data must be non-empty array');
    }


    const keys = Object.keys(data[0]);
    const placeholders = keys.map(() => '?').join(',');
    const query = `INSERT INTO ${tableName} (${keys.join(',')}) VALUES (${placeholders})`;
    
    logDatabaseOperation('BATCH_INSERT', tableName, userId, { 
        recordCount: data.length,
        fields: keys 
    });


    const results = [];
    for (const record of data) {
        const values = keys.map(key => record[key]);
        const [result] = await db.execute(query, values);
        results.push(result.insertId);
    }
    
    return results;
};


export default { QueryBuilder, preparedQueries, withTransaction, batchInsert };
