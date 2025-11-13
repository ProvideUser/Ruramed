# RuraMed Backend API — Frontend Integration Guide

## Connection
- Base URL: `http://localhost:5000`
- Content-Type: `application/json`
- Auth:
  - User routes: `Authorization: Bearer <JWT>` and `x-session-id: <sessionId>` (required together)
  - Admin routes: `Authorization: Bearer <JWT>` (role=admin)
- Pagination: `?page=<int>&limit=<int>` (limit 1–100)
- Date ranges (where supported): `?start_date=YYYY-MM-DD&end_date=YYYY-MM-DD`
- Errors: `{ error, message?, timestamp, path?, method?, requestId? }`
- Rate limits: `429 Too Many Requests` when exceeded

## Quick client setup (Axios)
```js
import axios from 'axios';
export const api = axios.create({ baseURL: 'http://localhost:5000', headers: { 'Content-Type': 'application/json' } });
// Set tokens per login
export function setUserAuth(token, sessionId) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
  api.defaults.headers.common['x-session-id'] = sessionId; // required for user-protected routes
}
export function setAdminAuth(token) {
  api.defaults.headers.common.Authorization = `Bearer ${token}`;
  delete api.defaults.headers.common['x-session-id'];
}
```

## Auth
- `POST /api/auth/register`
  - Step 1 (send OTP): `{ name, email, phone, password, location? }` → 202 + `expires_at`
  - Step 2 (create): same body + `{ otp }` → 201 `{ user_id }`
- `POST /api/auth/login`: `{ email, password }` → `{ token, sessionId, user }`
- `POST /api/auth/logout`: headers: Authorization + x-session-id
- `GET /api/auth/profile`: headers: Authorization + x-session-id
- `PUT /api/auth/profile`: headers: Authorization + x-session-id; body: `{ name?, phone?, location? }`
- `POST /api/auth/forgot-password`: `{ email }`
- `POST /api/auth/reset-password`: `{ email, otp, new_password }`
- `POST /api/auth/verify-otp`: `{ email, otp, otp_type }` (otp_type: `email_verification` | `forgot_password`)
- `POST /api/auth/resend-otp`: `{ email, otp_type }`

## Users (require user auth + x-session-id)
- `GET /api/users/profile`
- `PUT /api/users/profile`
- `DELETE /api/users/profile`
- `GET /api/users/orders?page&limit&start_date&end_date`
- `GET /api/users/orders/:orderId`
- `GET /api/users/addresses`
- `GET /api/users/prescriptions?page&limit`
- `GET /api/users/prescriptions/:prescriptionId`
- `GET /api/users/consultations?page&limit&start_date&end_date`
- `GET /api/users/sessions`
- `DELETE /api/users/sessions/:sessionId`
- `DELETE /api/users/sessions` (revoke all)
- `GET /api/users/stats`

## Addresses (require user auth + x-session-id)
- `GET /api/addresses`
- `POST /api/addresses`: `{ address_line1, city, state, postal_code, ... }`
- `GET /api/addresses/:id`
- `PUT /api/addresses/:id`
- `DELETE /api/addresses/:id`
- `PATCH /api/addresses/:id/set-default`
- `GET /api/addresses/default/current`
- `POST /api/addresses/validate`
- `POST /api/addresses/geocode`
- `GET /api/addresses/:id/service-check`

## Medicines
- Public:
  - `GET /api/medicines?page&limit`
  - `GET /api/medicines/search?q=&category=&location=&page&limit`
  - `GET /api/medicines/categories`
  - `GET /api/medicines/forms`
  - `GET /api/medicines/popular?page&limit`
  - `GET /api/medicines/:id`
- Admin (require admin auth):
  - `POST /api/medicines`
  - `PUT /api/medicines/:id`
  - `DELETE /api/medicines/:id`
  - `PATCH /api/medicines/:id/status`
  - `POST /api/medicines/bulk/import`
  - `PATCH /api/medicines/bulk/update-prices`
  - `GET /api/medicines/analytics/inventory`
  - `GET /api/medicines/analytics/popular?page&limit`

## Doctors
- Public:
  - `GET /api/doctors?page&limit`
  - `GET /api/doctors/search?page&limit&…` (controller handles filters)
  - `GET /api/doctors/specialties`
  - `GET /api/doctors/nearby?lat=&lng=&page&limit`
  - `GET /api/doctors/:id`
  - `GET /api/doctors/:id/availability`
- User (auth + x-session-id):
  - `POST /api/doctors/:id/consultation`
  - `GET /api/doctors/:id/reviews?page&limit`
  - `POST /api/doctors/:id/review`
- Admin (admin auth):
  - `POST /api/doctors`
  - `PUT /api/doctors/:id`
  - `DELETE /api/doctors/:id`
  - `PATCH /api/doctors/:id/status`
  - `GET /api/doctors/admin/pending?page&limit`
  - `GET /api/doctors/admin/analytics`

