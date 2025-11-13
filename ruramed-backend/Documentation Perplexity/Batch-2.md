RuraMed Backend API Documentation - Part 2: Complete API Reference
API Endpoints Overview
Base URL: http://localhost:5000/api

Total Endpoints: 136 endpoints across 10 modules

Authentication Module (/api/auth)
POST /api/auth/register
Purpose: User registration with OTP email verification (2-step process)

Rate Limit: 5 requests/15min per IP

Step 1: Request OTP

javascript
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!",
  "location": "Bangalore" // optional
}

Response (202 Accepted):
{
  "message": "OTP sent to your email. Please verify to complete registration",
  "email_verification_required": true,
  "expires_at": "2025-10-27T00:10:00.000Z"
}
Step 2: Complete Registration

javascript
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!",
  "location": "Bangalore",
  "otp": "123456" // 6-digit code from email
}

Response (201 Created):
{
  "message": "User registered successfully",
  "user_id": 123,
  "email_verification_required": false
}
Validation Rules:

name: Min 2 chars, max 100 chars, letters/spaces/hyphens only

email: Valid email format, max 254 chars, auto-lowercase

phone: 10 digits starting with 6-9 (Indian format)

password: Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char

location: Optional, max 255 chars

Error Responses:

409 Conflict - Email or phone already exists

400 Bad Request - Invalid OTP or validation error

POST /api/auth/login
Purpose: User authentication

Rate Limit: 3 requests/15min per IP (strict)

javascript
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!"
}

Response (200 OK):
Headers:
  x-session-id: a1b2c3d4e5f6g7h8...

Body:
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "sessionId": "a1b2c3d4e5f6g7h8...",
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "location": "Bangalore"
  }
}
Frontend Storage:

javascript
// Store both token and session ID
localStorage.setItem('jwt_token', response.token);
localStorage.setItem('session_id', response.sessionId);
Error Responses:

401 Unauthorized - Invalid email or password

POST /api/auth/logout
Purpose: End user session

Authentication: Required

javascript
POST /api/auth/logout
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "message": "Logout successful"
}
Database Effects:

Sets session is_active = 0

Clears user from cache

GET /api/auth/profile
Purpose: Get current user profile

Authentication: Required

javascript
GET /api/auth/profile
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "user": {
    "id": 123,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "9876543210",
    "location": "Bangalore",
    "created_at": "2025-10-01T12:00:00.000Z"
  }
}
PUT /api/auth/profile
Purpose: Update user profile

Authentication: Required

javascript
PUT /api/auth/profile
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>
Content-Type: application/json

{
  "name": "John Updated",      // optional
  "phone": "9876543211",        // optional
  "location": "Mumbai"          // optional
}

Response (200 OK):
{
  "message": "Profile updated successfully"
}
Rules:

At least one field required

Email cannot be changed via this endpoint

Password update requires separate flow

POST /api/auth/forgot-password
Purpose: Initiate password reset (sends OTP to email)

javascript
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "john@example.com"
}

Response (200 OK):
{
  "message": "OTP sent to your email",
  "expires_at": "2025-10-27T00:10:00.000Z"
}
Security: Always returns 200 even if email doesn't exist (prevents enumeration)

POST /api/auth/verify-otp
Purpose: Verify OTP code

javascript
POST /api/auth/verify-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "otp_type": "forgot_password"  // or "email_verification"
}

Response (200 OK):
{
  "message": "OTP verified successfully",
  "otp_type": "forgot_password"
}
OTP Types:

email_verification - During registration

forgot_password - For password reset

phone_verification - Phone number verification (future)

Error Responses:

400 Bad Request - Invalid or expired OTP

Max 5 attempts tracked per email

POST /api/auth/reset-password
Purpose: Reset password using verified OTP

javascript
POST /api/auth/reset-password
Content-Type: application/json

{
  "email": "john@example.com",
  "otp": "123456",
  "new_password": "NewSecurePass123!"
}

Response (200 OK):
{
  "message": "Password has been reset successfully"
}
Security Effects:

All active sessions invalidated

User must re-login

User cache cleared

POST /api/auth/resend-otp
Purpose: Resend OTP code

javascript
POST /api/auth/resend-otp
Content-Type: application/json

{
  "email": "john@example.com",
  "otp_type": "forgot_password"
}

