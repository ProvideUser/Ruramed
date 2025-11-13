// ============================================================================
// RuraMed Super Simple Admin Creation Script
// Save as: create-admin-simple.js
// Run: node create-admin-simple.js
// ============================================================================

import bcrypt from 'bcrypt';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import readline from 'readline';

dotenv.config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const prompt = (question) => {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer.trim());
        });
    });
};

const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

const validatePassword = (password) => {
    const errors = [];
    
    if (password.length < 8) errors.push('at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
    if (!/\d/.test(password)) errors.push('one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('one special character');

    return { isValid: errors.length === 0, errors };
};

const createAdmin = async () => {
    try {
        console.log('🚀 RuraMed Admin Creation Script');
        console.log('═'.repeat(40));
        
        // Get name
        const name = await prompt('👤 Admin Name: ');
        if (!name) {
            console.log('❌ Name is required');
            process.exit(1);
        }
        
        // Get email with validation
        let email;
        do {
            email = await prompt('📧 Admin Email: ');
            if (!email) {
                console.log('❌ Email is required');
                continue;
            }
            if (!validateEmail(email)) {
                console.log('❌ Invalid email format');
                email = null;
            }
        } while (!email);
        
        // Get password with validation
        console.log('\n🔐 Password Requirements: 8+ chars, uppercase, lowercase, number, special char');
        let password;
        do {
            password = await prompt('🔑 Password: ');
            if (!password) {
                console.log('❌ Password is required');
                continue;
            }
            
            const validation = validatePassword(password);
            if (!validation.isValid) {
                console.log(`❌ Password needs: ${validation.errors.join(', ')}`);
                password = null;
            }
        } while (!password);
        
        // Confirm password
        const confirmPassword = await prompt('🔑 Confirm Password: ');
        if (password !== confirmPassword) {
            console.log('❌ Passwords do not match');
            process.exit(1);
        }
        
        // Connect to database
        console.log('\n🔌 Connecting to database...');
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_DATABASE || 'ruramed_db',
            port: process.env.DB_PORT || 3306
        });
        
        // Hash and create admin
        console.log('🔐 Hashing password...');
        const hashedPassword = await bcrypt.hash(password, 12);
        
        console.log('💾 Creating admin...');
        const [result] = await connection.execute(
            `INSERT INTO admins (name, email, password, created_at) 
             VALUES (?, ?, ?, NOW())
             ON DUPLICATE KEY UPDATE 
             password = VALUES(password), name = VALUES(name)`,
            [name, email.toLowerCase(), hashedPassword]
        );
        
        console.log('\n🎉 SUCCESS!');
        console.log('═'.repeat(40));
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
        console.log(`🆔 ${result.insertId ? 'Created' : 'Updated'} admin successfully!`);
        console.log('═'.repeat(40));
        
        // Verify creation
        const [verify] = await connection.execute(
            'SELECT id, name, email FROM admins WHERE email = ?',
            [email.toLowerCase()]
        );
        
        if (verify.length > 0) {
            console.log('\n✅ Admin verified in database:');
            console.log(`   ID: ${verify[0].id}`);
            console.log(`   Name: ${verify[0].name}`);
            console.log(`   Email: ${verify[0].email}`);
        }
        
        await connection.end();
        
    } catch (error) {
        console.error('\n❌ Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Check if MySQL is running');
        } else if (error.code === 'ER_NO_SUCH_TABLE') {
            console.error('💡 Run your database schema first');
        }
        
        process.exit(1);
    } finally {
        rl.close();
    }
};

createAdmin();
