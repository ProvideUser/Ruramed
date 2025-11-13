RuraMed Backend API Documentation - Part 1: Foundation & Security
Project Overview
RuraMed Backend v2.0.0 - Healthcare Medicine Delivery Platform Backend

Base URL: http://localhost:5000/api

Technology Stack:

Framework: Express 5.1.0

Database: MySQL2 (Promise-based)

Authentication: JWT (jsonwebtoken)

Password Security: bcryptjs (12 rounds)

File Uploads: Multer 2.0.1

Logging: Winston 3.18.3

Validation: Validator.js

API Calls: Axios (geocoding services)

Environment Configuration
Required Environment Variables
text
# Database Configuration
DB_HOST=localhost
DB_USER=dev
DB_PASSWORD=password
DB_DATABASE=ruramed_db
DB_CONNECTION_LIMIT=20

# Application
PORT=5000
NODE_ENV=development
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Authentication & Security
JWT_SECRET=ruramed_super_secret_jwt_key_2025
BCRYPT_ROUNDS=12
SESSION_DURATION=2592000  # 30 days in seconds
OTP_EXPIRY_MINUTES=10
MAX_OTP_ATTEMPTS=5

# Email Service (Brevo)
BREVO_API_KEY=your_api_key_here
FROM_EMAIL=noreply@ruramed.com
FROM_NAME=RuraMed

# Logging
LOG_LEVEL=info  # error | warn | info | debug
Database Configuration
Connection Pool Settings
Max Connections: 20 simultaneous connections

Idle Timeout: 5 minutes

Timezone: IST (+05:30) - All timestamps in Indian Standard Time

Character Set: UTF-8 (utf8mb4) for emoji/multilingual support

SSL: Enabled in production only

Health Check
Endpoint: GET /api/health/database

Critical Tables Verified:

users - User accounts

doctors - Doctor profiles

medicines - Medicine catalog

orders - Order records

addresses - Delivery addresses

user_sessions - Active sessions

device_tracking - Device fingerprints

rate_limits - Rate limiting records

Authentication & Authorization
Authentication Flow
For Users
Login via POST /api/auth/login

Receive JWT token + x-session-id in response headers

Store both securely (localStorage/sessionStorage)

Include in all subsequent requests:

javascript
headers: {
  'Authorization': 'Bearer <JWT_TOKEN>',
  'x-session-id': '<SESSION_ID>'
}
For Admins
Login via POST /api/admin/login

Receive JWT token (no session required)

Include in all subsequent requests:

javascript
headers: {
  'Authorization': 'Bearer <JWT_TOKEN>'
}
JWT Token Structure
json
{
  "id": 123,
  "email": "user@example.com",
  "role": "user" | "admin",
  "iat": 1730000000,
  "exp": 1732592000
}
Token Expiration: 30 days (2,592,000 seconds)

Required Headers
Header	Required For	Format	Example
Authorization	All authenticated requests	Bearer <token>	Bearer eyJhbGciOiJIUzI1NiIs...
x-session-id	User requests only (not admins)	UUID string	a1b2c3d4e5f6g7h8i9j0
x-timezone	Optional	IANA timezone	Asia/Kolkata
Content-Type	POST/PUT requests	MIME type	application/json
Frontend Integration Example
javascript
// Login and store credentials
const login = async (email, password) => {
  const response = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  // Store tokens
  localStorage.setItem('jwt_token', data.token);
  localStorage.setItem('session_id', response.headers.get('x-session-id'));
  
  return data;
};

// Make authenticated request
const fetchUserProfile = async () => {
  const response = await fetch('http://localhost:5000/api/users/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`,
      'x-session-id': localStorage.getItem('session_id')
    }
  });
  
  return response.json();
};
Authentication Error Responses
Status	Error	Cause	Action
401	Authorization header missing or malformed	No Bearer token	Include Authorization: Bearer <token>
401	Session ID required	Missing x-session-id (users only)	Include x-session-id header
401	Token expired	JWT exp timestamp passed	Re-login to get new token
401	Session invalid or revoked	Session not found or expired	Re-login to create new session
403	Invalid token	JWT signature verification failed	Re-login with valid credentials
403	User/Admin not found or disabled	ID/email not in database	Account may be deleted/disabled
403	Admin access required	Non-admin accessing admin route	Use admin account
Security Features
Device Fingerprinting
Every request automatically generates a device fingerprint based on:

User-Agent

Accept-Language

Accept-Encoding

IP Address

Device Info Attached to Request:

json
{
  "fingerprint": "a1b2c3d4e5f6g7h8...",
  "browser": "Chrome" | "Firefox" | "Safari" | "Edge",
  "os": "Windows" | "macOS" | "Linux" | "Android" | "iOS",
  "device": "Desktop" | "Mobile" | "Tablet",
  "ip": "192.168.1.1"
}
Session Management
User Sessions Tracked:

Stored in user_sessions table

Duration: 30 days

Tracks: IP, user-agent, device fingerprint, last activity

Automatically extended on activity

Can be revoked via logout

Session Requirements:

Users: JWT + Active Session (both required)

Admins: JWT only (sessions bypassed)

Rate Limiting
Default Limits:

100 requests per 15 minutes per IP

50 requests per 15 minutes per device

Block duration: 1 hour when exceeded

Rate Limit Response:

json
{
  "error": "Too Many Requests",
  "message": "Your access has been temporarily blocked due to suspicious activity",
  "retryAfter": 3600,
  "blocked": true
}
Security Headers (Auto-Applied)
text
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
X-Request-ID: req_1730000000_abc123xyz
Security Events Logged
Unauthorized access attempts (401/403)

Rate limit violations

Invalid/expired tokens

Suspicious path access (admin, config, env, ..)

Failed login attempts

Device/IP changes

Error Handling
Standard Error Response Format
json
{
  "error": "Error message",
  "status": 400,
  "message": "Detailed description",
  "timestamp": "2025-10-26T18:00:00.000Z",
  "path": "/api/endpoint",
  "method": "POST",
  "requestId": "req_1730000000_abc123xyz"
}
HTTP Status Code Reference
Status	Meaning	Common Causes
200	Success	Request completed successfully
201	Created	Resource created successfully
400	Bad Request	Validation error, missing fields, invalid format
401	Unauthorized	Missing/invalid authentication
403	Forbidden	Insufficient permissions
404	Not Found	Endpoint or resource doesn't exist
409	Conflict	Duplicate entry (email/phone already exists)
413	Payload Too Large	Request body > 10MB or file > size limit
429	Too Many Requests	Rate limit exceeded
500	Internal Server Error	Server/database error
503	Service Unavailable	Database connection failed
Database-Specific Errors
Error Code	Status	Message
ER_DUP_ENTRY	409	"Email already exists" or "Phone number already exists"
ER_NO_REFERENCED_ROW_2	400	"Referenced record does not exist"
ER_ROW_IS_REFERENCED_2	400	"Cannot delete - record is referenced by other data"
ECONNREFUSED	503	"Database connection failed"
File Upload Errors
Error Code	Status	Message
LIMIT_FILE_SIZE	413	"File too large"
LIMIT_UNEXPECTED_FILE	400	"Unexpected file field"
entity.too.large	413	"Request entity too large"
Validation Rules
User Registration
Endpoint: POST /api/auth/register

Required Fields:

json
{
  "name": "string (min 2, max 100 chars)",
  "email": "string (valid email format)",
  "phone": "string (10 digits, starting with 6-9)",
  "password": "string (min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char)",
  "location": "string (optional, max 255 chars)"
}
Password Requirements:

Minimum 8 characters

At least 1 uppercase letter (A-Z)

At least 1 lowercase letter (a-z)

At least 1 number (0-9)

