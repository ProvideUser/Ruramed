import apiClient from './client';
import { Medicine, MedicineSearchParams, ApiResponse, PaginatedResponse } from '@/types';

export const medicinesApi = {
  // Get all medicines with pagination
  getMedicines: async (page = 1, limit = 10) => {
    const response = await apiClient.get<PaginatedResponse<Medicine>>(
      `/api/medicines?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Search medicines
  searchMedicines: async (params: MedicineSearchParams) => {
    const queryString = new URLSearchParams();
    
    if (params.query) queryString.append('query', params.query);
    if (params.category) queryString.append('category', params.category);
    if (params.minPrice) queryString.append('minPrice', params.minPrice.toString());
    if (params.maxPrice) queryString.append('maxPrice', params.maxPrice.toString());
    if (params.requiresPrescription !== undefined) 
      queryString.append('requiresPrescription', params.requiresPrescription.toString());
    if (params.inStock !== undefined) queryString.append('inStock', params.inStock.toString());
    if (params.location) queryString.append('location', params.location);
    if (params.page) queryString.append('page', params.page.toString());
    if (params.limit) queryString.append('limit', params.limit.toString());

    const response = await apiClient.get<PaginatedResponse<Medicine>>(
      `/api/medicines/search?${queryString.toString()}`
    );
    return response.data;
  },

  // Get single medicine by ID
  getMedicineById: async (medicineId: number) => {
    const response = await apiClient.get<ApiResponse<Medicine>>(`/api/medicines/${medicineId}`);
    return response.data;
  },

  // Get medicine categories
  getCategories: async () => {
    const response = await apiClient.get<ApiResponse<{ categories: string[] }>>(
      '/api/medicines/categories'
    );
    return response.data;
  },

  // Get medicines by category
  getMedicinesByCategory: async (category: string, page = 1, limit = 10) => {
    const response = await apiClient.get<PaginatedResponse<Medicine>>(
      `/api/medicines/category/${category}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Get medicines near user location
  getMedicinesNearby: async (latitude: number, longitude: number, radius = 10) => {
    const response = await apiClient.get<PaginatedResponse<Medicine>>(
      `/api/medicines/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`
    );
    return response.data;
  },

  // Check medicine stock
  checkStock: async (medicineId: number) => {
    const response = await apiClient.get<ApiResponse<{ inStock: boolean; quantity: number }>>(
      `/api/medicines/${medicineId}/stock`
    );
    return response.data;
  },
};