Response (200 OK):
{
  "message": "OTP sent",
  "expires_at": "2025-10-27T00:10:00.000Z"
}
Medicine Module (/api/medicines)
Rate Limit: 100 requests/15min per IP

GET /api/medicines
Purpose: List all medicines with pagination

Authentication: Not required

javascript
GET /api/medicines?page=1&limit=10

Response (200 OK):
{
  "medicines": [
    {
      "id": 1,
      "name": "Paracetamol 500mg",
      "manufacturer": "PharmaCo",
      "category": "Painkiller",
      "form": "tablet",
      "strength": "500mg",
      "price": 45.00,
      "mrp": 50.00,
      "stock": 100,
      "image_url": "/uploads/medicines/paracetamol.jpg",
      "prescription_required": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "total_pages": 15
  }
}
Query Parameters:

page: Page number (default: 1, min: 1)

limit: Items per page (default: 10, min: 1, max: 100)

GET /api/medicines/search
Purpose: Search medicines by name, category, or location

Authentication: Not required

javascript
GET /api/medicines/search?q=paracetamol&category=painkiller&page=1&limit=10

Response (200 OK):
{
  "medicines": [...],
  "search": {
    "query": "paracetamol",
    "category": "painkiller",
    "results_count": 5
  },
  "pagination": {...}
}
Query Parameters:

q: Search term (min 2 chars, max 100 chars)

category: Filter by category (optional)

location: Filter by availability (optional)

page, limit: Pagination

Validation: At least ONE of (q, category, location) required

GET /api/medicines/categories
Purpose: Get all medicine categories

Authentication: Not required

javascript
GET /api/medicines/categories

Response (200 OK):
{
  "categories": [
    "Painkiller",
    "Antibiotic",
    "Antacid",
    "Vitamin",
    "Diabetes",
    "Blood Pressure"
  ]
}
GET /api/medicines/forms
Purpose: Get all medicine forms

Authentication: Not required

javascript
GET /api/medicines/forms

Response (200 OK):
{
  "forms": [
    "tablet",
    "capsule",
    "syrup",
    "injection",
    "cream",
    "drops",
    "inhaler"
  ]
}
GET /api/medicines/popular
Purpose: Get popular/trending medicines

Authentication: Not required

javascript
GET /api/medicines/popular?page=1&limit=10

Response (200 OK):
{
  "medicines": [...],
  "pagination": {...}
}
GET /api/medicines/:id
Purpose: Get single medicine details

Authentication: Not required

javascript
GET /api/medicines/123

Response (200 OK):
{
  "medicine": {
    "id": 123,
    "name": "Paracetamol 500mg",
    "manufacturer": "PharmaCo",
    "category": "Painkiller",
    "form": "tablet",
    "strength": "500mg",
    "price": 45.00,
    "mrp": 50.00,
    "stock": 100,
    "generic_name": "Acetaminophen",
    "short_description": "Pain relief and fever reducer",
    "image_url": "/uploads/medicines/paracetamol.jpg",
    "prescription_required": false,
    "created_at": "2025-01-01T00:00:00.000Z"
  }
}
POST /api/medicines (Admin Only)
Purpose: Create new medicine

Authentication: Admin required

javascript
POST /api/medicines
Headers:
  Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "name": "Aspirin 75mg",
  "manufacturer": "MediCorp",
  "category": "Blood Thinner",
  "form": "tablet",
  "strength": "75mg",
  "price": 30.00,
  "mrp": 35.00,
  "stock": 200,
  "generic_name": "Acetylsalicylic Acid",
  "short_description": "Blood thinner for heart health",
  "prescription_required": false
}

Response (201 Created):
{
  "message": "Medicine created successfully",
  "medicine_id": 456
}
Validation:

All fields required except generic_name, short_description

price must be ≤ mrp

form must be one of: tablet, capsule, syrup, injection, cream, drops, inhaler

PUT /api/medicines/:id (Admin Only)
Purpose: Update medicine

Authentication: Admin required

javascript
PUT /api/medicines/456
Headers:
  Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "price": 28.00,
  "stock": 250
}

Response (200 OK):
{
  "message": "Medicine updated successfully"
}
DELETE /api/medicines/:id (Admin Only)
Purpose: Delete medicine

Authentication: Admin required

javascript
DELETE /api/medicines/456
Headers:
  Authorization: Bearer <admin_jwt_token>

Response (200 OK):
{
  "message": "Medicine deleted successfully"
}
User Module (/api/users)
Authentication: Required for all endpoints

