RuraMed Frontend - Core Architecture Documentation
🏗️ System Overview
RuraMed is a Next.js 16 full-stack medical e-commerce platform with TypeScript, featuring JWT authentication, Zustand state management, and comprehensive service layers for medicines, doctors, orders, and user management.

📦 Layer Architecture
text
┌─────────────────────────────────────────┐
│     Components (UI Layer)                │
├─────────────────────────────────────────┤
│  Stores (Zustand) + Context (React)     │
├─────────────────────────────────────────┤
│     Services (Business Logic)            │
├─────────────────────────────────────────┤
│  API Client (Axios + Interceptors)      │
├─────────────────────────────────────────┤
│    Backend API (Node.js/Express)        │
└─────────────────────────────────────────┘
🔐 SERVICES LAYER (7 Files)
1. src/services/auth.service.ts
Purpose: Centralized authentication logic with JWT token management

Key Methods:

register(data) - User registration with email verification

login(credentials) - Email/password login, stores JWT + refresh tokens

logout() - Clears tokens from localStorage

requestOTP(email) - Initiates OTP flow

verifyOTP(identifier, otp, otpType) - Verifies OTP for registration/password reset

forgotPassword(identifier) - Sends reset OTP

resetPassword(identifier, otp, newPassword) - Completes password reset

resendOTP(email, otpType) - Resends OTP

getProfile() - Fetches authenticated user

updateProfile(data) - Updates user basic info

changePassword(currentPassword, newPassword) - Changes password

isAuthenticated() - Checks if tokens exist (client-side check)

getToken() / getRefreshToken() / getSessionId() - Retrieves stored tokens

isTokenExpiringSoon() - Decodes JWT and checks if expiring within 2 minutes

Token Storage:

jwt_token - Access token (used in Authorization header)

refresh_token - Refresh token (for token renewal)

session_id - Optional session tracking

Error Handling: Extracts validation details from backend and throws structured errors

2. src/services/user.service.ts
Purpose: User profile management beyond authentication

Key Methods:

getProfileDetails() - Fetches extended user profile (full name, DOB, blood group, etc.)

updateProfileDetails(data) - Partial profile update with camelCase→snake_case conversion

deleteProfileField(fieldName) - Removes specific profile field

deleteAllProfileFields() - Clears all profile details

hasProfileDetails(profile) - Checks if any profile data exists

Profile Fields:

typescript
fullName, profilePicture, gender, dateOfBirth, bloodGroup, alternateContact
API Endpoints Used:

GET /users/profile/details

PUT /users/profile/details

DELETE /users/profile/details/{fieldName}

DELETE /users/profile/details

3. src/services/order.service.ts
Purpose: Complete order lifecycle management

Key Methods:

getOrders(page, limit) - Paginated order history

getOrderById(id) - Single order details

createOrder(data) - Creates new order

cancelOrder(id, reason) - Cancels pending/confirmed orders

trackOrder(id) - Real-time order tracking with status & location

getOrderReceipt(id) - Downloads order invoice as PDF/Blob

reorder(id) - Quick reorder from previous order

getOrdersByStatus(status, page, limit) - Filters by status

getOrderStats() - User statistics (total, pending, completed, spent)

calculateOrderTotal(items) - Client-side total calculation

getOrderStatusLabel(status) - Returns status badge with emoji & colors

getPaymentStatusLabel(status) - Payment status styling

canCancelOrder(order) - Validates cancellation eligibility

formatOrderNumber(orderNumber) - Formats as ORD-XXXX-XXXX

downloadReceipt(orderId) - Triggers PDF download

Order Statuses: pending, confirmed, processing, shipped, delivered, cancelled

Payment Statuses: pending, paid, failed, refunded

4. src/services/medicine.service.ts
Purpose: Medicine catalog, search, filtering, and inventory

Key Methods:

getMedicines(params) - Paginated list with filters

searchMedicines(query, page, limit) - Full-text search

