RuraMed Backend API Documentation - Batch 3: Controllers
Complete Business Logic Layer Documentation

Date: October 27, 2025
Version: 2.0.0
Coverage: 8 Controller Files, 100+ Functions

Table of Contents
Overview

Authentication Controller

Medicine Controller

User Controller

Address Controller

Geocoding & Delivery Controller

Doctor Controller

Order Controller

Admin Controller

Common Patterns

Overview
What Are Controllers?
Controllers contain the business logic for each API endpoint. They:

Process incoming requests

Validate data

Interact with the database

Format responses

Handle errors

Log important events

Controller Architecture
text
Request → Route → Middleware → Controller → Database → Response
                     ↓              ↓           ↓
                 Validation    Business      Queries
                 Auth Check    Logic         Updates
File Structure
text
controllers/
├── authController.js       # User authentication & registration
├── medicineController.js   # Medicine catalog management
├── userController.js       # User profile & data
├── addressController.js    # Address CRUD operations
├── geocodingController.js  # Location services & delivery
├── doctorController.js     # Doctor management
├── orderController.js      # Order processing
└── adminController.js      # Admin operations
Authentication Controller
File: controllers/authController.js
Purpose: User authentication, registration, password management

Functions Overview
Function	Auth	Description
register	No	Two-step registration with OTP
verifyOtp	No	Verify OTP code
login	No	User authentication
logout	Yes	End user session
getUserProfile	Yes	Get current user profile
updateUserProfile	Yes	Update profile data
forgotPassword	No	Request password reset OTP
resetPassword	No	Reset password with OTP
resendOtp	No	Resend OTP code
1. User Registration (Two-Step Process)
Step 1: Request OTP
Function: register (first call)

Request Body:

json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!",
  "location": "Bangalore"
}
Process:

Validate all fields

Check if email/phone already exists

Hash password with bcrypt (10 rounds)

Generate 6-digit OTP

Send OTP via Brevo email

Store temporary registration data (5 min expiry)

Database Queries:

sql
-- Check existing user
SELECT id FROM users WHERE email = ? OR phone = ?

-- Store temporary data
INSERT INTO otp_verifications (email, phone, otp_hash, user_data, otp_type, expires_at)
VALUES (?, ?, ?, ?, 'email_verification', DATE_ADD(NOW(), INTERVAL 5 MINUTE))
Response (202 Accepted):

json
{
  "message": "OTP sent to your email. Please verify to complete registration",
  "email_verification_required": true,
  "expires_at": "2025-10-27T00:10:00.000Z"
}
Error Responses:

409 Conflict - Email or phone already exists

500 Internal Server Error - Database or email service error

Step 2: Complete Registration
Function: register (second call with OTP)

Request Body:

json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "9876543210",
  "password": "SecurePass123!",
  "location": "Bangalore",
  "otp": "123456"
}
Process:

Verify OTP matches and not expired

Create user account

Delete OTP record

Log registration event

Database Queries:

sql
-- Verify OTP
SELECT * FROM otp_verifications 
WHERE email = ? AND otp_type = 'email_verification' AND expires_at > NOW()

-- Create user
INSERT INTO users (name, email, phone, password, location)
VALUES (?, ?, ?, ?, ?)

-- Delete OTP
DELETE FROM otp_verifications WHERE email = ?
Response (201 Created):

json
{
  "message": "User registered successfully",
  "user_id": 123,
  "email_verification_required": false
}
Logging:

Auth event: user_registered with user ID, email, IP

Security event: Tracks registration attempts

2. OTP Verification
Function: verifyOtp

Request Body:

json
{
  "email": "john@example.com",
  "otp": "123456",
  "otp_type": "email_verification"
}
OTP Types:

email_verification - Registration

forgot_password - Password reset

phone_verification - Phone number verification

Database Query:

sql
SELECT * FROM otp_verifications 
WHERE email = ? AND otp_type = ? AND expires_at > NOW()
Response (200 OK):

json
{
  "message": "OTP verified successfully",
  "otp_type": "email_verification"
}
Error (Invalid OTP):

json
{
  "error": "Invalid or expired OTP"
}
Security: Max 5 attempts per email tracked

3. User Login
Function: login

Request Body:

json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
Process:

Find user by email

Verify password with bcrypt

Generate JWT token (30-day expiry)

Create session with device fingerprint

Cache user data

Database Queries:

sql
-- Find user
SELECT * FROM users WHERE email = ?

-- Create session
INSERT INTO user_sessions (user_id, session_id, ip_address, device_info, expires_at)
VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 30 DAY))
Response (200 OK):

json
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
Response Headers:

text
x-session-id: a1b2c3d4e5f6g7h8...
Token Payload:

json
{
  "userId": 123,
  "email": "john@example.com",
  "sessionId": "a1b2c3d4...",
  "exp": 1733000000
}
Logging:

Auth event: login_success with IP and device

Security event: Failed attempts logged

Caching:

User data cached for 30 minutes

Session validated on each request

4. User Logout
Function: logout

Headers Required:

text
Authorization: Bearer <jwt_token>
x-session-id: <session_id>
Process:

Verify session exists

Mark session as inactive

Clear user from cache

Database Query:

sql
UPDATE user_sessions 
SET is_active = 0, logout_at = NOW() 
WHERE session_id = ? AND user_id = ?
Response (200 OK):

json
{
  "message": "Logout successful"
}
Logging: Auth event logout_success

5. Get User Profile
Function: getUserProfile