Rate Limit: 50 requests/15min per IP

GET /api/users/orders
Purpose: Get user's order history

javascript
GET /api/users/orders?page=1&limit=10&start_date=2025-10-01&end_date=2025-10-31
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "orders": [
    {
      "id": 789,
      "order_number": "ORD-2025-789",
      "status": "delivered",
      "total_amount": 450.00,
      "created_at": "2025-10-15T10:30:00.000Z",
      "delivered_at": "2025-10-17T14:20:00.000Z",
      "items_count": 3
    }
  ],
  "pagination": {...}
}
Query Parameters:

page, limit: Pagination

start_date, end_date: ISO date strings (optional)

GET /api/users/orders/:orderId
Purpose: Get specific order details

Ownership: Verified (user must own the order)

javascript
GET /api/users/orders/789
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "order": {
    "id": 789,
    "order_number": "ORD-2025-789",
    "status": "delivered",
    "total_amount": 450.00,
    "medicines": [
      {
        "id": 1,
        "name": "Paracetamol 500mg",
        "quantity": 2,
        "price": 45.00,
        "subtotal": 90.00
      }
    ],
    "delivery_address": {...},
    "prescription_url": "/uploads/prescriptions/prescription_789.pdf",
    "tracking_number": "TRK123456",
    "created_at": "2025-10-15T10:30:00.000Z"
  }
}
GET /api/users/addresses
Purpose: Get user's saved addresses

javascript
GET /api/users/addresses
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "addresses": [
    {
      "id": 1,
      "address_line1": "123 Main Street, Apt 4B",
      "city": "Bangalore",
      "state": "Karnataka",
      "postal_code": "560001",
      "is_default": true,
      "latitude": 12.9716,
      "longitude": 77.5946
    }
  ]
}
GET /api/users/sessions
Purpose: List all active sessions

javascript
GET /api/users/sessions
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "sessions": [
    {
      "session_id": "a1b2c3...",
      "ip_address": "192.168.1.1",
      "device": "Desktop",
      "browser": "Chrome",
      "os": "Windows",
      "last_activity": "2025-10-27T00:00:00.000Z",
      "is_current": true
    }
  ]
}
DELETE /api/users/sessions/:sessionId
Purpose: Revoke specific session

javascript
DELETE /api/users/sessions/a1b2c3...
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "message": "Session revoked successfully"
}
DELETE /api/users/sessions
Purpose: Revoke all sessions except current

javascript
DELETE /api/users/sessions
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "message": "All other sessions revoked",
  "revoked_count": 3
}
Address Module (/api/addresses)
Authentication: Required for all endpoints

Rate Limit: 30 requests/15min per IP

POST /api/addresses
Purpose: Create new address

javascript
POST /api/addresses
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>
Content-Type: application/json

{
  "address_line1": "123 Main Street, Apt 4B",
  "city": "Bangalore",
  "state": "Karnataka",
  "postal_code": "560001",
  "latitude": 12.9716,    // optional, auto-geocoded if not provided
  "longitude": 77.5946    // optional
}

Response (201 Created):
{
  "message": "Address created successfully",
  "address_id": 1,
  "coordinates": {
    "latitude": 12.9716,
    "longitude": 77.5946
  }
}
Validation:

address_line1: Min 5 chars, max 255 chars

city: Min 2 chars, max 100 chars

state: Min 2 chars, max 100 chars

postal_code: 6 digits (Indian PIN code)

latitude: -90 to 90 (optional)

longitude: -180 to 180 (optional)

PUT /api/addresses/:id
Purpose: Update address

Ownership: Verified

javascript
PUT /api/addresses/1
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>
Content-Type: application/json

{
  "address_line1": "456 New Street",
  "city": "Mumbai"
}

Response (200 OK):
{
  "message": "Address updated successfully"
}
PATCH /api/addresses/:id/set-default
Purpose: Set address as default

Ownership: Verified

javascript
PATCH /api/addresses/1/set-default
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "message": "Default address updated"
}
GET /api/addresses/:id/service-check
Purpose: Check if delivery available to this address

Ownership: Verified

javascript
GET /api/addresses/1/service-check
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "service_available": true,
  "delivery_fee": 50.00,
  "estimated_time": "2-3 days",
  "service_area": "Bangalore Central"
}
Order Module (/api/orders)
Authentication: Required for all endpoints

Rate Limit: 20 requests/15min per IP (stricter)

