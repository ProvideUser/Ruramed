import apiClient from '@/lib/api-client';
import { Medicine, MedicineSearchParams, MedicinePaginationResponse } from '@/types';

export const medicineService = {
  /**
   * Get all medicines with pagination and optional category filter
   * Backend: GET /api/medicines?page=1&limit=12&category=Pain%20Relief
   */
  getAllMedicines: async (page: number = 1, limit: number = 12, category?: string): Promise<MedicinePaginationResponse> => {
    const params: any = { page, limit };
    if (category && category !== 'all') {
      params.category = category;
    }
    
    const response = await apiClient.get<MedicinePaginationResponse>('/medicines', { params });
    return response.data;
  },

  /**
   * Search medicines by name, generic name, or description
   * Backend: GET /api/medicines/search?q=aspirin&category=Pain&page=1&limit=12
   */
  searchMedicines: async (searchParams: MedicineSearchParams): Promise<MedicinePaginationResponse> => {
    const response = await apiClient.get<MedicinePaginationResponse>('/medicines/search', {
      params: searchParams
    });
    return response.data;
  },

  /**
   * Get single medicine by ID
   * Backend: GET /api/medicines/:id
   */
  getMedicineById: async (id: number): Promise<Medicine> => {
    const response = await apiClient.get<{ medicine: Medicine; timestamp: string }>(`/medicines/${id}`);
    return response.data.medicine;
  },

  /**
   * Get all medicine categories
   * Backend: GET /api/medicines/categories
   */
  getCategories: async (): Promise<string[]> => {
    const response = await apiClient.get<{ categories: string[]; count: number; timestamp: string }>('/medicines/categories');
    return response.data.categories;
  },

  /**
   * Get all medicine forms (tablet, capsule, syrup, etc.)
   * Backend: GET /api/medicines/forms
   */
  getForms: async (): Promise<string[]> => {
    const response = await apiClient.get<{ forms: string[]; count: number; timestamp: string }>('/medicines/forms');
    return response.data.forms;
  },

  /**
   * Get popular medicines
   * Backend: GET /api/medicines/popular?page=1&limit=10
   */
  getPopularMedicines: async (page: number = 1, limit: number = 10): Promise<MedicinePaginationResponse> => {
    const response = await apiClient.get<MedicinePaginationResponse>('/medicines/popular', {
      params: { page, limit }
    });
    return response.data;
  },

  /**
   * Format medicine display name with strength
   */
  getDisplayName: (medicine: Medicine): string => {
    return `${medicine.name} ${medicine.strength}`;
  },

  /**
   * Calculate discount percentage from MRP
   */
  getDiscountPercentage: (medicine: Medicine): number => {
    const mrp = Number(medicine.mrp);
    const price = Number(medicine.price);
    if (!mrp || mrp === 0) return 0;
    return Math.round(((mrp - price) / mrp) * 100);
  },

  /**
   * Get user-friendly form label with emoji
   */
  getFormLabel: (form: string): string => {
    const labels: { [key: string]: string } = {
      tablet: '💊 Tablet',
      capsule: '💊 Capsule',
      syrup: '🍶 Syrup',
      injection: '💉 Injection',
      cream: '🧴 Cream',
      drops: '💧 Drops',
      inhaler: '🌬️ Inhaler',
    };
    return labels[form.toLowerCase()] || form;
  },

  /**
   * Check if medicine requires prescription
   */
  requiresPrescription: (medicine: Medicine): boolean => {
    return !!medicine.requires_prescription;
  },


  /**
   * Check if medicine is active
   */
  isActive: (medicine: Medicine): boolean => {
    return !!medicine.is_active;
  },

  /**
   * Format price with currency symbol
   */
  formatPrice: (price: number | string): string => {
    return `₹${Number(price).toFixed(2)}`;
  },

  /**
   * Get savings amount
   */
  getSavingsAmount: (medicine: Medicine): number => {
    const mrp = Number(medicine.mrp);
    const price = Number(medicine.price);
    if (!mrp || mrp <= price) return 0;
    return mrp - price;
  },
}