Authentication: Required

Database Query:

sql
SELECT id, name, email, phone, location, created_at 
FROM users WHERE id = ?
Response (200 OK):

json
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
6. Update User Profile
Function: updateUserProfile

Authentication: Required

Request Body (partial update):

json
{
  "name": "John Updated",
  "phone": "9876543211",
  "location": "Mumbai"
}
Database Query:

sql
UPDATE users SET name = ?, phone = ?, location = ? WHERE id = ?
Response (200 OK):

json
{
  "message": "Profile updated successfully"
}
Side Effects:

Clears user cache

Logs update event

7. Forgot Password
Function: forgotPassword

Request Body:

json
{
  "email": "john@example.com"
}
Process:

Generate 6-digit OTP

Send OTP via email

Store OTP hash (10 min expiry)

Database Query:

sql
INSERT INTO otp_verifications (email, otp_hash, otp_type, expires_at)
VALUES (?, ?, 'forgot_password', DATE_ADD(NOW(), INTERVAL 10 MINUTE))
Response (200 OK):

json
{
  "message": "OTP sent to your email",
  "expires_at": "2025-10-27T00:10:00.000Z"
}
Security: Always returns 200 even if email doesn't exist (prevents enumeration)

8. Reset Password
Function: resetPassword

Request Body:

json
{
  "email": "john@example.com",
  "otp": "123456",
  "new_password": "NewSecurePass123!"
}
Process:

Verify OTP valid and not expired

Hash new password

Update user password

Invalidate all sessions

Delete OTP

Database Queries:

sql
-- Verify OTP
SELECT * FROM otp_verifications 
WHERE email = ? AND otp_type = 'forgot_password' AND expires_at > NOW()

-- Update password
UPDATE users SET password = ? WHERE email = ?

-- Invalidate sessions
UPDATE user_sessions SET is_active = 0 WHERE user_id = ?

-- Delete OTP
DELETE FROM otp_verifications WHERE email = ?
Response (200 OK):

json
{
  "message": "Password has been reset successfully"
}
Logging: Security event password_reset with IP tracking

9. Resend OTP
Function: resendOtp

Request Body:

json
{
  "email": "john@example.com",
  "otp_type": "forgot_password"
}
Response (200 OK):

json
{
  "message": "OTP sent",
  "expires_at": "2025-10-27T00:10:00.000Z"
}
Medicine Controller
File: controllers/medicineController.js
Purpose: Medicine catalog management

Functions Overview
Function	Auth	Role	Description
getAllMedicines	No	Public	List medicines with pagination
searchMedicines	No	Public	Search by name/category
getMedicineById	No	Public	Get single medicine
getMedicineCategories	No	Public	Get all categories
getMedicineForms	No	Public	Get all forms
getPopularMedicines	No	Public	Get popular medicines
createMedicine	Yes	Admin	Add new medicine
updateMedicine	Yes	Admin	Update medicine
deleteMedicine	Yes	Admin	Soft delete medicine
updateMedicineStatus	Yes	Admin	Toggle active status
bulkImportMedicines	Yes	Admin	Bulk import
bulkUpdatePrices	Yes	Admin	Bulk price update
getInventoryAnalytics	Yes	Admin	Inventory stats
getPopularityAnalytics	Yes	Admin	Popularity data
1. Get All Medicines
Function: getAllMedicines

Query Parameters:

page: Page number (default: 1)

limit: Items per page (default: 10, max: 100)

category: Optional filter

Database Query:

sql
SELECT * FROM medicines 
WHERE is_active = 1 
AND (category = ? IF category provided)
ORDER BY name ASC 
LIMIT ? OFFSET ?
Response:

json
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
      "sku": "MED-001",
      "image_url": "/uploads/medicines/paracetamol.jpg",
      "prescription_required": false,
      "is_active": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15
  }
}
Ordering: Rating DESC, Experience DESC

2. Search Medicines
Function: searchMedicines

Query Parameters:

q: Search term (min 2 chars)

category: Optional filter

page, limit: Pagination

Database Query:

sql
SELECT * FROM medicines 
WHERE is_active = 1 
AND (name LIKE '%?%' OR generic_name LIKE '%?%' OR short_description LIKE '%?%')
AND (category = ? IF category provided)
ORDER BY name ASC 
LIMIT ? OFFSET ?
Response:

json
{
  "medicines": [...],
  "search": {
    "query": "paracetamol",
    "category": "painkiller"
  },
  "pagination": {...}
}
3. Get Medicine Categories
Function: getMedicineCategories

Database Query:

sql
SELECT DISTINCT category 
FROM medicines 
WHERE is_active = 1
Response:

json
{
  "categories": [
    "Painkiller",
    "Antibiotic",
    "Antacid",
    "Vitamin"
  ],
  "count": 4
}
4. Create Medicine (Admin)
Function: createMedicine

Request Body:

json
{
  "name": "Aspirin 75mg",
  "manufacturer": "MediCorp",
  "category": "Blood Thinner",
  "form": "tablet",
  "strength": "75mg",
  "price": 30.00,
  "mrp": 35.00,
  "stock": 200,
  "sku": "MED-002",
  "generic_name": "Acetylsalicylic Acid",
  "short_description": "Blood thinner",
  "prescription_required": false
}
Response:

json
{
  "message": "Medicine created successfully",
  "medicine_id": 456
}
Logging:

Medicine operation created

Audit trail with full data

Cache invalidated

5. Bulk Import (Admin)
Function: bulkImportMedicines