POST /api/orders
Purpose: Create new order

javascript
POST /api/orders
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>
Content-Type: multipart/form-data

Form Data:
  medicines: [{"id": 1, "quantity": 2}, {"id": 5, "quantity": 1}]
  address_id: 1
  prescription: <file> (optional, JPG/PNG/PDF, max 5MB)

Response (201 Created):
{
  "message": "Order created successfully",
  "order": {
    "id": 789,
    "order_number": "ORD-2025-789",
    "status": "pending",
    "total_amount": 450.00,
    "estimated_delivery": "2025-10-29",
    "prescription_required": true,
    "approval_pending": true
  }
}
Validation:

medicines: Array with at least 1 item

Each medicine: id (required), quantity (1-100)

address_id: Must belong to authenticated user

prescription: Optional file upload (validated if provided)

Order Flow:

Pending → Admin approval if prescription uploaded

Approved → Payment & processing

Shipped → Out for delivery

Delivered → Completed

GET /api/orders/:id/tracking
Purpose: Track order status

Ownership: Verified

javascript
GET /api/orders/789/tracking
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "order_id": 789,
  "status": "shipped",
  "tracking_number": "TRK123456",
  "tracking_history": [
    {
      "status": "pending",
      "timestamp": "2025-10-27T10:00:00.000Z",
      "description": "Order placed"
    },
    {
      "status": "approved",
      "timestamp": "2025-10-27T11:00:00.000Z",
      "description": "Prescription approved"
    },
    {
      "status": "shipped",
      "timestamp": "2025-10-27T15:00:00.000Z",
      "description": "Out for delivery"
    }
  ]
}
PATCH /api/orders/:id/cancel
Purpose: Cancel order

Ownership: Verified

Rules: Can only cancel orders in pending or approved status

javascript
PATCH /api/orders/789/cancel
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (200 OK):
{
  "message": "Order cancelled successfully",
  "refund_status": "processing"
}
POST /api/orders/:id/reorder
Purpose: Duplicate previous order

Ownership: Verified

javascript
POST /api/orders/789/reorder
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>

Response (201 Created):
{
  "message": "Reorder created successfully",
  "new_order_id": 790,
  "order_number": "ORD-2025-790"
}
Delivery Module (/api/delivery)
GET /api/delivery/check-service-area (Public)
Purpose: Check if delivery available to coordinates

Authentication: Not required

javascript
GET /api/delivery/check-service-area?lat=12.9716&lng=77.5946

Response (200 OK):
{
  "service_available": true,
  "service_area": "Bangalore Central",
  "coverage_radius": 10,
  "delivery_fee": 50.00
}
Query Parameters:

lat: Latitude (-90 to 90)

lng: Longitude (-180 to 180)

GET /api/delivery/estimate-time (Public)
Purpose: Estimate delivery time

Authentication: Not required

javascript
GET /api/delivery/estimate-time?lat=12.9716&lng=77.5946

Response (200 OK):
{
  "estimated_days": 2,
  "estimated_delivery_date": "2025-10-29",
  "delivery_window": "10:00 AM - 6:00 PM"
}
Doctor Module (/api/doctors)
Rate Limit: 50 requests/15min per IP

GET /api/doctors/search (Public)
Purpose: Search doctors

Authentication: Not required

javascript
GET /api/doctors/search?q=cardiology&specialty=Cardiologist&location=bangalore

Response (200 OK):
{
  "doctors": [
    {
      "id": 1,
      "name": "Dr. Smith",
      "specialty": "Cardiologist",
      "experience": 15,
      "consultation_fee": 500.00,
      "location": "Bangalore",
      "rating": 4.8,
      "available": true
    }
  ],
  "pagination": {...}
}
POST /api/doctors/:id/consultation (User)
Purpose: Book consultation

Authentication: Required

javascript
POST /api/doctors/1/consultation
Headers:
  Authorization: Bearer <jwt_token>
  x-session-id: <session_id>
Content-Type: application/json

{
  "preferred_date": "2025-10-28",
  "preferred_time": "10:00",
  "reason": "Chest pain consultation"
}

Response (201 Created):
{
  "message": "Consultation booked successfully",
  "consultation_id": 456,
  "consultation_date": "2025-10-28T10:00:00.000Z",
  "doctor": {
    "name": "Dr. Smith",
    "specialty": "Cardiologist"
  }
}
Admin Module (/api/admin)
Authentication: Admin required for all endpoints (except login)

