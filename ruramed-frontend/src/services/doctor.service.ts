import apiClient from '@/lib/api-client';
import { Doctor, Appointment, BookAppointmentInput, ApiResponse, PaginatedResponse } from '@/types';

export const doctorService = {
  /**
   * Get paginated list of doctors with optional filters
   */
  getDoctors: async (params?: {
    specialization?: string;
    minFee?: number;
    maxFee?: number;
    minRating?: number;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResponse<Doctor>> => {
    const queryParams = new URLSearchParams();
    
    if (params?.specialization) queryParams.append('specialization', params.specialization);
    if (params?.minFee) queryParams.append('minFee', params.minFee.toString());
    if (params?.maxFee) queryParams.append('maxFee', params.maxFee.toString());
    if (params?.minRating) queryParams.append('minRating', params.minRating.toString());
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginatedResponse<Doctor>>(
      `/doctors?${queryParams.toString()}`
    );
    return response.data;
  },

  /**
   * Search doctors by name or specialization
   */
  searchDoctors: async (query: string, page = 1, limit = 20): Promise<PaginatedResponse<Doctor>> => {
    const response = await apiClient.get<PaginatedResponse<Doctor>>(
      `/doctors/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Get single doctor profile by ID
   */
  getDoctorById: async (id: number): Promise<Doctor> => {
    const response = await apiClient.get<ApiResponse<Doctor>>(`/doctors/${id}`);
    return response.data.data!;
  },

  /**
   * Get all specializations
   */
  getSpecializations: async (): Promise<string[]> => {
    const response = await apiClient.get<ApiResponse<string[]>>('/doctors/specialties');
    return response.data.data!;
  },

  /**
   * Find doctors near user's location
   */
  getNearbyDoctors: async (
    latitude: number,
    longitude: number,
    radius = 10,
    limit = 20
  ): Promise<Doctor[]> => {
    const response = await apiClient.get<ApiResponse<Doctor[]>>(
      `/doctors/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}&limit=${limit}`
    );
    return response.data.data!;
  },

  /**
   * Get doctor's available time slots
   */
  getDoctorAvailability: async (
    doctorId: number,
    date?: string
  ): Promise<{
    date: string;
    slots: Array<{
      time: string;
      available: boolean;
    }>;
  }> => {
    const url = date
      ? `/doctors/${doctorId}/availability?date=${date}`
      : `/doctors/${doctorId}/availability`;
    
    const response = await apiClient.get<ApiResponse<any>>(url);
    return response.data.data!;
  },

  /**
   * Get doctor reviews and ratings
   */
  getDoctorReviews: async (
    doctorId: number,
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<{
    id: number;
    userId: number;
    userName: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>> => {
    const response = await apiClient.get<PaginatedResponse<any>>(
      `/doctors/${doctorId}/reviews?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Book consultation with doctor (requires authentication)
   */
  bookConsultation: async (data: BookAppointmentInput): Promise<Appointment> => {
    const response = await apiClient.post<ApiResponse<Appointment>>(
      `/doctors/${data.doctorId}/book`,
      data
    );
    return response.data.data!;
  },

  /**
   * Get user's consultation history
   */
  getConsultations: async (page = 1, limit = 10): Promise<PaginatedResponse<Appointment>> => {
    const response = await apiClient.get<PaginatedResponse<Appointment>>(
      `/users/consultations?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Get single consultation details
   */
  getConsultationById: async (id: number): Promise<Appointment> => {
    const response = await apiClient.get<ApiResponse<Appointment>>(`/users/consultations/${id}`);
    return response.data.data!;
  },

  /**
   * Cancel consultation
   */
  cancelConsultation: async (id: number, reason?: string): Promise<Appointment> => {
    const response = await apiClient.put<ApiResponse<Appointment>>(
      `/users/consultations/${id}/cancel`,
      { reason }
    );
    return response.data.data!;
  },

  /**
   * Reschedule consultation
   */
  rescheduleConsultation: async (
    id: number,
    newDate: string,
    newTime: string
  ): Promise<Appointment> => {
    const response = await apiClient.put<ApiResponse<Appointment>>(
      `/users/consultations/${id}/reschedule`,
      { newDate, newTime }
    );
    return response.data.data!;
  },

  /**
   * Get doctors by specialization
   */
  getDoctorsBySpecialization: async (
    specialization: string,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Doctor>> => {
    const response = await apiClient.get<PaginatedResponse<Doctor>>(
      `/doctors?specialization=${encodeURIComponent(specialization)}&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Filter doctors by consultation fee range
   */
  getDoctorsByFeeRange: async (
    minFee: number,
    maxFee: number,
    page = 1,
    limit = 20
  ): Promise<PaginatedResponse<Doctor>> => {
    const response = await apiClient.get<PaginatedResponse<Doctor>>(
      `/doctors?minFee=${minFee}&maxFee=${maxFee}&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Get top-rated doctors
   */
  getTopRatedDoctors: async (limit = 10): Promise<Doctor[]> => {
    const response = await apiClient.get<ApiResponse<Doctor[]>>(
      `/doctors?minRating=4&limit=${limit}`
    );
    return response.data.data!;
  },

  /**
   * Get consultation status label with styling
   */
  getConsultationStatusLabel: (
    status: string
  ): {
    label: string;
    color: string;
    bgColor: string;
  } => {
    const statusMap: Record<
      string,
      { label: string; color: string; bgColor: string }
    > = {
      scheduled: {
        label: '📅 Scheduled',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
      },
      completed: {
        label: '✅ Completed',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
      },
      cancelled: {
        label: '❌ Cancelled',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
      },
      rescheduled: {
        label: '🔄 Rescheduled',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
      },
    };

    return (
      statusMap[status] || {
        label: status,
        color: 'text-gray-700',
        bgColor: 'bg-gray-100',
      }
    );
  },

  /**
   * Get consultation type icon
   */
  getConsultationTypeIcon: (type: 'video' | 'audio' | 'chat'): string => {
    const icons = {
      video: '📹',
      audio: '🎤',
      chat: '💬',
    };
    return icons[type] || '📞';
  },

  /**
   * Check if consultation can be cancelled
   */
  canCancelConsultation: (appointment: Appointment): boolean => {
    if (appointment.status !== 'scheduled') return false;
    
    // Check if appointment is at least 2 hours away
    const appointmentTime = new Date(`${appointment.appointmentDate} ${appointment.appointmentTime}`);
    const now = new Date();
    const hoursUntilAppointment = (appointmentTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    return hoursUntilAppointment >= 2;
  },

  /**
   * Format doctor experience
   */
  formatExperience: (years: number): string => {
    if (years === 1) return '1 year';
    return `${years} years`;
  },

  /**
   * Get rating stars display
   */
  getRatingStars: (rating: number): string => {
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    
    return '⭐'.repeat(fullStars) + (hasHalfStar ? '⭐' : '') + '☆'.repeat(emptyStars);
  },
};