Request Body:

json
{
  "items": [
    {
      "name": "Medicine 1",
      "manufacturer": "Company A",
      "category": "Category A",
      "form": "tablet",
      "strength": "100mg",
      "price": 50.00,
      "mrp": 55.00,
      "sku": "MED-100"
    }
  ]
}
Process:

Transaction-based (all-or-nothing)

Inserts each item individually

Commits if all succeed

Rollback on any error

Response:

json
{
  "message": "Bulk import completed",
  "inserted": 25
}
User Controller
File: controllers/userController.js
Purpose: User profile and data management

Functions Overview
Function	Description
getUserProfile	Get user profile
updateUserProfile	Update profile
deleteUserAccount	Soft delete account
getUserOrders	Order history
getUserOrderById	Single order details
getUserAddresses	List addresses
getUserPrescriptions	Prescription history
getUserPrescriptionById	Single prescription
getUserConsultations	Consultation history
getUserSessions	List active sessions
revokeUserSession	Revoke single session
revokeAllUserSessions	Revoke all sessions
getUserStats	User statistics
1. Get User Orders
Function: getUserOrders

Query Parameters:

page, limit: Pagination

start_date, end_date: Optional date range

Database Query:

sql
SELECT o.*, a.address_line1, a.city, a.state 
FROM orders o
LEFT JOIN addresses a ON o.address_id = a.id
WHERE o.user_id = ?
AND (o.created_at >= ? IF start_date)
AND (o.created_at <= ? IF end_date)
ORDER BY o.created_at DESC 
LIMIT ? OFFSET ?
Response:

json
{
  "orders": [
    {
      "id": 789,
      "order_number": "ORD-2025-789",
      "status": "delivered",
      "total_amount": 450.00,
      "medicines": [
        {"id": 1, "name": "Medicine A", "quantity": 2}
      ],
      "address_line1": "123 Main St",
      "city": "Bangalore",
      "created_at": "2025-10-15T10:30:00.000Z"
    }
  ],
  "pagination": {...}
}
2. Delete User Account
Function: deleteUserAccount

Safety Checks:

Cannot delete if active orders exist

Status checked: pending, approved, out_for_delivery

Database Queries:

sql
-- Check active orders
SELECT COUNT(*) as count FROM orders 
WHERE user_id = ? 
AND status IN ("pending", "approved", "out_for_delivery")

-- Soft delete (anonymize data)
UPDATE users 
SET email = CONCAT("deleted_", id, "_", email),
    phone = CONCAT("deleted_", phone),
    name = "Deleted User"
WHERE id = ?
Response (Success):

json
{
  "message": "Account deleted successfully"
}
Response (Error):

json
{
  "error": "Cannot delete account",
  "message": "You have active orders. Please wait for completion or contact support."
}
3. Session Management
Function: getUserSessions

Database Query:

sql
SELECT session_id, ip_address, device_info, is_active, last_activity, created_at
FROM user_sessions 
WHERE user_id = ? 
ORDER BY last_activity DESC
Response:

json
{
  "sessions": [
    {
      "session_id": "a1b2c3d4...",
      "ip_address": "192.168.1.1",
      "device_info": {
        "fingerprint": "abc123",
        "browser": "Chrome",
        "os": "Windows"
      },
      "is_active": 1,
      "last_activity": "2025-10-27T00:00:00.000Z"
    }
  ]
}
4. Revoke Session
Function: revokeUserSession

URL Parameter: :sessionId

Database Query:

sql
UPDATE user_sessions 
SET is_active = 0, logout_at = NOW(), logout_reason = "manual" 
WHERE session_id = ? AND user_id = ?
Use Case: User lost phone, wants to log out that device

5. User Statistics
Function: getUserStats

Database Queries:

sql
-- Order stats
SELECT COUNT(*) as total_orders,
       SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered_orders,
       SUM(total_amount) as total_spent
FROM orders WHERE user_id = ?

-- Prescription count
SELECT COUNT(*) as total_prescriptions FROM prescriptions WHERE user_id = ?

-- Consultation count
SELECT COUNT(*) as total_consultations FROM consultations WHERE user_id = ?
Response:

json
{
  "stats": {
    "orders": {
      "total_orders": 25,
      "delivered_orders": 20,
      "total_spent": 11250.00
    },
    "prescriptions": {
      "total_prescriptions": 5
    },
    "consultations": {
      "total_consultations": 3
    }
  }
}
Address Controller
File: controllers/addressController.js
Purpose: Address CRUD operations

Functions Overview
Function	Description
getUserAddresses	List all user addresses
createAddress	Create new address
getAddressById	Get single address
updateAddress	Update address
deleteAddress	Delete address
setDefaultAddress	Set default address
getDefaultAddress	Get default address
validateAddress	Validate address format
geocodeAddress	Convert to coordinates
checkServiceArea	Check delivery availability
1. Create Address
Function: createAddress

Request Body:

json
{
  "address_line1": "123 Main Street, Apt 4B",
  "city": "Bangalore",
  "state": "Karnataka",
  "postal_code": "560001",
  "latitude": 12.9716,
  "longitude": 77.5946,
  "is_default": true
}
Process:

If is_default = true, unset other defaults

If coordinates not provided, attempt geocoding

Insert address

Log event

Geocoding Fallback:

javascript
// If coordinates not provided
const fullAddress = `${address_line1}, ${city}, ${state}, ${postal_code}`;
const coordinates = await geocodeUtil(fullAddress);
if (coordinates) {
  address.latitude = coordinates.lat;
  address.longitude = coordinates.lng;
}
Response:

json
{
  "message": "Address created successfully",
  "address_id": 1
}
2. Delete Address
Function: deleteAddress

Safety Checks:

Cannot delete if used in active orders

If deleted address was default, set another as default

Database Queries:

sql
-- Check active orders
SELECT COUNT(*) as count FROM orders 
WHERE address_id = ? 
AND status IN ("pending", "approved", "out_for_delivery")

-- Delete address
DELETE FROM addresses WHERE id = ? AND user_id = ?

-- Set new default if needed
UPDATE addresses SET is_default = 1 
WHERE user_id = ? 
ORDER BY created_at ASC 
LIMIT 1
Auto-Default Behavior:

Oldest remaining address becomes new default

Ensures user always has a default (if any exist)

3. Check Service Area
Function: checkServiceArea

URL Parameter: :id (address ID)

Database Queries:

sql
-- Get address
SELECT * FROM addresses WHERE id = ? AND user_id = ?

-- Get service areas
SELECT * FROM service_areas WHERE is_active = 1
Response:

json
{
  "address_id": 1,
  "is_serviced": true,
  "service_area": {
    "name": "Bangalore Central",
    "delivery_fee": 50.00,
    "delivery_time_hours": 48,
    "min_order_amount": 500.00
  }
}
Matching: Postal code comparison (production would use geo-boundaries)

Geocoding & Delivery Controller
File: controllers/geocodingController.js
Purpose: Location services and delivery management

Note: Mock implementation for development (production uses Google Maps/Mapbox)

Functions Overview
Geocoding (Public)
Function	Description
geocodeAddress	Address → Coordinates
reverseGeocode	Coordinates → Address
calculateDistance	Distance between points
findNearbyPlaces	Find hospitals/pharmacies
getAddressSuggestions	Autocomplete
validateAddressFormat	Validate format
getPostalCodeInfo	Postal code details
getCityInfo	City information
Delivery (Public)
Function	Description
checkServiceArea	Check serviceability
getServiceAreas	List service areas
calculateDeliveryFee	Calculate cost
estimateDeliveryTime	Estimate time
Delivery (User Auth)
Function	Description
trackDelivery	Track order
scheduleDelivery	Schedule time
updateDeliveryAddress	Change address
Admin Functions
Function	Description
getAllDeliveries	List all deliveries
createServiceArea	Add service area
updateServiceArea	Update area
deleteServiceArea	Remove area
updateDeliveryStatus	Update status
getDeliveryAnalytics	Analytics
getPendingDeliveries	Pending queue
1. Forward Geocoding
Function: geocodeAddress

Query Parameter: address

Request:

text
GET /api/geocode/forward?address=123 Main Street, Delhi, India
Response:

json
{
  "address": "123 Main Street, Delhi, India",
  "coordinates": {
    "lat": 28.6139,
    "lng": 77.2090
  },
  "formatted_address": "123 Main Street, Delhi, India",
  "confidence": 0.8
}
Mock: Returns random coordinates near Delhi

2. Calculate Distance
Function: calculateDistance

Query Parameters: lat1, lng1, lat2, lng2

Algorithm: Haversine Formula

javascript
const R = 6371; // Earth's radius in km
const dLat = (lat2 - lat1) * π / 180;
const dLng = (lng2 - lng1) * π / 180;
const a = sin(dLat/2)² + cos(lat1) * cos(lat2) * sin(dLng/2)²;
const c = 2 * atan2(√a, √(1-a));
const distance = R * c;
Response:

json
{
  "from": {"lat": 28.6139, "lng": 77.2090},
  "to": {"lat": 19.0760, "lng": 72.8777},
  "distance_km": 1157.85,
  "distance_miles": 719.38
}
3. Check Service Area
Function: checkServiceArea

Query Parameters: lat, lng

Service Area Logic:

Delhi NCR: Lat 28.4-28.9, Lng 76.8-77.5

Simple boundary check

Response:

json
{
  "coordinates": {"lat": 28.6139, "lng": 77.2090},
  "is_serviceable": true,
  "service_area": "Delhi NCR",
  "message": "Area is serviceable"
}
4. Calculate Delivery Fee
Function: calculateDeliveryFee

Query Parameters:

lat, lng: Coordinates

order_value: Order total

Pricing Logic:

Order ≥ ₹500: Free (₹0)

Order ≥ ₹200: Discounted (₹25)

Order < ₹200: Standard (₹50)

Response:

json
{
  "coordinates": {"lat": 28.6139, "lng": 77.2090},
  "order_value": 300,
  "delivery_fee": 25,
  "free_delivery_threshold": 500,
  "discounted_delivery_threshold": 200
}
5. Track Delivery
Function: trackDelivery

Authentication: Required

URL Parameter: :orderId

Response:

json
{
  "tracking": {
    "order_id": "ORD-2025-789",
    "status": "in_transit",
    "current_location": {
      "lat": 28.6139,
      "lng": 77.2090,
      "address": "Near Delhi Gate"
    },
    "estimated_arrival": "30 minutes",
    "delivery_person": {
      "name": "Rahul Kumar",
      "phone": "+91-9999999999"
    },
    "tracking_history": [
      {"status": "confirmed", "timestamp": "..."},
      {"status": "preparing", "timestamp": "..."},
      {"status": "dispatched", "timestamp": "..."},
      {"status": "in_transit", "timestamp": "..."}
    ]
  }
}
Doctor Controller
File: controllers/doctorController.js
Purpose: Doctor management and consultations