Rate Limit: 100 requests/15min per IP

POST /api/admin/login
Purpose: Admin authentication

Authentication: Not required

javascript
POST /api/admin/login
Content-Type: application/json

{
  "email": "admin@ruramed.com",
  "password": "AdminPass123!"
}

Response (200 OK):
{
  "message": "Admin login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "admin": {
    "id": 1,
    "name": "Admin User",
    "email": "admin@ruramed.com",
    "role": "admin"
  }
}
Note: Admins do NOT need x-session-id header (session checks bypassed)

GET /api/admin/dashboard
Purpose: Get dashboard overview

Authentication: Admin required

javascript
GET /api/admin/dashboard
Headers:
  Authorization: Bearer <admin_jwt_token>

Response (200 OK):
{
  "statistics": {
    "total_users": 1500,
    "total_orders": 3200,
    "pending_orders": 45,
    "total_revenue": 450000.00,
    "today_orders": 12,
    "today_revenue": 5400.00
  },
  "recent_activity": [...]
}
GET /api/admin/users
Purpose: List all users

Authentication: Admin required

javascript
GET /api/admin/users?page=1&limit=50
Headers:
  Authorization: Bearer <admin_jwt_token>

Response (200 OK):
{
  "users": [
    {
      "id": 123,
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "9876543210",
      "status": "active",
      "created_at": "2025-10-01T00:00:00.000Z",
      "total_orders": 5,
      "total_spent": 2500.00
    }
  ],
  "pagination": {...}
}
PATCH /api/admin/users/:id/status
Purpose: Enable/disable user account

Authentication: Admin required

javascript
PATCH /api/admin/users/123/status
Headers:
  Authorization: Bearer <admin_jwt_token>
Content-Type: application/json

{
  "status": "inactive"  // or "active"
}

Response (200 OK):
{
  "message": "User status updated successfully"
}
Geocoding Module (/api/geocode)
Authentication: Not required (public endpoints)

Rate Limit: 200 requests/15min per IP

GET /api/geocode/forward
Purpose: Convert address to coordinates

javascript
GET /api/geocode/forward?address=123 Main Street, Bangalore, Karnataka, 560001

Response (200 OK):
{
  "coordinates": {
    "latitude": 12.9716,
    "longitude": 77.5946
  },
  "formatted_address": "123 Main Street, Bangalore, Karnataka 560001, India",
  "confidence": "high"
}
GET /api/geocode/reverse
Purpose: Convert coordinates to address

javascript
GET /api/geocode/reverse?lat=12.9716&lng=77.5946

Response (200 OK):
{
  "address": {
    "street": "Main Street",
    "city": "Bangalore",
    "state": "Karnataka",
    "postal_code": "560001",
    "country": "India"
  },
  "formatted_address": "Main Street, Bangalore, Karnataka 560001, India"
}
GET /api/geocode/distance
Purpose: Calculate distance between two points

javascript
GET /api/geocode/distance?lat1=12.9716&lng1=77.5946&lat2=13.0827&lng2=80.2707

Response (200 OK):
{
  "distance_km": 315.4,
  "distance_miles": 196.0,
  "duration_estimate": "5 hours"
}
Health Check Module (/api/health)
GET /api/health (Public)
Purpose: Basic health check

Authentication: Not required

javascript
GET /api/health

Response (200 OK):
{
  "status": "healthy",
  "message": "RuraMed API is running",
  "version": "2.0.0",
  "uptime": 3600,
  "services": {
    "api": "healthy",
    "database": "healthy",
    "cache": "healthy"
  }
}
GET /api/health/system (Admin Only)
Purpose: Detailed system metrics

Authentication: Admin required

javascript
GET /api/health/system
Headers:
  Authorization: Bearer <admin_jwt_token>

Response (200 OK):
{
  "system": {
    "uptime": 3600,
    "memory": {
      "rss": 150000000,
      "heapUsed": 100000000
    },
    "node_version": "v18.16.0",
    "platform": "linux"
  },
  "services": {
    "database": {
      "status": "healthy",
      "response_time": 45,
      "active_connections": 5
    },
    "cache": {
      "status": "healthy",
      "hit_rate": 0.85
    }
  }
}
Common Patterns
Pagination Pattern
javascript
// All paginated endpoints return:
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "total_pages": 15,
    "has_next": true,
    "has_prev": false
  }
}

