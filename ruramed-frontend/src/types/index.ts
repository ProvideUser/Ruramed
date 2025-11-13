// User Types
export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  location: string;
  role: 'user' | 'admin';
  isVerified: boolean;
  createdAt: string;
}


// Address Types
export interface Address {
  id: number;
  user_id: number;  // Changed from userId
  address_line1: string;  // Changed from street
  address_line2?: string;  // NEW
  city: string;
  state: string;
  postal_code: string;  // Changed from postalCode
  country: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;  // Changed from isDefault
  address_type: 'home' | 'work' | 'other';  // Changed from addressType
  landmark?: string;
  contact_name?: string;  // NEW
  contact_phone?: string;  // NEW
  delivery_instructions?: string;  // NEW
  created_at: string;  // Changed from createdAt
  updated_at?: string;
}

export interface AddressInput {
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  address_type: 'home' | 'work' | 'other';
  landmark?: string;
  contact_name?: string;
  contact_phone?: string;
  delivery_instructions?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}



// Medicine Types - Updated to match backend
export interface Medicine {
  id: number;
  name: string;
  generic_name: string | null;
  manufacturer: string;
  category: string;
  form: 'tablet' | 'capsule' | 'syrup' | 'injection' | 'cream' | 'drops' | 'inhaler';
  strength: string;
  price: number | string;
  mrp: number | string;
  sku: string | null;
  image_url: string | null;
  short_description: string | null;
  requires_prescription: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicineSearchParams {
  q?: string;
  category?: string;
  page?: number;
  limit?: number;
}

export interface MedicinePaginationResponse {
  medicines: Medicine[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  timestamp: string;
}


// Order Types
export interface OrderItem {
  id: number;
  orderId: number;
  medicineId: number;
  medicineName: string;
  quantity: number;
  priceAtOrder: number;
  subtotal: number;
}


export interface Order {
  id: number;
  orderNumber?: string;
  userId: number;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  shippingAddress: string;
  paymentMethod: 'cod' | 'online' | 'card';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  prescriptionUrl?: string;
  items: OrderItem[];
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
}


export interface CreateOrderInput {
  items: Array<{
    medicineId: number;
    quantity: number;
  }>;
  addressId: number;
  paymentMethod: 'cod' | 'online' | 'card';
  prescriptionUrl?: string;
  specialInstructions?: string;
}


// Doctor Types
export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  qualification: string;
  experience: number;
  consultationFee: number;
  rating: number;
  totalConsultations: number;
  availability: string;
  imageUrl?: string;
  bio?: string;
  languages: string[];
  location: string;
}


export interface Appointment {
  id: number;
  userId: number;
  doctorId: number;
  doctorName: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  consultationType: 'video' | 'audio' | 'chat';
  symptoms?: string;
  prescription?: string;
  notes?: string;
  createdAt: string;
}


export interface BookAppointmentInput {
  doctorId: number;
  appointmentDate: string;
  appointmentTime: string;
  consultationType: 'video' | 'audio' | 'chat';
  symptoms?: string;
}


// ============================================================================
// AUTH TYPES - UPDATED WITH TOKEN REFRESH SUPPORT
// ============================================================================

export interface LoginInput {
  email: string;
  password: string;
}


export interface RegisterInput {
  name: string;
  email: string;
  phone: string;
  password: string;
  location?: string;
  otp?: string;
  otp_code?: string;
}


// ✅ UPDATED: Added new token fields for token refresh mechanism
export interface AuthResponse {
  message: string;
  
  // ✅ NEW: Token Refresh Support (v2)
  accessToken?: string;           // Short-lived JWT access token (15 minutes)
  refreshToken?: string;          // Long-lived JWT refresh token (7 days)
  expiresIn?: number;             // Access token expiry in seconds (900 = 15 min)
  
  // Session Management
  sessionId?: string;
  session_id?: string;
  
  // User Data
  user?: User;
  
  // Registration with OTP
  emailVerificationRequired?: boolean;
  email_verification_required?: boolean;
  expiresAt?: string;
  expires_at?: string;
  
  // ⚠️ DEPRECATED: Legacy single token format (kept for backward compatibility)
  token?: string;
  
  // Metadata
  timestamp?: string;
}


// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
}


export interface PaginatedResponse<T> {
  data: T[];
  pagination?: {
    currentPage: number;
    totalItems: number;
    totalPages: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  success: boolean;
  total?: number;
  page?: number;
  limit?: number;
}



// Theme Types
export type Theme = 'light' | 'dark';


// Location Types
export interface LocationData {
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
}


// ============================================================================
// PASSWORD RESET TYPES
// ============================================================================

export interface ForgotPasswordInput {
  identifier: string; // email or phone
}


export interface ForgotPasswordResponse {
  message: string;
  timestamp: string;
}


export interface ResetPasswordInput {
  email: string;
  otp: string;
  new_password: string;
}


export interface ResetPasswordResponse {
  message: string;
  timestamp: string;
}


export interface VerifyOTPInput {
  email: string;
  otp: string;
  otp_type?: string;
}

// ============================================================================
// USER PROFILE TYPES - NEW
// ============================================================================

export interface UserProfile {
  id: number;
  userId: number;
  fullName: string | null;
  profilePicture: string | null;
  gender: 'Male' | 'Female' | 'Other' | 'Prefer not to say' | null;
  dateOfBirth: string | null; // YYYY-MM-DD format
  bloodGroup: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown' | 'Prefer not to say' | null;
  emailVerified: boolean;
  mobileVerified: boolean;
  alternateContact: string | null;
  customerUniqueId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserProfileInput {
  fullName?: string;
  profilePicture?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  dateOfBirth?: string; // YYYY-MM-DD format
  bloodGroup?: 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-' | 'Unknown' | 'Prefer not to say';
  alternateContact?: string;
}

export interface UserProfileResponse {
  profile: UserProfile;
  timestamp: string;
}