Functions Overview
Public Functions
Function	Description
getAllDoctors	List doctors with filters
searchDoctors	Search by name/specialty/location
getDoctorSpecialties	Get all specialties
getNearbyDoctors	Location-based search
getDoctorById	Get doctor profile
getDoctorAvailability	Get available time slots
getDoctorReviews	Get doctor reviews (mock)
User Functions
Function	Description
bookConsultation	Book appointment
Admin Functions
Function	Description
createDoctor	Add new doctor
updateDoctor	Update doctor info
deleteDoctor	Remove doctor
updateDoctorStatus	Toggle availability
getPendingDoctors	Approval queue
getDoctorAnalytics	Doctor statistics
1. Get All Doctors
Function: getAllDoctors

Query Parameters:

page, limit: Pagination

specialty: Optional filter

Database Query:

sql
SELECT * FROM doctors 
WHERE available = 1 
AND (specialty LIKE '%?%' IF specialty provided)
ORDER BY rating DESC, experience DESC 
LIMIT ? OFFSET ?
Response:

json
{
  "doctors": [
    {
      "id": 1,
      "name": "Dr. Smith",
      "specialty": "Cardiologist",
      "experience": 15,
      "qualification": "MBBS, MD",
      "consultation_fee": 500.00,
      "location": "Delhi",
      "rating": 4.8,
      "available": 1
    }
  ],
  "pagination": {...}
}
2. Search Doctors
Function: searchDoctors

Query Parameters:

q: Search term (min 2 chars)

location: Location filter

Must provide at least ONE

Database Query:

sql
SELECT * FROM doctors 
WHERE available = 1
AND (name LIKE '%?%' OR specialty LIKE '%?%' OR location LIKE '%?%' IF q)
AND (location LIKE '%?%' IF location)
ORDER BY rating DESC, experience DESC
Response:

json
{
  "doctors": [...],
  "search": {
    "query": "cardio",
    "location": "Delhi"
  },
  "pagination": {...}
}
3. Get Doctor Availability
Function: getDoctorAvailability

URL Parameter: :id (doctor ID)
Query Parameter: date (optional, defaults to today)

Available Slots:

Morning: 09:00-12:00 (30-min intervals)

Afternoon: 14:00-17:00 (30-min intervals)

Total: 12 slots per day

Database Query:

sql
SELECT DATE_FORMAT(consultation_date, "%H:%i") as time_slot 
FROM consultations 
WHERE doctor_id = ? AND DATE(consultation_date) = ?
Response:

json
{
  "doctor_id": 1,
  "date": "2025-10-28",
  "available_slots": [
    "09:00", "09:30", "10:00", "11:00", "14:00", "15:00"
  ],
  "booked_slots": [
    "10:30", "15:30"
  ]
}
4. Book Consultation
Function: bookConsultation

Authentication: Required

URL Parameter: :id (doctor ID)

Request Body:

json
{
  "consultation_date": "2025-10-28T10:30:00Z",
  "notes": "Chest pain and breathing difficulty"
}
Process:

Validate doctor exists

Check time slot available (no conflict)

Create consultation record

Database Queries:

sql
-- Check availability
SELECT id FROM consultations 
WHERE doctor_id = ? AND consultation_date = ?

-- Book
INSERT INTO consultations (user_id, doctor_id, consultation_date, notes, status) 
VALUES (?, ?, ?, ?, "pending")
Response:

json
{
  "message": "Consultation booked successfully",
  "consultation_id": 456,
  "doctor_name": "Dr. Smith",
  "consultation_date": "2025-10-28T10:30:00Z",
  "consultation_fee": 500.00
}
Error (Slot Booked):

json
{
  "error": "Time slot not available",
  "message": "The selected time slot is already booked"
}
Order Controller
File: controllers/orderController.js
Purpose: Order processing and management

Functions Overview
User Functions
Function	Description
getUserOrders	Order history
createOrder	Place new order
getOrderById	Get order details
cancelOrder	Cancel order
getOrderTracking	Track status
getOrderReceipt	Generate receipt
reorderFromPrevious	Reorder prep
Admin Functions
Function	Description
getAllOrdersAdmin	List all orders
updateOrderStatus	Change status
approveOrder	Approve order
rejectOrder	Reject order
getOrderAnalytics	Order statistics
getPendingOrders	Approval queue
1. Create Order
Function: createOrder

Request Body:

json
{
  "medicines": [
    {"id": 1, "quantity": 2},
    {"id": 5, "quantity": 1}
  ],
  "address_id": 3,
  "prescription_id": 10
}
Process (Transaction):

Validate Address - Belongs to user

Validate Medicines - Exist and active

Calculate Total - Sum (price × quantity)

Check Prescription - Required if any medicine needs it

Create Order - Insert with all details

Commit Transaction

Database Queries:

sql
BEGIN TRANSACTION;

-- Validate address
SELECT id FROM addresses WHERE id = ? AND user_id = ?

-- Get medicine details (per medicine)
SELECT id, name, price, requires_prescription 
FROM medicines WHERE id = ? AND is_active = 1

-- Create order
INSERT INTO orders (user_id, medicines, total_amount, address_id, prescription_id, status) 
VALUES (?, ?, ?, ?, ?, "pending")

COMMIT;
Response:

json
{
  "message": "Order created successfully",
  "order_id": 789
}
Error (Validation):