// Query params:
?page=1&limit=10
Error Response Pattern
javascript
// All errors return:
{
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2025-10-27T00:00:00.000Z",
  "requestId": "req_1730000000_abc123xyz"  // for debugging
}

// With validation errors:
{
  "error": "Validation failed",
  "details": [
    "email: Invalid email format",
    "phone: Phone number must be 10 digits"
  ],
  "timestamp": "2025-10-27T00:00:00.000Z"
}
File Upload Pattern
javascript
// Multipart form data:
const formData = new FormData();
formData.append('prescription', fileInput.files[0]);
formData.append('medicines', JSON.stringify([...]));

fetch('/api/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'x-session-id': sessionId
    // NO Content-Type header - browser sets it automatically
  },
  body: formData
});
File Requirements:

Max size: 5MB

Allowed types: JPG, JPEG, PNG, PDF

MIME type validated

Magic number validated (prevents file type spoofing)

Testing with Postman
Environment Variables
text
BASE_URL: http://localhost:5000/api
JWT_TOKEN: (set after login)
SESSION_ID: (set after login from x-session-id header)
Collection Structure
text
RuraMed API/
├── Authentication/
│   ├── Register (Step 1 - Request OTP)
│   ├── Register (Step 2 - Complete)
│   ├── Login
│   └── Get Profile
├── Medicines/
│   ├── List Medicines
│   ├── Search Medicines
│   └── Get Medicine Details
├── Orders/
│   ├── Create Order
│   └── Track Order
└── Admin/
    └── Admin Login
Pre-request Script (for authenticated endpoints)
javascript
pm.request.headers.add({
    key: 'Authorization',
    value: 'Bearer ' + pm.environment.get('JWT_TOKEN')
});
pm.request.headers.add({
    key: 'x-session-id',
    value: pm.environment.get('SESSION_ID')
});
Rate Limiting Summary
Endpoint Category	Requests/15min (IP)	Requests/15min (Device)
Auth (general)	5	3
Auth (login)	3	2
Medicines	100	60
Users	50	30
Addresses	30	20
Orders	20	15
Doctors	50	30
Admin	100	50
Geocoding	200	100
When Rate Limited:

json
{
  "error": "Too Many Requests",
  "message": "Your access has been temporarily blocked due to suspicious activity",
  "retryAfter": 3600,
  "blocked": true
}
Frontend Integration Checklist
1. Authentication Setup
javascript
// After login, store credentials
const handleLogin = async (email, password) => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  // Store tokens
  localStorage.setItem('jwt_token', data.token);
  localStorage.setItem('session_id', data.sessionId);
  localStorage.setItem('user', JSON.stringify(data.user));
};
2. Authenticated Request Helper
javascript
const apiRequest = async (endpoint, options = {}) => {
  const token = localStorage.getItem('jwt_token');
  const sessionId = localStorage.getItem('session_id');
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'x-session-id': sessionId,
      ...options.headers
    }
  });
  
  if (response.status === 401) {
    // Token expired, redirect to login
    localStorage.clear();
    window.location.href = '/login';
  }
  
  return response.json();
};
3. Error Handling
javascript
const handleApiError = (error) => {
  if (error.error === 'Token expired') {
    // Redirect to login
    localStorage.clear();
    window.location.href = '/login';
  } else if (error.details) {
    // Validation errors
    error.details.forEach(msg => showToast(msg, 'error'));
  } else {
    // Generic error
    showToast(error.message || 'An error occurred', 'error');
  }
};
4. Two-Step Registration
javascript
const register = async (userData) => {
  // Step 1: Request OTP
  const step1Response = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  });
  
  const step1Data = await step1Response.json();
  
  if (step1Data.email_verification_required) {
    // Show OTP input
    const otp = await promptForOTP();
    
    // Step 2: Complete registration
    const step2Response = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...userData, otp })
    });
    
    return step2Response.json();
  }
};
Batch 2 Documentation Complete
Total Endpoints Documented: 136 endpoints

Coverage:

✅ Authentication (9 endpoints)

✅ Medicines (15 endpoints)

✅ Users (13 endpoints)

✅ Addresses (10 endpoints)

✅ Delivery (17 endpoints)

✅ Doctors (16 endpoints)

✅ Orders (14 endpoints)

✅ Admin (29 endpoints)

✅ Geocoding (9 endpoints)

✅ Health (6 endpoints)