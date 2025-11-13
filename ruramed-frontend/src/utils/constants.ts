// Dashboard Section Types and Configuration
export const DASHBOARD_SECTIONS = {
  OVERVIEW: 'overview',
  PROFILE: 'profile',
  ADDRESSES: 'addresses',
  CONSULTATIONS: 'consultations',
  MEDICINES: 'medicines',
  ORDERS: 'orders',
  PRESCRIPTIONS: 'prescriptions',
  SETTINGS: 'settings',
} as const;

// Section metadata for breadcrumbs, titles, descriptions
export const SECTION_METADATA = {
  overview: {
    title: 'Dashboard',
    description: 'Welcome back! Here\'s your health overview.',
    icon: 'LayoutGrid',
  },
  profile: {
    title: 'My Profile',
    description: 'Manage your personal information',
    icon: 'User',
  },
  addresses: {
    title: 'Delivery Addresses',
    description: 'Manage your delivery addresses',
    icon: 'MapPin',
  },
  consultations: {
    title: 'Consultations',
    description: 'Book and manage doctor consultations',
    icon: 'Stethoscope',
  },
  medicines: {
    title: 'Buy Medicines',
    description: 'Browse and purchase medicines',
    icon: 'Pill',
  },
  orders: {
    title: 'My Orders',
    description: 'Track and manage your orders',
    icon: 'ShoppingCart',
  },
  prescriptions: {
    title: 'Prescriptions',
    description: 'View and manage your prescriptions',
    icon: 'FileText',
  },
  settings: {
    title: 'Settings',
    description: 'Account settings and preferences',
    icon: 'Settings',
  },
} as const;

// API Endpoints (can be customized based on backend)
export const API_ENDPOINTS = {
  USER: {
    PROFILE: '/api/user/profile',
    UPDATE_PROFILE: '/api/user/profile/update',
    VERIFY_EMAIL: '/api/user/verify-email',
  },
  ADDRESSES: {
    LIST: '/api/addresses',
    CREATE: '/api/addresses/create',
    UPDATE: '/api/addresses/update',
    DELETE: '/api/addresses/delete',
    SET_DEFAULT: '/api/addresses/set-default',
  },
  MEDICINES: {
    SEARCH: '/api/medicines/search',
    LIST: '/api/medicines',
    GET_BY_ID: '/api/medicines/:id',
    CATEGORIES: '/api/medicines/categories',
  },
  ORDERS: {
    LIST: '/api/orders',
    GET_BY_ID: '/api/orders/:id',
    CREATE: '/api/orders/create',
    CANCEL: '/api/orders/cancel',
    TRACK: '/api/orders/track/:id',
  },
  DOCTORS: {
    LIST: '/api/doctors',
    GET_BY_ID: '/api/doctors/:id',
    SEARCH: '/api/doctors/search',
  },
  APPOINTMENTS: {
    LIST: '/api/appointments',
    BOOK: '/api/appointments/book',
    CANCEL: '/api/appointments/cancel',
    RESCHEDULE: '/api/appointments/reschedule',
  },
  PRESCRIPTIONS: {
    LIST: '/api/prescriptions',
    GET_BY_ID: '/api/prescriptions/:id',
    UPLOAD: '/api/prescriptions/upload',
  },
} as const;

// Pagination defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  ITEMS_PER_PAGE: 10,
  MAX_ITEMS_PER_PAGE: 50,
} as const;

// Address types
export const ADDRESS_TYPES = [
  { value: 'home', label: 'Home' },
  { value: 'work', label: 'Work' },
  { value: 'other', label: 'Other' },
] as const;

// Order statuses with colors
export const ORDER_STATUS = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: 'Clock' },
  confirmed: { label: 'Confirmed', color: 'bg-blue-100 text-blue-800', icon: 'CheckCircle' },
  processing: { label: 'Processing', color: 'bg-purple-100 text-purple-800', icon: 'Loader' },
  shipped: { label: 'Shipped', color: 'bg-cyan-100 text-cyan-800', icon: 'Truck' },
  delivered: { label: 'Delivered', color: 'bg-green-100 text-green-800', icon: 'CheckCircle2' },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: 'XCircle' },
} as const;

// Payment methods
export const PAYMENT_METHODS = [
  { value: 'cod', label: 'Cash on Delivery' },
  { value: 'card', label: 'Debit/Credit Card' },
  { value: 'online', label: 'Online Payment' },
] as const;

// Consultation types
export const CONSULTATION_TYPES = [
  { value: 'video', label: 'Video Call' },
  { value: 'audio', label: 'Audio Call' },
  { value: 'chat', label: 'Chat' },
] as const;

// Error messages
export const ERROR_MESSAGES = {
  GENERIC: 'Something went wrong. Please try again.',
  NETWORK: 'Network error. Please check your connection.',
  AUTH: 'Please log in to continue.',
  UNAUTHORIZED: 'You don\'t have permission to access this.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Server error. Please try again later.',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  PROFILE_UPDATED: 'Profile updated successfully!',
  ADDRESS_ADDED: 'Address added successfully!',
  ADDRESS_UPDATED: 'Address updated successfully!',
  ADDRESS_DELETED: 'Address deleted successfully!',
  ORDER_PLACED: 'Order placed successfully!',
  APPOINTMENT_BOOKED: 'Appointment booked successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
} as const;

// Empty states
export const EMPTY_STATES = {
  NO_ADDRESSES: 'No addresses found. Add one to get started!',
  NO_ORDERS: 'No orders yet. Start shopping now!',
  NO_CONSULTATIONS: 'No consultations scheduled. Book one now!',
  NO_PRESCRIPTIONS: 'No prescriptions yet.',
  NO_RESULTS: 'No results found.',
} as const;