At least 1 special character (!@#$%^&*(),.?":{}|<>)

NOT a common password (password, 123456, etc.)

Phone Format:

Indian mobile: 10 digits starting with 6, 7, 8, or 9

Examples: 9876543210, +919876543210, 919876543210

Stored as: 9876543210 (normalized to 10 digits)

Email Format:

Standard RFC 5322 format

Max 254 characters

Auto-lowercase and trimmed

Address Validation
Endpoint: POST /api/addresses

Required Fields:

json
{
  "address_line1": "string (min 5, max 255 chars)",
  "city": "string (min 2, max 100 chars)",
  "state": "string (min 2, max 100 chars)",
  "postal_code": "string (6 digits - Indian PIN)",
  "latitude": "number (optional, -90 to 90)",
  "longitude": "number (optional, -180 to 180)"
}
Indian PIN Code: 6-digit number (e.g., 560001, 110001)

Order Validation
Endpoint: POST /api/orders

Required Fields:

json
{
  "medicines": [
    {
      "id": "integer (medicine ID)",
      "quantity": "integer (1-100)"
    }
  ],
  "address_id": "integer (user's address ID)"
}
Rules:

At least 1 medicine required

Quantity: 1-100 per medicine

address_id must belong to authenticated user

Prescription Upload
Endpoint: POST /api/orders (with file upload)

File Requirements:

Allowed Types: JPG, JPEG, PNG, PDF

Max Size: 5MB per file

MIME Types: image/jpeg, image/png, application/pdf

Field Name: prescription

Multiple Files: Supported

Example (JavaScript):

javascript
const formData = new FormData();
formData.append('prescription', fileInput.files[0]);
formData.append('medicines', JSON.stringify([{id: 1, quantity: 2}]));
formData.append('address_id', 3);

fetch('http://localhost:5000/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-session-id': sessionId
  },
  body: formData
});
Pagination Parameters
Query Params:

text
?page=1&limit=10
Rules:

page: Min 1, default 1

limit: Min 1, max 100, default 10

Returns: { page, limit, offset: (page-1)*limit }

Search Query Validation
Endpoint: GET /api/medicines/search, GET /api/doctors/search

Query Params:

text
?q=paracetamol&category=painkiller&location=bangalore
Rules:

q: Min 2 chars, max 100 chars (search term)

category: Max 50 chars (optional)

location: Max 100 chars (optional)

At least ONE of (q, category, location) required

Validation Error Response
json
{
  "error": "Validation failed",
  "details": [
    "email: Invalid email format",
    "phone: Phone number must be 10 digits",
    "password: Password must contain at least 8 characters, one uppercase letter"
  ],
  "timestamp": "2025-10-26T18:00:00.000Z"
}
Logging System
Log Files (in /logs directory)
File	Content	Max Size	Rotation
error.log	Errors and exceptions	10MB	5 files
combined.log	All application logs	10MB	10 files
security.log	Auth events, security violations	5MB	5 files
audit.log	Data modifications, sensitive operations	20MB	15 files
exceptions.log	Uncaught exceptions	10MB	3 files
rejections.log	Unhandled promise rejections	10MB	3 files
Log Levels
error - Errors, exceptions, failures

warn - Security events, rate limits, slow queries

info - API requests, database operations, events

debug - Development debugging (not in production)

Automatic Logging
All HTTP Requests Logged:

Method, URL, status code

Response time (milliseconds)

User ID (if authenticated)

IP address, User-Agent

Request ID (for tracing)

Security Events Logged:

Failed authentication attempts

Rate limit violations

Unauthorized access attempts

Suspicious activity patterns

Session anomalies

Performance Monitoring:

Slow queries (> 1000ms)

Slow operations (> 5000ms)

High memory usage (> 500MB in dev)

High connection count (> 15 in dev)

Request ID Tracing
Every request receives a unique ID:

text
X-Request-ID: req_1730000000_abc123xyz
Use this ID to trace logs for specific requests across all log files.

CORS Configuration
Allowed Origins:

Development: http://localhost:3000, http://localhost:3001

Production: Configured via FRONTEND_URL environment variable

CORS Headers:

text
Access-Control-Allow-Origin: http://localhost:3000
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type, x-session-id, x-timezone
Static File Access
Base URL: http://localhost:5000/uploads

Directory Structure:

text
/uploads/profiles/       - User profile pictures
/uploads/documents/      - User documents
/uploads/prescriptions/  - Prescription files
/uploads/medicines/      - Medicine images
Example:

text
http://localhost:5000/uploads/profiles/user_123_avatar.jpg
http://localhost:5000/uploads/prescriptions/prescription_456.pdf
Health Check Endpoints
Basic Health Check
Endpoint: GET /api/health

Response:

json
{
  "status": "success",
  "message": "RuraMed API is running",
  "version": "2.0.0",
  "environment": "development",
  "uptime": 3600,
  "timestamp": "2025-10-26T18:00:00.000Z"
}
System Health Check
Endpoint: GET /api/health/system

Returns server memory usage, CPU stats, and system metrics.

Database Health Check
Endpoint: GET /api/health/database

Verifies database connectivity and critical table accessibility.

Cache Health Check
Endpoint: GET /api/health/cache

Returns cache statistics and hit rates.