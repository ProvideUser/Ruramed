import axios from 'axios';
import { logger, logError, logSecurityEvent } from './logger.js';
import dotenv from 'dotenv';

dotenv.config();

class BrevoEmailService {
    constructor() {
        this.apiKey = process.env.BREVO_API_KEY;
        this.apiUrl = 'https://api.brevo.com/v3';
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@ruramed.com';
        this.fromName = process.env.FROM_NAME || 'RuraMed';
        
        if (!this.apiKey) {
            throw new Error('BREVO_API_KEY is required in environment variables');
        }
    }

    async sendEmail(to, subject, htmlContent, textContent = null) {
        try {
            const response = await axios.post(
                `${this.apiUrl}/smtp/email`,
                {
                    sender: {
                        name: this.fromName,
                        email: this.fromEmail
                    },
                    to: [{ email: to }],
                    subject: subject,
                    htmlContent: htmlContent,
                    textContent: textContent || this.stripHtml(htmlContent)
                },
                {
                    headers: {
                        'accept': 'application/json',
                        'api-key': this.apiKey,
                        'content-type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            logger.info('Email sent successfully', {
                to: to,
                subject: subject,
                messageId: response.data.messageId,
                category: 'email_service'
            });

            return { success: true, messageId: response.data.messageId };
        } catch (error) {
            logError(error, {
                context: 'brevo_email_send_failed',
                to: to,
                subject: subject,
                status: error.response?.status,
                error_data: error.response?.data
            });

            return { success: false, error: error.message };
        }
    }

    async sendOTP(email, otp, otpType, expiresInMinutes = 10) {
        const templates = {
            signup: {
                subject: 'Welcome to RuraMed - Verify Your Account',
                template: this.getSignupOTPTemplate(otp, expiresInMinutes)
            },
            forgot_password: {
                subject: 'RuraMed - Password Reset Verification',
                template: this.getForgotPasswordOTPTemplate(otp, expiresInMinutes)
            },
            email_verification: {
                subject: 'RuraMed - Verify Your Email Address', 
                template: this.getEmailVerificationOTPTemplate(otp, expiresInMinutes)
            }
        };

        const { subject, template } = templates[otpType] || templates.signup;

        logSecurityEvent('otp_email_sent', {
            email: email,
            otp_type: otpType,
            expires_in_minutes: expiresInMinutes
        }, null, null);

        return await this.sendEmail(email, subject, template);
    }

    getSignupOTPTemplate(otp, expiresInMinutes) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
                .header { background-color: #2E8B57; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px 20px; background-color: #f9f9f9; }
                .otp-code { font-size: 32px; font-weight: bold; color: #2E8B57; text-align: center; padding: 20px; background-color: #e8f5e8; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
                .warning { color: #d9534f; font-size: 14px; margin-top: 20px; }
                .footer { background-color: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>🏥 Welcome to RuraMed</h1>
                </div>
                <div class="content">
                    <h2>Verify Your Account</h2>
                    <p>Thank you for signing up with RuraMed! To complete your registration, please use the verification code below:</p>
                    
                    <div class="otp-code">${otp}</div>
                    
                    <p><strong>This code will expire in ${expiresInMinutes} minutes.</strong></p>
                    
                    <p>If you didn't create an account with RuraMed, please ignore this email.</p>
                    
                    <div class="warning">
                        <p><strong>Security Notice:</strong> Never share this code with anyone. RuraMed will never ask for your verification code over phone or email.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2025 RuraMed. All rights reserved.</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getForgotPasswordOTPTemplate(otp, expiresInMinutes) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
                .header { background-color: #d9534f; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px 20px; background-color: #f9f9f9; }
                .otp-code { font-size: 32px; font-weight: bold; color: #d9534f; text-align: center; padding: 20px; background-color: #fdf2f2; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
                .warning { color: #d9534f; font-size: 14px; margin-top: 20px; }
                .footer { background-color: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>🔒 Password Reset - RuraMed</h1>
                </div>
                <div class="content">
                    <h2>Reset Your Password</h2>
                    <p>We received a request to reset your RuraMed account password. Use the verification code below to proceed:</p>
                    
                    <div class="otp-code">${otp}</div>
                    
                    <p><strong>This code will expire in ${expiresInMinutes} minutes.</strong></p>
                    
                    <p>If you didn't request a password reset, please ignore this email and consider changing your password for security.</p>
                    
                    <div class="warning">
                        <p><strong>Security Alert:</strong> If you suspect unauthorized access to your account, please contact our support team immediately.</p>
                    </div>
                </div>
                <div class="footer">
                    <p>&copy; 2025 RuraMed. All rights reserved.</p>
                    <p>This is an automated message, please do not reply.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    getEmailVerificationOTPTemplate(otp, expiresInMinutes) {
        return `
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                .email-container { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; }
                .header { background-color: #5bc0de; color: white; padding: 20px; text-align: center; }
                .content { padding: 30px 20px; background-color: #f9f9f9; }
                .otp-code { font-size: 32px; font-weight: bold; color: #5bc0de; text-align: center; padding: 20px; background-color: #e6f7ff; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
                .footer { background-color: #333; color: white; padding: 20px; text-align: center; font-size: 12px; }
            </style>
        </head>
        <body>
            <div class="email-container">
                <div class="header">
                    <h1>📧 Email Verification - RuraMed</h1>
                </div>
                <div class="content">
                    <h2>Verify Your Email</h2>
                    <p>Please use the verification code below to verify your email address:</p>
                    
                    <div class="otp-code">${otp}</div>
                    
                    <p><strong>This code will expire in ${expiresInMinutes} minutes.</strong></p>
                </div>
                <div class="footer">
                    <p>&copy; 2025 RuraMed. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        `;
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    }
}

export const emailService = new BrevoEmailService();
export default emailService;