## Orders
- User (auth + x-session-id):
  - `GET /api/orders?page&limit&start_date&end_date`
  - `POST /api/orders`: `{ medicines:[{id,quantity}], address_id, ... }`
  - `GET /api/orders/:id`
  - `PATCH /api/orders/:id/cancel`
  - `GET /api/orders/:id/tracking`
  - `GET /api/orders/:id/receipt`
  - `POST /api/orders/:id/reorder`
- Admin (prefer `/api/admin` endpoints below). Note: there are also `/api/orders/admin/*` equivalents.

## Delivery
- Public:
  - `GET /api/delivery/check-service-area?lat=&lng=`
  - `GET /api/delivery/service-areas`
  - `GET /api/delivery/delivery-fee?lat=&lng=`
  - `GET /api/delivery/estimate-time?lat=&lng=`
- User (auth + x-session-id):
  - `GET /api/delivery/tracking/:orderId`
  - `POST /api/delivery/schedule`
  - `PATCH /api/delivery/update-address/:orderId`
- Admin (admin auth):
  - `GET /api/delivery/admin/all?page&limit`
  - `POST /api/delivery/admin/service-areas`
  - `PUT /api/delivery/admin/service-areas/:id`
  - `DELETE /api/delivery/admin/service-areas/:id`
  - `PATCH /api/delivery/admin/delivery/:id/status`
  - `GET /api/delivery/admin/analytics`
  - `GET /api/delivery/admin/pending?page&limit`

## Geocoding (public)
- `GET /api/geocode/forward?query=...`
- `GET /api/geocode` (same as forward; legacy)
- `GET /api/geocode/reverse?lat=&lng=`
- `GET /api/geocode/distance?fromLat=&fromLng=&toLat=&toLng=`
- `GET /api/geocode/nearby?lat=&lng=`
- `GET /api/geocode/autocomplete?query=...`
- `POST /api/geocode/validate`
- `GET /api/geocode/postal/:code`
- `GET /api/geocode/city/:name`

## Admin (admin auth)
- `POST /api/admin/login`: `{ email, password }` → `{ token }`
- `GET /api/admin/dashboard`
- `GET /api/admin/analytics/overview?start_date&end_date`
- `GET /api/admin/analytics/users?start_date&end_date`
- `GET /api/admin/analytics/sales?start_date&end_date`
- Users:
  - `GET /api/admin/users?page&limit`
  - `GET /api/admin/users/:id`
  - `PATCH /api/admin/users/:id/status` `{ action: 'revoke_sessions' | 'block_devices' }`
  - `DELETE /api/admin/users/:id`
- Orders:
  - `GET /api/admin/orders?page&limit&start_date&end_date`
  - `PATCH /api/admin/orders/:id/status` `{ status: pending|approved|out_for_delivery|delivered }`
- Prescriptions:
  - `GET /api/admin/prescriptions?page&limit`
  - `GET /api/admin/prescriptions/pending?page&limit`
  - `PATCH /api/admin/prescriptions/:id/approve`
  - `PATCH /api/admin/prescriptions/:id/reject` `{ doctor_notes? }`
- Security & audit:
  - `GET /api/admin/security/events?page&limit&start_date&end_date`
  - `GET /api/admin/audit/logs?page&limit&start_date&end_date`
  - `GET /api/admin/sessions/active?page&limit`
  - `DELETE /api/admin/sessions/:sessionId`
- System:
  - `GET /api/admin/system/health`
  - `GET /api/admin/system/logs?page&limit`
  - `POST /api/admin/system/cache/clear`
- Admins management:
  - `POST /api/admin/admins` `{ name, email, password }`
  - `GET /api/admin/admins?page&limit`
  - `DELETE /api/admin/admins/:id`

## Health
- `GET /api/health`
- `GET /api/health/status`
- Admin-only: `GET /api/health/system`, `GET /api/health/database`, `GET /api/health/cache`, `GET /api/health/metrics`

## Dev-only (when NODE_ENV !== production)
- `GET /api/cache/stats`

## Auth flow snippets
```js
// Registration (2-step)
await api.post('/api/auth/register', { name, email, phone, password }); // 202
await api.post('/api/auth/register', { name, email, phone, password, otp }); // 201

// Login (store token & session for user)
const { data, headers } = await api.post('/api/auth/login', { email, password });
setUserAuth(data.token, headers['x-session-id']);

// Admin login
const admin = await api.post('/api/admin/login', { email, password });
setAdminAuth(admin.data.token);
```

## Notes
- Always include `x-session-id` for user-protected endpoints; admin endpoints do not use sessionId.
- On password reset, all user sessions are invalidated—expect 401 until re-login.
- Expect 429 responses under high request rates; backoff and retry.