json
{
  "error": "Order validation failed",
  "message": "Prescription required for one or more medicines"
}
Transaction Safety:

Rollback on any error

Ensures no partial orders

All-or-nothing execution

2. Cancel Order
Function: cancelOrder

URL Parameter: :id (order ID)

Cancellation Rules:

✅ Can cancel: pending, approved

❌ Cannot cancel: out_for_delivery, delivered

Database Query:

sql
UPDATE orders SET status = 'cancelled' WHERE id = ?
Response:

json
{
  "message": "Order cancelled successfully"
}
Error (Invalid Status):

json
{
  "error": "Order cannot be cancelled",
  "message": "Orders with status 'delivered' cannot be cancelled"
}
3. Track Order
Function: getOrderTracking

URL Parameter: :id (order ID)

Response:

json
{
  "order_id": 789,
  "current_status": "out_for_delivery",
  "tracking": [
    {
      "status": "pending",
      "message": "Order placed",
      "completed": true,
      "timestamp": "2025-10-15T10:30:00Z"
    },
    {
      "status": "approved",
      "message": "Order approved",
      "completed": true,
      "timestamp": "2025-10-15T11:00:00Z"
    },
    {
      "status": "out_for_delivery",
      "message": "Out for delivery",
      "completed": true,
      "timestamp": "2025-10-15T14:00:00Z"
    },
    {
      "status": "delivered",
      "message": "Delivered",
      "completed": false,
      "timestamp": null
    }
  ],
  "estimated_delivery": "2025-10-15T16:00:00Z"
}
Tracking Steps:

Pending → Order placed

Approved → Admin approved

Out for Delivery → Dispatched

Delivered → Completed

4. Reorder from Previous
Function: reorderFromPrevious

URL Parameter: :id (previous order ID)

Process:

Fetch previous order

Check each medicine still available

Get current prices (may have changed)

Return reorder data

Response:

json
{
  "message": "Reorder data prepared",
  "medicines": [
    {
      "id": 1,
      "quantity": 2,
      "current_price": 45.00
    }
  ],
  "address_id": 3,
  "unavailable_count": 0
}
Error (All Unavailable):

json
{
  "error": "No medicines available for reorder",
  "message": "All medicines from the previous order are currently unavailable"
}
5. Order Analytics (Admin)
Function: getOrderAnalytics

Query Parameters: start_date, end_date

Database Queries:

sql
-- Sales by day
SELECT DATE(created_at) as day, 
       COUNT(*) as orders, 
       SUM(total_amount) as revenue
FROM orders 
WHERE created_at >= ? AND created_at <= ?
GROUP BY DATE(created_at) 
ORDER BY day DESC 
LIMIT 60

-- By status
SELECT status, COUNT(*) as count 
FROM orders 
WHERE created_at >= ? AND created_at <= ?
GROUP BY status
Response:

json
{
  "sales_by_day": [
    {"day": "2025-10-27", "orders": 23, "revenue": 10350.00}
  ],
  "by_status": [
    {"status": "pending", "count": 45},
    {"status": "delivered", "count": 1177}
  ]
}
Admin Controller
File: controllers/adminController.js
Purpose: Admin operations and system management

Functions Overview
Authentication
Function	Description
adminLogin	Admin authentication
Dashboard
Function	Description
getDashboard	Dashboard overview
getAnalyticsOverview	Multi-dimensional analytics
getUserAnalytics	User registration analytics
getSalesAnalytics	Sales & revenue analytics
User Management
Function	Description
getAllUsers	List all users
getUserDetails	Single user details
updateUserStatus	Administrative actions
deleteUser	Delete user account
Order Management
Function	Description
getAllOrders	List all orders
updateOrderStatus	Change order status
Prescription Management
Function	Description
getAllPrescriptions	List all prescriptions
getPendingPrescriptions	Approval queue
approvePrescription	Approve prescription
rejectPrescription	Reject prescription
Security & Monitoring
Function	Description
getSecurityEvents	Security event log
getAuditLogs	Audit trail
getActiveSessions	List active sessions
revokeSession	Force logout
System Management
Function	Description
getSystemHealth	System status
getSystemLogs	View error logs
clearCache	Flush cache
Admin Management
Function	Description
createAdmin	Add new admin
getAllAdmins	List all admins
deleteAdmin	Remove admin
1. Admin Login
Function: adminLogin

Request Body:

json
{
  "email": "admin@ruramed.com",
  "password": "AdminPass123!"
}
Process:

Find admin by email

Verify password with bcrypt

Generate JWT (8-hour expiry)

NO session tracking (admins bypass session system)

Response:

json
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
Token Payload:

json
{
  "id": 1,
  "email": "admin@ruramed.com",
  "role": "admin",
  "exp": 1730028800
}
Key Differences:

Shorter token (8h vs 30d)

No session ID required

Role = "admin" in JWT

2. Dashboard
Function: getDashboard

Database Queries:

sql
-- User stats
SELECT COUNT(*) as total_users, 
       COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as new_today 
FROM users

-- Order stats
SELECT COUNT(*) as total_orders,
       COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
       COUNT(CASE WHEN DATE(created_at) = CURDATE() THEN 1 END) as orders_today,
       SUM(total_amount) as total_revenue
FROM orders

-- Medicine stats
SELECT COUNT(*) as total_medicines, 
       COUNT(CASE WHEN is_active = 1 THEN 1 END) as active_medicines 
FROM medicines