getMedicineById(id) - Single medicine details

getCategories() - All medicine categories

getDosageForms() - All dosage forms

getPopularMedicines(limit) - Top medicines

checkStock(medicineId) - Stock availability

getMedicinesByCategory(category, page, limit) - Category filter

getPrescriptionMedicines(page, limit) - Requires prescription

getOTCMedicines(page, limit) - Over-the-counter medicines

getMedicinesByPriceRange(minPrice, maxPrice, page, limit) - Price filter

getInStockMedicines(page, limit) - In stock filter

getMedicineAlternatives(medicineId) - Medicine substitutes

getSimilarMedicines(medicineId, limit) - Related medicines

Filter Params:

typescript
{ category, minPrice, maxPrice, requiresPrescription, inStock, location, page, limit }
5. src/services/doctor.service.ts
Purpose: Doctor discovery, availability, and consultation booking

Key Methods:

getDoctors(params) - Paginated doctor list with filters

searchDoctors(query, page, limit) - Search by name/specialization

getDoctorById(id) - Doctor profile

getSpecializations() - All specializations

getNearbyDoctors(latitude, longitude, radius, limit) - Location-based search

getDoctorAvailability(doctorId, date) - Available time slots

getDoctorReviews(doctorId, page, limit) - User reviews & ratings

bookConsultation(data) - Book appointment

getConsultations(page, limit) - User consultation history

getConsultationById(id) - Single consultation details

cancelConsultation(id, reason) - Cancel with reason

rescheduleConsultation(id, newDate, newTime) - Reschedule appointment

getDoctorsBySpecialization(specialization, page, limit) - Filter by specialty

getDoctorsByFeeRange(minFee, maxFee, page, limit) - Price filter

getTopRatedDoctors(limit) - High-rated doctors

getConsultationStatusLabel(status) - Status badge

getConsultationTypeIcon(type) - Video/audio/chat icons

canCancelConsultation(appointment) - Validates cancellation (2-hour rule)

formatExperience(years) - Years display

getRatingStars(rating) - Star display

Consultation Types: video, audio, chat

Consultation Statuses: scheduled, completed, cancelled, rescheduled

6. src/services/address.service.ts
Purpose: Delivery address management

Key Methods:

getAddresses() - All user addresses

getAddressById(id) - Single address

getDefaultAddress() - Primary delivery address (404 if none)

createAddress(data) - Add new address

updateAddress(id, data) - Edit address

deleteAddress(id) - Remove address

setDefaultAddress(id) - Set as primary

checkServiceAvailability(id) - Delivery availability check

validateAddress(address) - Client-side validation

formatAddress(address) - Display format

getAddressTypeLabel(type) - Home/Work/Other labels

sortAddresses(addresses) - Default address first

Address Fields:

typescript
street, city, state, postalCode (6-digit PIN), country, 
landmark, addressType ('home'|'work'|'other'), isDefault
Validation Rules:

Street: minimum 5 characters

Postal code: exactly 6 digits (Indian PIN format)

Address type: home, work, or other

7. src/services/location.service.ts
Purpose: GPS and IP-based geolocation with reverse geocoding

Key Features:

No persistent caching (fresh detection on every call)

GPS priority → IP fallback strategy

Dual IP providers (ipapi.co primary, ipwho.is fallback)

Key Methods:

getUserLocation() - Main entry point (GPS→IP fallback)

getGPSLocation() - Browser Geolocation API with 8-second timeout

photonReverseGeocode(lat, lon) - Converts coordinates to address (Photon API)

getIPLocation() - IP-based location with dual providers

searchLocations(query) - Location autocomplete (Photon search)

calculateDistance(lat1, lng1, lat2, lng2) - Haversine formula (returns km)

isValidCoordinates(lat, lng) - Validates coordinate ranges

formatLocation(location) - Display format

Location Data Structure:

typescript
{ city, state, country, latitude, longitude }
API Services Used:

