RuraMed Frontend Development - Complete Documentation
Project Name: RuraMed Healthcare Platform Frontend
Framework: Next.js 15 with TypeScript
Date: October 27, 2025, 11:43 PM IST
Current Status: ✅ Core API Integration & State Management Complete

Table of Contents
Project Setup & Configuration

File Structure

Files Created (14 Total)

Backend API Integration

State Management

Next Steps

1. Project Setup & Configuration
Initial Setup Commands
text
cd %USERPROFILE%\OneDrive\Desktop\Ruramed
mkdir ruramed-frontend
cd ruramed-frontend
npx create-next-app@latest .
Configuration Selected:

✅ TypeScript

✅ ESLint

✅ Tailwind CSS v3

✅ src/ directory

✅ App Router

✅ Import alias (@/*)

Dependencies Installed
text
npm install axios js-cookie zustand lucide-react clsx tailwind-merge react-hot-toast
npm install --save-dev @types/js-cookie
npm uninstall tailwindcss
npm install -D tailwindcss@3.4.17 postcss autoprefixer
npx tailwindcss init -p
Key Libraries:

axios - HTTP client for API calls

zustand - Lightweight state management

lucide-react - Icon library

clsx + tailwind-merge - CSS class utilities

react-hot-toast - Toast notifications

tailwindcss@3.4.17 - Stable v3 (downgraded from v4)

2. File Structure
text
ruramed-frontend/
├── src/
│   ├── app/
│   │   ├── globals.css              ✅ File 2
│   │   ├── layout.tsx               (Next.js default)
│   │   └── page.tsx                 (Next.js default)
│   ├── lib/
│   │   ├── api-client.ts            ✅ File 5
│   │   └── utils.ts                 ✅ File 7
│   ├── services/
│   │   ├── auth.service.ts          ✅ File 6
│   │   ├── medicine.service.ts      ✅ File 8
│   │   ├── address.service.ts       ✅ File 9
│   │   ├── order.service.ts         ✅ File 10
│   │   └── doctor.service.ts        ✅ File 11
│   ├── store/
│   │   ├── auth.store.ts            ✅ File 12
│   │   ├── cart.store.ts            ✅ File 13
│   │   └── ui.store.ts              ✅ File 14
│   └── types/
│       └── index.ts                 ✅ File 3
├── .env.local                        ✅ File 4
├── tailwind.config.ts                ✅ File 1
├── tsconfig.json                     (Next.js default)
└── package.json                      (Updated)
3. Files Created (14 Total)
File 1: tailwind.config.ts
Purpose: Tailwind CSS v3 configuration with custom theme

Key Features:

Dark mode support (class strategy)

Custom color palette (primary, secondary, success, medical)

Custom shadows (soft, medium, strong)

Animation keyframes (fadeIn, slideUp, slideDown)

Typography configuration (Inter font)

Border color definitions

File 2: src/app/globals.css
Purpose: Global styles and CSS utilities

Custom Component Classes:

.btn-primary - Primary action buttons

.btn-secondary - Secondary buttons

.btn-outline - Outlined buttons

.card - Card container styles

.input-field - Form input styling

.label - Form label styling

.section-container - Page section wrapper

Custom scrollbar styling

Smooth scroll behavior

Dark/Light theme transitions (300ms)

File 3: src/types/index.ts
Purpose: Complete TypeScript type definitions

Types Defined:

User Types: User, LoginInput, RegisterInput, AuthResponse

Address Types: Address, AddressInput

Medicine Types: Medicine, MedicineSearchParams

Order Types: Order, OrderItem, CreateOrderInput

Doctor Types: Doctor, Appointment, BookAppointmentInput

API Types: ApiResponse, PaginatedResponse

Utility Types: Theme, LocationData

File 4: .env.local
Purpose: Environment variables

text
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_BASE_URL=http://localhost:3000
File 5: src/lib/api-client.ts
Purpose: Axios HTTP client with interceptors

Features:

Base URL configuration

30-second timeout

Automatic JWT token injection

Session ID injection (x-session-id header)

Timezone header (x-timezone)

WithCredentials for cookies

Request Interceptor: Adds auth tokens

Response Interceptor: Global error handling (401, 403, 404, 429, 500)

File 6: src/services/auth.service.ts
Purpose: Authentication API service layer

13 Methods:

register() - User registration

login() - User login

logout() - Logout

requestOTP() - Request OTP

verifyOTP() - Verify OTP

forgotPassword() - Password reset

resetPassword() - Reset with token

getProfile() - Get user profile

updateProfile() - Update profile

changePassword() - Change password

isAuthenticated() - Check auth status

getToken() - Get JWT

getSessionId() - Get session ID

File 7: src/lib/utils.ts
Purpose: Utility helper functions

14 Functions:

cn() - Merge Tailwind classes

formatCurrency() - Indian Rupees (₹)

formatDate() - Date formatting

formatDateTime() - Date + time

formatRelativeTime() - "2 hours ago"

isValidEmail() - Email validation

isValidPhone() - Indian phone validation

truncateText() - Text truncation

getInitials() - Name initials

debounce() - Debounce function

sleep() - Async delay

generateId() - Random ID

isClient() - Check client-side

safeJsonParse() - Safe JSON parsing

File 8: src/services/medicine.service.ts
Purpose: Medicine catalog API service

15 Methods:

getMedicines() - Paginated list

searchMedicines() - Search

getMedicineById() - Single medicine

getCategories() - Categories

getDosageForms() - Dosage forms

getPopularMedicines() - Popular

getMedicinesByCategory() - Filter by category

getPrescriptionMedicines() - Rx only

getOTCMedicines() - Over-the-counter

getMedicinesByPriceRange() - Price filter

getInStockMedicines() - In stock

checkStock() - Stock check

getMedicineAlternatives() - Alternatives

getSimilarMedicines() - Recommendations

File 9: src/services/address.service.ts
Purpose: Address management API service

12 Methods:

getAddresses() - List addresses

getAddressById() - Single address

getDefaultAddress() - Default address

createAddress() - Create

updateAddress() - Update

deleteAddress() - Delete

setDefaultAddress() - Set default

checkServiceAvailability() - Delivery check

validateAddress() - Validation (6-digit PIN)

formatAddress() - Display formatting

getAddressTypeLabel() - Type labels

sortAddresses() - Sort with default first

File 10: src/services/order.service.ts
Purpose: Order processing API service

16 Methods:

getOrders() - Order history

getOrderById() - Single order

createOrder() - Place order

cancelOrder() - Cancel

trackOrder() - Track status

getOrderReceipt() - PDF receipt

reorder() - Quick reorder

getOrdersByStatus() - Filter

getOrderStats() - Statistics

calculateOrderTotal() - Calculate total

getOrderStatusLabel() - Status styling

getPaymentStatusLabel() - Payment styling

canCancelOrder() - Check cancellable

formatOrderNumber() - Format display

downloadReceipt() - Auto-download PDF

File 11: src/services/doctor.service.ts
Purpose: Doctor consultation API service

20 Methods:

getDoctors() - List doctors

searchDoctors() - Search

getDoctorById() - Doctor profile

getSpecializations() - Specializations

getNearbyDoctors() - Location-based

getDoctorAvailability() - Time slots

getDoctorReviews() - Reviews

bookConsultation() - Book appointment

getConsultations() - Consultation history

getConsultationById() - Single consultation

cancelConsultation() - Cancel

rescheduleConsultation() - Reschedule

getDoctorsBySpecialization() - Filter

getDoctorsByFeeRange() - Fee filter

getTopRatedDoctors() - Top doctors

getConsultationStatusLabel() - Status styling

getConsultationTypeIcon() - Type icons

canCancelConsultation() - Validate (2-hour buffer)

formatExperience() - Format years

getRatingStars() - Star rating display

File 12: src/store/auth.store.ts
Purpose: Authentication state management (Zustand)

State:

user - User data

isAuthenticated - Auth status

isLoading - Loading state

error - Error messages

10 Actions:

setUser() - Update user

setLoading() - Toggle loading

setError() - Set error

clearError() - Clear errors

login() - Login

register() - Register

logout() - Logout

refreshProfile() - Refresh data

updateProfile() - Update

checkAuth() - Validate token

Features: Persists to localStorage, auto-rehydration

File 13: src/store/cart.store.ts
Purpose: Shopping cart state management (Zustand)

State:

items - Cart items array

8 Actions:

addItem() - Add to cart

removeItem() - Remove

updateQuantity() - Change quantity

clearCart() - Empty cart

getItemCount() - Total items

getCartTotal() - Total price

isInCart() - Check if in cart

getItemQuantity() - Get quantity

Features: Prevents duplicates, auto-removes at 0 quantity

File 14: src/store/ui.store.ts
Purpose: Theme & UI state management (Zustand)

State:

theme - 'light' or 'dark'

sidebarOpen - Sidebar visibility

4 Actions:

setTheme() - Set theme

toggleTheme() - Toggle theme

setSidebarOpen() - Control sidebar

toggleSidebar() - Toggle sidebar

Features: Auto-applies theme to DOM, persists preference

4. Backend API Integration
Base URL
text
http://localhost:5000/api
Authentication Headers
javascript
{
  'Authorization': 'Bearer <JWT_TOKEN>',
  'x-session-id': '<SESSION_ID>',
  'x-timezone': 'Asia/Kolkata'
}
All API Services Mapped
✅ Auth API - 13 endpoints

✅ Medicine API - 15 endpoints

✅ Address API - 12 endpoints

✅ Order API - 16 endpoints

✅ Doctor API - 20 endpoints

5. State Management
Zustand Stores
✅ Auth Store - User authentication state

✅ Cart Store - Shopping cart management

✅ UI Store - Theme & sidebar state

Total State Actions: 22 methods across 3 stores

6. Next Steps
Still To Create:
UI Components:

Header (logo, location, profile dropdown)

Footer

Sidebar (dashboard navigation)

Theme toggle button

Auth modals (login/register)

Pages:

Homepage (hero section)

Login/Register pages

Dashboard layout

Medicine browsing

Order management

Doctor consultation

Advanced Features:

Protected routes middleware

Toast notifications setup

Form validation components

Loading states

Error boundaries

Summary Statistics
Total Files Created: 14

Configuration Files: 2

Type Definitions: 1

API Services: 5 (76 methods total)

State Stores: 3 (22 actions total)

Utility Functions: 14

Lines of Code: ~3,000+

Development Time: ~2 hours

Status: ✅ Core Foundation Complete - Ready for UI Component Development