-- Doctor stats
SELECT COUNT(*) as total_doctors, 
       COUNT(CASE WHEN available = 1 THEN 1 END) as available_doctors 
FROM doctors

-- Recent orders
SELECT o.id, o.total_amount, o.status, o.created_at, u.name as user_name
FROM orders o JOIN users u ON o.user_id = u.id
ORDER BY o.created_at DESC LIMIT 5
Response:

json
{
  "metrics": {
    "users": {
      "total_users": 1500,
      "new_today": 12
    },
    "orders": {
      "total_orders": 3200,
      "pending_orders": 45,
      "orders_today": 23,
      "total_revenue": 1450000.00
    },
    "medicines": {
      "total_medicines": 500,
      "active_medicines": 450
    },
    "doctors": {
      "total_doctors": 50,
      "available_doctors": 45
    }
  },
  "recent_orders": [...],
  "system_health": {
    "status": "healthy"
  }
}
3. User Management
Function: updateUserStatus

URL Parameter: :id (user ID)

Request Body:

json
{
  "action": "revoke_sessions"
}
Actions:

revoke_sessions - Logout from all devices

block_devices - Block all devices

Database Queries:

sql
-- Revoke sessions
UPDATE user_sessions 
SET is_active = 0, logout_at = NOW(), logout_reason = "admin" 
WHERE user_id = ?

-- Block devices
UPDATE device_tracking SET is_blocked = 1 WHERE user_id = ?
Response:

json
{
  "message": "Action completed",
  "user_id": 123,
  "action": "revoke_sessions"
}
4. Prescription Approval
Function: approvePrescription

URL Parameter: :id (prescription ID)

Database Query:

sql
UPDATE prescriptions SET status='approved' WHERE id = ?
Response:

json
{
  "message": "Prescription approved",
  "id": 456
}
Function: rejectPrescription

Request Body:

json
{
  "doctor_notes": "Prescription illegible, please reupload"
}
Database Query:

sql
UPDATE prescriptions 
SET status='rejected', doctor_notes = ? 
WHERE id = ?
5. System Health
Function: getSystemHealth

Response:

json
{
  "database": {
    "status": "healthy",
    "connection": "ok",
    "pool_connections": 5
  },
  "cache": {
    "status": "healthy",
    "stats": {
      "hits": 1250,
      "misses": 85,
      "keys": 320
    }
  },
  "server": {
    "uptime": 86400,
    "memory": {
      "rss": 150000000,
      "heapUsed": 100000000
    },
    "node_version": "v18.16.0"
  }
}
6. Clear Cache
Function: clearCache

Process:

javascript
cache.flush()  // Clears all cached data
Response:

json
{
  "message": "Cache cleared successfully",
  "before_size": 320,
  "after_size": 0
}
Logging: Security event with sizes and admin ID

7. Admin Management
Function: createAdmin

Request Body:

json
{
  "name": "New Admin",
  "email": "newadmin@ruramed.com",
  "password": "SecurePass123!"
}
Process:

Check if admin exists

Hash password

Create admin account

Response:

json
{
  "message": "Admin created successfully",
  "admin_id": 2
}
Function: deleteAdmin

Safety Check:

Cannot delete own account

Response:

json
{
  "message": "Admin deleted",
  "admin_id": 2
}
Error:

json
{
  "error": "Cannot delete your own admin account"
}
Common Patterns
1. Pagination Pattern
All paginated endpoints return:

json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "pages": 15,
    "has_next": true,
    "has_prev": false
  }
}
Query Parameters:

text
?page=1&limit=10
Defaults:

Page: 1

Limit: 10

Max Limit: 100

2. Error Response Pattern
json
{
  "error": "Error type",
  "message": "Detailed error message",
  "timestamp": "2025-10-27T00:00:00.000Z",
  "requestId": "req_1730000000_abc123"
}
With Validation Errors:

json
{
  "error": "Validation failed",
  "details": [
    "email: Invalid email format",
    "phone: Phone number must be 10 digits"
  ],
  "timestamp": "2025-10-27T00:00:00.000Z"
}
3. Logging Pattern
Every controller function logs events:

Auth Events:

javascript
logAuthEvent('login_success', userId, ip, metadata);
Healthcare Events:

javascript
logHealthcareEvent('order_created', metadata, userId);
Security Events:

javascript
logSecurityEvent('failed_login', metadata, userId, ip);
Audit Trail:

javascript
logAuditTrail('CREATE', 'order', userId, oldData, newData);
4. Transaction Pattern
Order creation uses transactions:

javascript
await withTransaction(async (connection) => {
  // All operations use same connection
  await connection.execute(query1);
  await connection.execute(query2);
  // If any fails, entire transaction rolls back
});
Benefits:

Atomicity (all-or-nothing)

Data consistency

Automatic rollback on error

5. Cache Management Pattern
javascript
// Check cache first
let data = cache.get(key);
if (!data) {
  // Fetch from database
  data = await db.execute(query);
  // Store in cache
  cache.set(key, data, TTL);
}

// Invalidate on update
cache.delete(key);
// or
cache.flush(); // Clear all
Cache Keys:

User: user:${userId}

Medicine: medicine:${medicineId}

Doctor: doctor:${doctorId}

6. Ownership Verification Pattern
javascript
// In controller
const order = await db.execute(
  'SELECT * FROM orders WHERE id = ? AND user_id = ?',
  [orderId, req.user.id]
);

