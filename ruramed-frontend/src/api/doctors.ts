import apiClient from './client';
import { Doctor, Appointment, BookAppointmentInput, ApiResponse, PaginatedResponse } from '@/types';

export const doctorsApi = {
  // Get all doctors with pagination
  getDoctors: async (page = 1, limit = 10) => {
    const response = await apiClient.get<PaginatedResponse<Doctor>>(
      `/api/doctors?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Search doctors
  searchDoctors: async (query: string, specialization?: string, page = 1, limit = 10) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (specialization) params.append('specialization', specialization);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await apiClient.get<PaginatedResponse<Doctor>>(
      `/api/doctors/search?${params.toString()}`
    );
    return response.data;
  },

  // Get single doctor by ID
  getDoctorById: async (doctorId: number) => {
    const response = await apiClient.get<ApiResponse<Doctor>>(`/api/doctors/${doctorId}`);
    return response.data;
  },

  // Get doctors by specialization
  getDoctorsBySpecialization: async (specialization: string, page = 1, limit = 10) => {
    const response = await apiClient.get<PaginatedResponse<Doctor>>(
      `/api/doctors/specialization/${specialization}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Get doctor availability
  getDoctorAvailability: async (doctorId: number) => {
    const response = await apiClient.get<ApiResponse<{ availability: string[] }>>(
      `/api/doctors/${doctorId}/availability`
    );
    return response.data;
  },

  // Get user's appointments
  getAppointments: async (page = 1, limit = 10) => {
    const response = await apiClient.get<PaginatedResponse<Appointment>>(
      `/api/appointments?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Get single appointment
  getAppointmentById: async (appointmentId: number) => {
    const response = await apiClient.get<ApiResponse<Appointment>>(
      `/api/appointments/${appointmentId}`
    );
    return response.data;
  },

  // Book appointment
  bookAppointment: async (data: BookAppointmentInput) => {
    const response = await apiClient.post<ApiResponse<Appointment>>(
      '/api/appointments/book',
      data
    );
    return response.data;
  },

  // Cancel appointment
  cancelAppointment: async (appointmentId: number, reason?: string) => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/api/appointments/${appointmentId}/cancel`,
      { reason }
    );
    return response.data;
  },

  // Reschedule appointment
  rescheduleAppointment: async (
    appointmentId: number,
    newDate: string,
    newTime: string
  ) => {
    const response = await apiClient.post<ApiResponse<Appointment>>(
      `/api/appointments/${appointmentId}/reschedule`,
      { appointmentDate: newDate, appointmentTime: newTime }
    );
    return response.data;
  },

  // Get doctor specializations
  getSpecializations: async () => {
    const response = await apiClient.get<ApiResponse<{ specializations: string[] }>>(
      '/api/doctors/specializations'
    );
    return response.data;
  },
};
