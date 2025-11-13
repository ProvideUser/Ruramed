import { db } from '../config/database.js';
import { preparedQueries } from '../utils/queryBuilder.js';
import { doctorCache } from '../utils/cache.js';
import { 
    logger, 
    logHealthcareEvent, 
    logError, 
    logAuditTrail 
} from '../utils/logger.js';

// Get all doctors with pagination
export const getAllDoctors = async (req, res) => {
    // Set default pagination if middleware didn't run
    const pagination = req.pagination || {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        offset: ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 10)
    };
    
    const { page, limit, offset } = pagination;
    const specialty = req.query.specialty;

    try {
        let doctors;
        let totalCount;

        if (specialty) {
            const [doctorResults] = await db.execute(
                `SELECT * FROM doctors WHERE specialty LIKE ? AND available = 1 ORDER BY rating DESC, experience DESC LIMIT ${limit} OFFSET ${offset}`,
                [`%${specialty}%`]
            );
            doctors = doctorResults;
            
            const [countResult] = await db.execute(
                'SELECT COUNT(*) as total FROM doctors WHERE specialty LIKE ? AND available = 1',
                [`%${specialty}%`]
            );
            totalCount = countResult[0].total;
        } else {
            const [doctorResults] = await db.execute(
                `SELECT * FROM doctors WHERE available = 1 ORDER BY rating DESC, experience DESC LIMIT ${limit} OFFSET ${offset}`
            );
            doctors = doctorResults;

            const [countResult] = await db.execute(
                'SELECT COUNT(*) as total FROM doctors WHERE available = 1'
            );
            totalCount = countResult[0].total;
        }

        logHealthcareEvent('doctors_listed', {
            specialty: specialty || 'all',
            count: doctors.length,
            page
        }, req.user?.id);

        res.json({
            doctors,
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
            operation: 'get_all_doctors',
            user_id: req.user?.id,
            pagination,
            specialty
        });

        res.status(500).json({
            error: 'Failed to fetch doctors',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

// Search doctors
export const searchDoctors = async (req, res) => {
    // Set default search query and pagination if middleware didn't run
    const sanitizedQuery = req.sanitizedQuery || {
        q: req.query.q || '',
        location: req.query.location || null
    };
    
    const pagination = req.pagination || {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 10,
        offset: ((parseInt(req.query.page) || 1) - 1) * (parseInt(req.query.limit) || 10)
    };
    
    const { q, location } = sanitizedQuery;
    const { page, limit, offset } = pagination;

    // Validate search query
    if ((!q || q.trim().length < 2) && !location) {
        return res.status(400).json({
            error: 'Invalid search query',
            message: 'Provide a search term (min 2 chars) or a location',
            timestamp: new Date().toISOString()
        });
    }

    try {
        // Build query based on provided parameters
        let query = `SELECT * FROM doctors WHERE available = 1`;
        const params = [];

        if (q && q.trim().length >= 2) {
            query += ' AND (name LIKE ? OR specialty LIKE ? OR location LIKE ?)';
            params.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        if (location) {
            query += ' AND location LIKE ?';
            params.push(`%${location}%`);
        }

        query += ` ORDER BY rating DESC, experience DESC LIMIT ${limit} OFFSET ${offset}`;

        const [doctors] = await db.execute(query, params);

        // Get total count for pagination
        let countQuery = `SELECT COUNT(*) as total FROM doctors WHERE available = 1`;
        const countParams = [];

        if (q && q.trim().length >= 2) {
            countQuery += ' AND (name LIKE ? OR specialty LIKE ? OR location LIKE ?)';
            countParams.push(`%${q}%`, `%${q}%`, `%${q}%`);
        }

        if (location) {
            countQuery += ' AND location LIKE ?';
            countParams.push(`%${location}%`);
        }

        const [countResult] = await db.execute(countQuery, countParams);

        logHealthcareEvent('doctors_searched', {
            search_term: q,
            location: location || null,
            results_count: doctors.length
        }, req.user?.id);

        res.json({
            doctors,
            search: {
                query: q,
                location: location || null
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
            operation: 'search_doctors',
            search_query: q,
            user_id: req.user?.id,
            pagination,
            location
        });

        res.status(500).json({
            error: 'Failed to search doctors',
            message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
            timestamp: new Date().toISOString()
        });
    }
};

// Get doctor specialties
export const getDoctorSpecialties = async (req, res) => {
    try {
        const [specialties] = await db.execute(
            'SELECT DISTINCT specialty FROM doctors WHERE available = 1 ORDER BY specialty'
        );

        res.json({
            specialties: specialties.map(s => s.specialty),
            count: specialties.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_doctor_specialties',
            user_id: req.user?.id
        });

        res.status(500).json({
            error: 'Failed to fetch specialties',
            timestamp: new Date().toISOString()
        });
    }
};

// Get nearby doctors
export const getNearbyDoctors = async (req, res) => {
    const { lat, lng } = req.coordinates;
    const { page, limit } = req.pagination;
    const radius = req.query.radius || 50; // default 50km

    try {
        const doctors = await preparedQueries.doctors.findByLocation(lat, lng, radius, limit);

        logHealthcareEvent('nearby_doctors_searched', {
            latitude: lat,
            longitude: lng,
            radius: radius,
            results_count: doctors.length
        }, req.user?.id);

        res.json({
            doctors,
            search_criteria: {
                latitude: lat,
                longitude: lng,
                radius_km: radius
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_nearby_doctors',
            coordinates: { lat, lng },
            user_id: req.user?.id
        });

        res.status(500).json({
            error: 'Failed to fetch nearby doctors',
            timestamp: new Date().toISOString()
        });
    }
};

// Get doctor by ID
export const getDoctorById = async (req, res) => {
    const doctorId = req.params.id;

    try {
        const doctor = await preparedQueries.doctors.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({
                error: 'Doctor not found',
                timestamp: new Date().toISOString()
            });
        }

        logHealthcareEvent('doctor_profile_viewed', {
            doctor_id: doctorId,
            doctor_name: doctor.name,
            specialty: doctor.specialty
        }, req.user?.id);

        res.json({
            doctor,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_doctor_by_id',
            doctor_id: doctorId,
            user_id: req.user?.id
        });

        res.status(500).json({
            error: 'Failed to fetch doctor',
            timestamp: new Date().toISOString()
        });
    }
};

// Get doctor availability
export const getDoctorAvailability = async (req, res) => {
    const doctorId = req.params.id;
    const date = req.query.date || new Date().toISOString().split('T')[0];

    try {
        // Check if doctor exists
        const doctor = await preparedQueries.doctors.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({
                error: 'Doctor not found',
                timestamp: new Date().toISOString()
            });
        }

        // Mock availability data (in real implementation, would come from calendar system)
        const timeSlots = [
            '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
            '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
        ];

        // Get existing consultations for the date
        const [consultations] = await db.execute(
            'SELECT DATE_FORMAT(consultation_date, "%H:%i") as time_slot FROM consultations WHERE doctor_id = ? AND DATE(consultation_date) = ?',
            [doctorId, date]
        );

        const bookedSlots = consultations.map(c => c.time_slot);
        const availableSlots = timeSlots.filter(slot => !bookedSlots.includes(slot));

        res.json({
            doctor_id: doctorId,
            date: date,
            available_slots: availableSlots,
            booked_slots: bookedSlots,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_doctor_availability',
            doctor_id: doctorId,
            date: date,
            user_id: req.user?.id
        });

        res.status(500).json({
            error: 'Failed to fetch doctor availability',
            timestamp: new Date().toISOString()
        });
    }
};

// Book consultation
export const bookConsultation = async (req, res) => {
    const userId = req.user.id;
    const doctorId = req.params.id;
    const { consultation_date, notes } = req.body;

    try {
        // Validate doctor exists
        const doctor = await preparedQueries.doctors.findById(doctorId);
        if (!doctor) {
            return res.status(404).json({
                error: 'Doctor not found',
                timestamp: new Date().toISOString()
            });
        }

        // Check if time slot is available
        const [existingConsultations] = await db.execute(
            'SELECT id FROM consultations WHERE doctor_id = ? AND consultation_date = ?',
            [doctorId, consultation_date]
        );

        if (existingConsultations.length > 0) {
            return res.status(400).json({
                error: 'Time slot not available',
                message: 'The selected time slot is already booked',
                timestamp: new Date().toISOString()
            });
        }

        // Create consultation
        const [result] = await db.execute(
            'INSERT INTO consultations (user_id, doctor_id, consultation_date, notes, status) VALUES (?, ?, ?, ?, "pending")',
            [userId, doctorId, consultation_date, notes]
        );

        logHealthcareEvent('consultation_booked', {
            consultation_id: result.insertId,
            doctor_id: doctorId,
            doctor_name: doctor.name,
            consultation_date: consultation_date
        }, userId);

        logAuditTrail('CREATE', 'consultation', userId, null, {
            consultation_id: result.insertId,
            doctor_id: doctorId,
            consultation_date: consultation_date
        });

        res.status(201).json({
            message: 'Consultation booked successfully',
            consultation_id: result.insertId,
            doctor_name: doctor.name,
            consultation_date: consultation_date,
            consultation_fee: doctor.consultation_fee,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'book_consultation',
            user_id: userId,
            doctor_id: doctorId,
            consultation_date: consultation_date
        });

        res.status(500).json({
            error: 'Failed to book consultation',
            timestamp: new Date().toISOString()
        });
    }
};

// Get doctor reviews
export const getDoctorReviews = async (req, res) => {
    const doctorId = req.params.id;
    const { page, limit, offset } = req.pagination;

    try {
        // Mock reviews (in real implementation, would have reviews table)
        const mockReviews = [
            { id: 1, user_name: 'Anonymous', rating: 5, comment: 'Excellent consultation', created_at: new Date() },
            { id: 2, user_name: 'Anonymous', rating: 4, comment: 'Very helpful doctor', created_at: new Date() }
        ];

        res.json({
            reviews: mockReviews,
            pagination: {
                page,
                limit,
                total: mockReviews.length
            },
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'get_doctor_reviews',
            doctor_id: doctorId,
            user_id: req.user?.id
        });

        res.status(500).json({
            error: 'Failed to fetch reviews',
            timestamp: new Date().toISOString()
        });
    }
};

// Add doctor review (not supported by current schema)
export const addDoctorReview = async (req, res) => {
    return res.status(400).json({ error: 'Doctor reviews are not supported by current schema' });
};

// Admin functions
export const createDoctor = async (req, res) => {
    const doctorData = req.validatedData;
    const adminId = req.user.id;

    try {
        const doctorId = await preparedQueries.doctors.create(doctorData, adminId);

        // TODO: Invalidate specific doctor cache entries if needed

        logHealthcareEvent('doctor_created', {
            doctor_id: doctorId,
            doctor_name: doctorData.name,
            specialty: doctorData.specialty,
            location: doctorData.location
        }, adminId);

        logAuditTrail('CREATE', 'doctor', adminId, null, doctorData);

        res.status(201).json({
            message: 'Doctor created successfully',
            doctor_id: doctorId,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        logError(error, {
            operation: 'create_doctor',
            doctor_data: doctorData,
            admin_id: adminId
        });

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                error: 'Doctor already exists',
                message: 'A doctor with this email already exists',
                timestamp: new Date().toISOString()
            });
        }

        res.status(500).json({
            error: 'Failed to create doctor',
            timestamp: new Date().toISOString()
        });
    }
};

export const updateDoctor = async (req, res) => {
    const doctorId = req.params.id;
    const updates = req.validatedData;
    try {
        const fields = Object.keys(updates);
        const values = Object.values(updates);
        if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });
        const setClause = fields.map(f => `${f} = ?`).join(', ');
        const [result] = await db.execute(`UPDATE doctors SET ${setClause} WHERE id = ?`, [...values, doctorId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Doctor not found' });
        res.json({ message: 'Doctor updated', doctor_id: doctorId, updated_fields: fields, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'update_doctor', doctor_id: doctorId });
        res.status(500).json({ error: 'Failed to update doctor' });
    }
};

export const deleteDoctor = async (req, res) => {
    const doctorId = req.params.id;
    try {
        const [result] = await db.execute('DELETE FROM doctors WHERE id = ?', [doctorId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Doctor not found' });
        res.json({ message: 'Doctor deleted', doctor_id: doctorId, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'delete_doctor', doctor_id: doctorId });
        res.status(500).json({ error: 'Failed to delete doctor' });
    }
};

export const updateDoctorStatus = async (req, res) => {
    const doctorId = req.params.id;
    const { available } = req.body;
    try {
        const [result] = await db.execute('UPDATE doctors SET available = ? WHERE id = ?', [available ? 1 : 0, doctorId]);
        if (result.affectedRows === 0) return res.status(404).json({ error: 'Doctor not found' });
        res.json({ message: 'Doctor status updated', doctor_id: doctorId, available: !!available, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'update_doctor_status', doctor_id: doctorId });
        res.status(500).json({ error: 'Failed to update doctor status' });
    }
};

export const getPendingDoctors = async (req, res) => {
    const { page = 1, limit = 20, offset = 0 } = req.pagination || {};
    try {
        const [rows] = await db.execute('SELECT * FROM doctors WHERE available = 0 ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
        res.json({ doctors: rows, pagination: { page, limit, total: rows.length }, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_pending_doctors' });
        res.status(500).json({ error: 'Failed to fetch pending doctors' });
    }
};

export const getDoctorAnalytics = async (req, res) => {
    try {
        const [bySpecialty] = await db.execute('SELECT specialty, COUNT(*) as doctors FROM doctors GROUP BY specialty ORDER BY doctors DESC');
        const [[counts]] = await db.execute('SELECT COUNT(*) as total, SUM(available=1) as available_doctors FROM doctors');
        res.json({ by_specialty: bySpecialty, summary: counts, timestamp: new Date().toISOString() });
    } catch (error) {
        logError(error, { operation: 'get_doctor_analytics' });
        res.status(500).json({ error: 'Failed to fetch doctor analytics' });
    }
};