if (!order) {
  return res.status(404).json({ error: 'Order not found' });
}
Middleware handles initial auth, controller double-checks ownership

Database Tables Reference
Core Tables
Table	Purpose	Key Columns
users	User accounts	id, name, email, phone, password, location
admins	Admin accounts	id, name, email, password
user_sessions	Session tracking	session_id, user_id, ip_address, device_info, is_active
otp_verifications	OTP codes	email, otp_hash, otp_type, expires_at
Healthcare Tables
Table	Purpose	Key Columns
medicines	Medicine catalog	id, name, category, form, price, mrp, stock, is_active
doctors	Doctor profiles	id, name, specialty, experience, consultation_fee, available
consultations	Appointments	id, user_id, doctor_id, consultation_date, status
orders	Order records	id, user_id, medicines, total_amount, status, address_id
prescriptions	Uploaded files	id, user_id, file_url, status
Location Tables
Table	Purpose	Key Columns
addresses	User addresses	id, user_id, address_line1, city, state, postal_code, latitude, longitude, is_default
service_areas	Delivery zones	id, area_name, postal_codes, delivery_fee, is_active
Security Tables
Table	Purpose	Key Columns
security_events	Security log	id, event_type, user_id, ip_address, event_data
device_tracking	Device fingerprints	id, user_id, device_fingerprint, is_blocked
Security Features
Authentication Security
Password Hashing: bcrypt with 10 rounds

JWT Tokens: 30-day user, 8-hour admin

Session Tracking: Device fingerprinting

OTP Verification: 5-10 minute expiry

Failed Login Tracking: Logged to security_events

Authorization Security
Role-Based Access: User vs Admin

Ownership Verification: Users only access their data

Session Validation: Every request checks session

Admin Bypass: Admins skip session checks

Data Security
SQL Injection Prevention: Prepared statements

XSS Prevention: Input sanitization

CSRF Protection: Token validation

Rate Limiting: IP and device-based

File Upload Validation: Magic number checking

Audit & Monitoring
Comprehensive Logging: All operations logged

Security Events: Failed attempts tracked

Audit Trail: Data changes recorded

IP Tracking: All requests logged

Device Fingerprinting: Suspicious devices detected

Error Handling
HTTP Status Codes
Code	Meaning	Usage
200	OK	Successful operation
201	Created	Resource created
202	Accepted	OTP sent, pending verification
400	Bad Request	Validation error
401	Unauthorized	Invalid credentials
403	Forbidden	Insufficient permissions
404	Not Found	Resource doesn't exist
409	Conflict	Duplicate resource
429	Too Many Requests	Rate limited
500	Internal Server Error	System error
Error Types
Validation Errors:

json
{
  "error": "Validation failed",
  "details": ["Field-specific errors"]
}
Authentication Errors:

json
{
  "error": "Invalid credentials",
  "message": "Email or password is incorrect"
}
Authorization Errors:

json
{
  "error": "Forbidden",
  "message": "Admin access required"
}
Business Logic Errors:

json
{
  "error": "Order cannot be cancelled",
  "message": "Orders with status 'delivered' cannot be cancelled"
}
Performance Optimization
Caching Strategy
User Data: 30-minute TTL

Medicine Data: Invalidated on update

Doctor Data: 1-hour TTL

Session Data: Cached until logout

Database Optimization
Prepared Queries: All queries parameterized

Connection Pooling: 10 connections max

Index Usage: Primary keys, foreign keys indexed

Query Optimization: JOINs minimized

API Optimization
Pagination: All list endpoints paginated

Lazy Loading: Data loaded on demand

Response Compression: GZIP enabled

CDN Integration: Static assets cached

Testing Recommendations
Unit Testing
Test each controller function:

javascript
describe('authController', () => {
  describe('register', () => {
    it('should register user with valid data', async () => {
      // Test implementation
    });
    
    it('should reject duplicate email', async () => {
      // Test implementation
    });
  });
});
Integration Testing
Test API endpoints:

javascript
describe('POST /api/auth/register', () => {
  it('should return 201 on success', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(validUserData);
    
    expect(response.status).toBe(201);
  });
});
Load Testing
Test performance:

bash
# Using Apache Bench
ab -n 1000 -c 10 http://localhost:5000/api/medicines

# Using Artillery
artillery quick --count 10 -n 20 http://localhost:5000/api/medicines
Deployment Checklist
Pre-Deployment
 All environment variables set

 Database migrations run

 Admin account created

 SSL certificates installed

 Backup system configured

 Monitoring tools setup

Security Hardening
 Change default JWT_SECRET

 Enable HTTPS only

 Configure CORS properly

 Set secure cookie flags

 Enable rate limiting

 Configure firewall rules

Performance Tuning
 Enable compression

 Configure CDN

 Optimize database indexes

 Set up caching

 Configure connection pooling

 Enable query logging

Monitoring Setup
 Error tracking (Sentry)

 Performance monitoring (New Relic)

 Log aggregation (ELK)

 Uptime monitoring (Pingdom)

 Alert configuration (PagerDuty)

Conclusion
This documentation covers 100+ controller functions across 8 controller files, providing complete reference for:

✅ Frontend Developers - API integration examples
✅ Backend Developers - Business logic understanding
✅ DevOps Teams - Deployment requirements
✅ QA Teams - Testing scenarios
✅ Security Teams - Security audit reference

Total Coverage:

8 Controller Files

100+ Functions Documented

Complete Request/Response Examples

Database Query References

Error Handling Patterns

Security Implementation Details