Photon API - Open-source reverse geocoding (5-second timeout)

ipapi.co - IP geolocation (5-second timeout)

ipwho.is - Fallback IP geolocation

Timeouts:

GPS: 8 seconds

API calls: 5 seconds each

Result Source: Returns 'gps', 'ip', or 'manual' indicating data source

🔄 STATE MANAGEMENT (Zustand Stores)
8. src/store/auth.store.ts
Purpose: Global authentication state with persistence

State:

typescript
user: User | null                    // Currently logged-in user
userProfile: UserProfile | null      // Extended profile details
isAuthenticated: boolean             // Auth status
isLoading: boolean                   // Login/register loading
isProfileLoading: boolean            // Profile operation loading
error: string | null                 // Auth error message
profileError: string | null          // Profile error message
_hasHydrated: boolean                // Zustand hydration flag
_checkAuthInProgress: boolean        // Prevents duplicate auth checks
Key Actions:

login(email, password) - Calls authService.login, stores user in state

register(data) - Calls authService.register

logout() - Clears tokens, user, profile

checkAuth() - Validates tokens with backend, prevents duplicates

refreshProfile() - Fetches fresh user from /users/profile

updateProfile(data) - Updates basic user info

fetchUserProfile() - Fetches extended profile details

updateUserProfile(data) - Updates profile fields

deleteProfileField(fieldName) - Removes profile field

deleteAllProfileFields() - Clears all profile fields

clearAuth() - Hard reset (logout on 401 errors)

setUser(), setUserProfile(), setLoading() - Setters

clearError(), clearProfileError() - Error clearers

Persistence:

Storage key: auth-storage

Persists: user, userProfile, isAuthenticated

Hydration callback sets _hasHydrated: true

Auth Check Logic:

Skips if already in progress (prevents race conditions)

Returns early if already authenticated

Validates tokens with backend /users/profile endpoint

On 401: clears tokens, redirects to login

9. src/store/ui.store.ts
Purpose: UI state management (theme, layout, location)

State:

typescript
theme: 'light' | 'dark'              // Current theme
sidebarOpen: boolean                 // Sidebar visibility
currentLocation: LocationData | null // User location for non-auth flows
Key Actions:

setTheme(theme) - Sets theme, applies dark class to document.documentElement

toggleTheme() - Switches between light/dark

setSidebarOpen(open) - Controls sidebar

toggleSidebar() - Toggles sidebar state

setCurrentLocation(location) - Stores location for public pages

Theme Application:

Uses requestAnimationFrame() to avoid hydration mismatch

Applies/removes dark class on root HTML element

Only runs client-side

Persistence:

Storage key: ui-storage

skipHydration: true - Manual hydration to avoid SSR issues

10. src/store/cart.store.ts
Purpose: Shopping cart management with persistence

State:

typescript
items: CartItem[]  // Array of { medicine, quantity }
Key Actions:

addItem(medicine, quantity=1) - Adds or increments existing item

removeItem(medicineId) - Removes item from cart

updateQuantity(medicineId, quantity) - Sets quantity (auto-removes if ≤0)

clearCart() - Empties entire cart

getItemCount() - Total quantity across all items

getCartTotal() - Sum of (price × quantity)

isInCart(medicineId) - Checks if item exists

getItemQuantity(medicineId) - Returns quantity or 0

Logic:

Prevents duplicate items (increments quantity instead)

Auto-removes items when quantity becomes ≤0

Real-time total calculation

Persistence:

Storage key: cart-storage

Persists entire items array

11. src/store/dashboard.store.ts
Purpose: Dashboard navigation and loading state

State:

typescript
activeSection: DashboardSection  // Current tab/section
isLoading: boolean              // Data loading state
error: string | null            // Section error message
Section Types:

typescript
'overview' | 'profile' | 'addresses' | 'consultations' | 
'medicines' | 'orders' | 'prescriptions' | 'settings'
Key Actions:

setActiveSection(section) - Changes section, clears errors, auto-scrolls to top

setLoading(loading) - Loading indicator

setError(error) - Error message

Auto-Scroll: Uses window.scrollTo({ top: 0, behavior: 'smooth' })

No Persistence: Plain Zustand store (resets on page reload)

🔌 HTTP & CONTEXT
12. src/contexts/AuthContext.tsx
Purpose: React Context API for auth (legacy, complements Zustand store)

Context Value:

typescript
{
  user: User | null,
  loading: boolean,
  login: (email, password) => Promise<void>,
  logout: () => Promise<void>,
  register: (data) => Promise<void>
}
Initialization:

On mount: checks for jwt_token in localStorage

If token exists: calls authService.getProfile() to hydrate user

If profile fetch fails: clears tokens

Usage:

typescript
const { user, loading, login, logout } = useAuth();
Note: Store-based approach (Zustand) is preferred; this Context is available but secondary

13. src/lib/api-client.ts
Purpose: Axios instance with JWT authentication and token refresh

Configuration:

typescript
baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
timeout: 30 seconds
headers: { 'Content-Type': 'application/json' }
withCredentials: true
Request Interceptor:

Attaches Authorization: Bearer {jwt_token} header

Adds x-session-id header if session ID exists

Adds x-timezone header with browser timezone

Response Interceptor - Token Refresh Logic:

401 Error Flow:

Check if NOT already retried (!_retry)

Skip refresh on /login or /register pages

Clear tokens and reject

Refresh Process:

Set isRefreshing = true (prevents concurrent refreshes)

Mark request with _retry = true

Send POST /auth/refresh-token with refresh token

On success: store new access token, update headers, retry original request

On failure: clear tokens, redirect to /login?expired=true

Queue Management:

While refreshing: subsequent 401s are queued

After refresh: all queued requests are retried with new token

After failure: all queued requests are rejected

Error Handling:

Extracts token from response: response.data.accessToken

Throws if no token in refresh response

Proper type handling for Axios errors

Headers Added:

Authorization: Bearer {token}

x-session-id: {sessionId}

x-timezone: {browserTimezone}

🛡️ ROUTE PROTECTION
14. src/components/ProtectedRoute.tsx
Purpose: Wrapper component that ensures authentication before rendering

Flow:

text
1. Check if Zustand has hydrated (_hasHydrated)
   ↓ (if not, show loading)
2. Check if hasCheckedAuth already called
   ↓ (prevent duplicate checks)
3. Check localStorage for jwt_token & refresh_token
   ↓
   ├─ No tokens → redirect to /login?expired=true
   ├─ Tokens exist & isAuthenticated → render children
   └─ Tokens exist & NOT authenticated → call checkAuth()
4. If checkAuth() succeeds → render children
5. If checkAuth() fails → show loading (will redirect via api-client)
State:

typescript
isReady: boolean          // Ready to render protected content
hasCheckedAuth: boolean  // Prevents duplicate backend validation
Loading UI:

Spinner with "Verifying authentication..." message

Shown during: hydration, auth check, or in-progress check

Conditions for Rendering:

_hasHydrated === true

isReady === true

!_checkAuthInProgress

isAuthenticated === true

Return:

Loading screen while checking

null if not authenticated (will redirect)

children if authenticated

