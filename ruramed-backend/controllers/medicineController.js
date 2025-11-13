import { db } from '../config/database.js';
import { preparedQueries } from '../utils/queryBuilder.js';
import { medicineCache } from '../utils/cache.js';
import { 
    logger, 
    logHealthcareEvent, 
    logError, 
    logAuditTrail,
    logMedicineOperation 
} from '../utils/logger.js';

// Get all medicines with pagination
export const getAllMedicines = async (req, res) => {
    // Set default pagination if middleware didn't run
    const pagination = req.pagination || {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        offset: ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 10)
    };
    
    const { page, limit, offset } = pagination;
    const category = req.query.category;

    try {
        let medicines;
        let totalCount;

        if (category) {
            // Use string interpolation for LIMIT/OFFSET as MySQL doesn't support them as parameters in all versions
            const [medicineResults] = await db.execute(
                `SELECT * FROM medicines WHERE category = ? AND is_active = 1 ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`,
                [category]
            );
            medicines = medicineResults;
            
            const [countResult] = await db.execute(
                'SELECT COUNT(*) as total FROM medicines WHERE category = ? AND is_active = 1',
                [category]
            );
            totalCount = countResult[0].total;
        } else {
            const [medicineResults] = await db.execute(
                `SELECT * FROM medicines WHERE is_active = 1 ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`
            );
            medicines = medicineResults;

            const [countResult] = await db.execute(
                'SELECT COUNT(*) as total FROM medicines WHERE is_active = 1'
            );
            totalCount = countResult[0].total;
        }

        logHealthcareEvent('medicines_listed', {
            category: category || 'all',
            count: medicines.length,
            page
        }, req.user?.id);

        res.json({
            medicines,
            pagination: {
                page,
                limit,
                total: totalCount,
                pages: Math.ceil(totalCount / limit)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_all_medicines',
            user_id: req.user?.id,
            pagination,
            category
        });

        res.status(500).json({
            error: 'Failed to fetch medicines',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

// Search medicines
export const searchMedicines = async (req, res) => {
    // Set default search query and pagination if middleware didn't run
    const sanitizedQuery = req.sanitizedQuery || {
        q: req.query.q || '',
        category: req.query.category || null,
        location: req.query.location || null
    };
    
    const pagination = req.pagination || {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        offset: ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 10)
    };
    
    const { q, category } = sanitizedQuery;
    const { page, limit, offset } = pagination;

    // Validate search query
    if (!q || q.trim().length < 2) {
        return res.status(400).json({
            error: 'Invalid search query',
            message: 'Search query must be at least 2 characters',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Build search query
        let searchQuery = `
            SELECT * FROM medicines 
            WHERE is_active = 1 
            AND (name LIKE ? OR generic_name LIKE ? OR short_description LIKE ?)
        `;
        const searchParams = [`%${q}%`, `%${q}%`, `%${q}%`];

        if (category) {
            searchQuery += ' AND category = ?';
            searchParams.push(category);
        }

        searchQuery += ` ORDER BY name ASC LIMIT ${limit} OFFSET ${offset}`;

        const [medicines] = await db.execute(searchQuery, searchParams);

        // Get total count for pagination
        let countQuery = `
            SELECT COUNT(*) as total FROM medicines 
            WHERE is_active = 1 
            AND (name LIKE ? OR generic_name LIKE ? OR short_description LIKE ?)
        `;
        const countParams = [`%${q}%`, `%${q}%`, `%${q}%`];

        if (category) {
            countQuery += ' AND category = ?';
            countParams.push(category);
        }

        const [countResult] = await db.execute(countQuery, countParams);

        logHealthcareEvent('medicines_searched', {
            search_term: q,
            category: category || null,
            results_count: medicines.length
        }, req.user?.id);

        res.json({
            medicines,
            search: {
                query: q,
                category: category || null
            },
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'search_medicines',
            search_query: q,
            user_id: req.user?.id,
            pagination,
            category
        });

        res.status(500).json({
            error: 'Failed to search medicines',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

// Get medicine by ID
export const getMedicineById = async (req, res) => {
    const medicineId = req.params.id;

    try {
        const medicine = await preparedQueries.medicines.findById(medicineId);
        if (!medicine) {
            return res.status(404).json({
                error: 'Medicine not found',
                timestamp: new Date().toISOString()
            });
        }

        logMedicineOperation('viewed', medicineId, req.user?.id, {
            medicine_name: medicine.name
        });

        res.json({
            medicine,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_medicine_by_id',
            medicine_id: medicineId,
            user_id: req.user?.id
        });

        res.status(500).json({
            error: 'Failed to fetch medicine',
            timestamp: new Date().toISOString()
        });
    }
};

// Get medicine categories
export const getMedicineCategories = async (req, res) => {
    try {
        const categories = await preparedQueries.medicines.getCategories();

        res.json({
            categories,
            count: categories.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_medicine_categories',
            user_id: req.user?.id
        });

        res.status(500).json({
            error: 'Failed to fetch categories',
            timestamp: new Date().toISOString()
        });
    }
};

// Get medicine forms
export const getMedicineForms = async (req, res) => {
    try {
        const [forms] = await db.execute(
            'SELECT DISTINCT form FROM medicines WHERE is_active = 1 ORDER BY form'
        );

        res.json({
            forms: forms.map(f => f.form),
            count: forms.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_medicine_forms',
            user_id: req.user?.id
        });

        res.status(500).json({
            error: 'Failed to fetch medicine forms',
            timestamp: new Date().toISOString()
        });
    }
};

// Get popular medicines
export const getPopularMedicines = async (req, res) => {
    // Set default pagination if middleware didn't run
    const pagination = req.pagination || {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        offset: ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 10)
    };
    
    const { page, limit, offset } = pagination;

    try {
        // Get popular medicines - for now, just get medicines ordered by name
        // In future, this could be based on actual order data or admin-marked popular items
        const [medicines] = await db.execute(`
            SELECT * FROM medicines 
            WHERE is_active = 1
            ORDER BY name ASC
            LIMIT ${limit} OFFSET ${offset}
        `);

        const [countResult] = await db.execute(
            'SELECT COUNT(*) as total FROM medicines WHERE is_active = 1'
        );

        logHealthcareEvent('popular_medicines_fetched', {
            count: medicines.length,
            page
        }, req.user?.id);

        res.json({
            medicines,
            pagination: {
                page,
                limit,
                total: countResult[0].total,
                pages: Math.ceil(countResult[0].total / limit)
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_popular_medicines',
            user_id: req.user?.id,
            pagination
        });

        res.status(500).json({
            error: 'Failed to fetch popular medicines',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

// Create medicine (Admin only)
export const createMedicine = async (req, res) => {
    const medicineData = req.validatedData;
    const adminId = req.user.id;

    try {
        const medicineId = await preparedQueries.medicines.create(medicineData, adminId);

        // Clear medicine cache
        medicineCache.invalidate();

        logMedicineOperation('created', medicineId, adminId, {
            medicine_name: medicineData.name,
            category: medicineData.category
        });

        logAuditTrail('CREATE', 'medicine', adminId, null, medicineData);

        res.status(201).json({
            message: 'Medicine created successfully',
            medicine_id: medicineId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'create_medicine',
            medicine_data: medicineData,
            admin_id: adminId
        });

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Medicine already exists',
                message: 'A medicine with this SKU already exists',
                timestamp: new Date().toISOString()
            });
        }

        res.status(500).json({
            error: 'Failed to create medicine',
            timestamp: new Date().toISOString()
        });
    }
};

// Update medicine (Admin only)
export const updateMedicine = async (req, res) => {
    const medicineId = req.params.id;
    const updateData = req.validatedData;
    const adminId = req.user.id;

    try {
        // Get current medicine data for audit trail
        const currentMedicine = await preparedQueries.medicines.findById(medicineId);
        if (!currentMedicine) {
            return res.status(404).json({
                error: 'Medicine not found',
                timestamp: new Date().toISOString()
            });
        }

        // Update medicine
        const fields = Object.keys(updateData);
        const values = Object.values(updateData);
        const setClause = fields.map(field => `${field} = ?`).join(', ');
        
        const [result] = await db.execute(
            `UPDATE medicines SET ${setClause} WHERE id = ?`,
            [...values, medicineId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Medicine not found',
                timestamp: new Date().toISOString()
            });
        }

        // Clear medicine cache
        medicineCache.invalidate();

        logMedicineOperation('updated', medicineId, adminId, {
            medicine_name: currentMedicine.name,
            updated_fields: fields
        });

        logAuditTrail('UPDATE', 'medicine', adminId, currentMedicine, updateData);

        res.json({
            message: 'Medicine updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'update_medicine',
            medicine_id: medicineId,
            update_data: updateData,
            admin_id: adminId
        });

        res.status(500).json({
            error: 'Failed to update medicine',
            timestamp: new Date().toISOString()
        });
    }
};

// Delete medicine (Admin only)
export const deleteMedicine = async (req, res) => {
    const medicineId = req.params.id;
    const adminId = req.user.id;

    try {
        // Get medicine data before deletion
        const medicine = await preparedQueries.medicines.findById(medicineId);
        if (!medicine) {
            return res.status(404).json({
                error: 'Medicine not found',
                timestamp: new Date().toISOString()
            });
        }

        // Soft delete - mark as inactive
        const [result] = await db.execute(
            'UPDATE medicines SET is_active = 0 WHERE id = ?',
            [medicineId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Medicine not found',
                timestamp: new Date().toISOString()
            });
        }

        // Clear medicine cache
        medicineCache.invalidate();

        logMedicineOperation('deleted', medicineId, adminId, {
            medicine_name: medicine.name
        });

        logAuditTrail('DELETE', 'medicine', adminId, medicine, null);

        res.json({
            message: 'Medicine deleted successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'delete_medicine',
            medicine_id: medicineId,
            admin_id: adminId
        });

        res.status(500).json({
            error: 'Failed to delete medicine',
            timestamp: new Date().toISOString()
        });
    }
};

// Update medicine status (Admin only)
export const updateMedicineStatus = async (req, res) => {
    const medicineId = req.params.id;
    const { is_active } = req.body;
    const adminId = req.user.id;

    try {
        const [result] = await db.execute(
            'UPDATE medicines SET is_active = ? WHERE id = ?',
            [is_active, medicineId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                error: 'Medicine not found',
                timestamp: new Date().toISOString()
            });
        }

        // Clear medicine cache
        medicineCache.invalidate();

        logMedicineOperation('status_updated', medicineId, adminId, {
            new_status: is_active ? 'active' : 'inactive'
        });

        res.json({
            message: 'Medicine status updated successfully',
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'update_medicine_status',
            medicine_id: medicineId,
            admin_id: adminId
        });

        res.status(500).json({
            error: 'Failed to update medicine status',
            timestamp: new Date().toISOString()
        });
    }
};

// Bulk import medicines (Admin only)
export const bulkImportMedicines = async (req, res) => {
    const { items } = req.body || {};
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'items array is required' });
    }
    try {
        const connection = await db.getConnection();
        try {
            await connection.beginTransaction();
            let inserted = 0;
            for (const m of items) {
                const { name, generic_name, manufacturer, category, form, strength, price, mrp, sku, image_url, short_description, requires_prescription } = m;
                await connection.execute(
                    `INSERT INTO medicines (name, generic_name, manufacturer, category, form, strength, price, mrp, sku, image_url, short_description, requires_prescription)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [name, generic_name, manufacturer, category, form, strength, price, mrp, sku, image_url, short_description, requires_prescription ? 1 : 0]
                );
                inserted++;
            }
            await connection.commit();
            medicineCache.invalidate();
            res.status(201).json({ message: 'Bulk import completed', inserted, timestamp: new Date().toISOString() });
        } catch (e) {
            await connection.rollback();
            throw e;
        } finally {
            connection.release();
        }
    } catch (error) {
        logError(error, { operation: 'bulk_import_medicines' });
        res.status(500).json({ error: 'Bulk import failed' });
    }
};

// Bulk update prices (Admin only)
export const bulkUpdatePrices = async (req, res) => {
    const { updates } = req.body || {};
    if (!Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: 'updates array is required' });
    }
    try {
        let affected = 0;
        for (const u of updates) {
            const [result] = await db.execute('UPDATE medicines SET price = ?, mrp = ? WHERE id = ?', [u.price, u.mrp, u.id]);
            affected += result.affectedRows;
        }
        medicineCache.invalidate();
        res.json({ message: 'Prices updated', affected, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'bulk_update_prices' });
        res.status(500).json({ error: 'Failed to update prices' });
    }
};

// Get inventory analytics (Admin only)
export const getInventoryAnalytics = async (req, res) => {
    try {
        const [[summary]] = await db.execute('SELECT COUNT(*) as total, SUM(is_active=1) as active_count FROM medicines');
        const [byCategory] = await db.execute('SELECT category, COUNT(*) as items, SUM(is_active=1) as active FROM medicines GROUP BY category ORDER BY items DESC');
        res.json({ summary, by_category: byCategory, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_inventory_analytics' });
        res.status(500).json({ error: 'Failed to fetch inventory analytics' });
    }
};

// Get popularity analytics (Admin only)
export const getPopularityAnalytics = async (req, res) => {
    try {
        // Without explicit popularity signals, proxy by most recently created active medicines
        const [rows] = await db.execute('SELECT id, name, category, created_at FROM medicines WHERE is_active = 1 ORDER BY created_at DESC LIMIT 20');
        res.json({ popular: rows, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_popularity_analytics' });
        res.status(500).json({ error: 'Failed to fetch popularity analytics' });
    }
};