🔗 Data Flow Summary
Authentication Flow
text
1. User enters email/password on login page
2. ProtectedRoute NOT needed on /login
3. Login form calls authService.login()
4. authService stores tokens in localStorage + returns user
5. useAuthStore.login() updates global auth state
6. Redirect to /dashboard
7. ProtectedRoute checks tokens + calls checkAuth() if needed
8. checkAuth() validates with backend
9. Protected pages render
Protected Route Access
text
1. User navigates to /dashboard (protected)
2. ProtectedRoute wrapper checks hydration
3. Checks localStorage tokens
4. Validates with backend via checkAuth()
5. If valid: renders dashboard components
6. If invalid: redirects to /login?expired=true
7. API client auto-handles 401 token refresh
Token Refresh on API Call
text
1. User makes API call via apiClient
2. Request interceptor attaches jwt_token
3. Backend returns 401 (token expired)
4. Response interceptor intercepts
5. Calls POST /auth/refresh-token
6. Stores new token from response
7. Retries original request with new token
8. Other pending requests wait in queue
Location Detection
text
1. Component calls locationService.getUserLocation()
2. Requests browser GPS permission
3. If GPS granted (8s timeout):
   - Gets coordinates
   - Reverse geocodes via Photon API
   - Returns { city, state, country, lat, lon } with source='gps'
4. If GPS denied/timeout, tries IP detection:
   - Calls ipapi.co (5s timeout)
   - If fails, tries ipwho.is (5s timeout)
   - Returns location with source='ip'
5. If all fail: returns error
6. No caching: fresh detection each call
📊 Type Definitions Required
These services expect these types in @/types:

typescript
// Auth
User, AuthResponse, LoginInput, RegisterInput
ApiResponse<T>, ForgotPasswordResponse, ResetPasswordResponse

// User Profile
UserProfile, UpdateUserProfileInput, UserProfileResponse

// Orders
Order, CreateOrderInput, PaginatedResponse<T>

// Medicines
Medicine, MedicineSearchParams

// Doctors
Doctor, Appointment, BookAppointmentInput

// Addresses
Address, AddressInput

// Location
LocationData
🚀 Key Architectural Patterns
1. Service Layer Pattern
All API calls abstracted into services

Services handle data transformation (camelCase ↔ snake_case)

Services provide high-level methods, not raw API calls

2. Zustand State Management
Centralized state with actions

Persistence middleware for token/cart survival

Hydration checks to prevent SSR mismatches

Deduplication logic for async operations

3. Token Refresh Queue
Prevents thundering herd on 401

Queues concurrent requests during refresh

Atomic token update

4. Protected Routes
Multi-step validation (hydration → localStorage → backend)

Prevents rendering until auth confirmed

Automatic logout on 401

5. No Location Caching
Fresh GPS/IP detection every call

Prevents stale location data

Respects current user location

🔧 Configuration Requirements
Environment Variables Needed:

bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
Backend Endpoints Required:

text
POST   /auth/register
POST   /auth/login
POST   /auth/logout
POST   /auth/refresh-token
POST   /auth/request-otp
POST   /auth/verify-otp
POST   /auth/forgot-password
POST   /auth/reset-password
POST   /auth/resend-otp

GET    /users/profile
PUT    /users/profile
GET    /users/profile/details
PUT    /users/profile/details
DELETE /users/profile/details
DELETE /users/profile/details/{fieldName}

POST   /users/change-password
GET    /users/orders
GET    /users/orders/{id}
PUT    /users/orders/{id}/cancel
GET    /orders/{id}/track
GET    /orders/{id}/receipt
POST   /orders/{id}/reorder
GET    /users/stats

GET    /medicines
GET    /medicines/search
GET    /medicines/{id}
GET    /medicines/categories
GET    /medicines/forms
GET    /medicines/popular
GET    /medicines/{id}/stock
GET    /medicines/{id}/alternatives
GET    /medicines/{id}/similar

GET    /doctors
GET    /doctors/search
GET    /doctors/{id}
GET    /doctors/specialties
GET    /doctors/nearby
GET    /doctors/{id}/availability
GET    /doctors/{id}/reviews
POST   /doctors/{id}/book
GET    /users/consultations
GET    /users/consultations/{id}
PUT    /users/consultations/{id}/cancel
PUT    /users/consultations/{id}/reschedule

GET    /addresses
GET    /addresses/{id}
GET    /addresses/default
POST   /addresses
PUT    /addresses/{id}
DELETE /addresses/{id}
PUT    /addresses/{id}/default
GET    /addresses/{id}/check-service
