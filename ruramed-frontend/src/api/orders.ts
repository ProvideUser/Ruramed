import apiClient from './client';
import { Order, CreateOrderInput, ApiResponse, PaginatedResponse } from '@/types';

export const ordersApi = {
  // Get all orders with pagination
  getOrders: async (page = 1, limit = 10) => {
    const response = await apiClient.get<PaginatedResponse<Order>>(
      `/api/orders?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Get single order by ID
  getOrderById: async (orderId: number) => {
    const response = await apiClient.get<ApiResponse<Order>>(`/api/orders/${orderId}`);
    return response.data;
  },

  // Create new order
  createOrder: async (data: CreateOrderInput) => {
    const response = await apiClient.post<ApiResponse<Order>>('/api/orders', data);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId: number, reason?: string) => {
    const response = await apiClient.post<ApiResponse<{ message: string }>>(
      `/api/orders/${orderId}/cancel`,
      { reason }
    );
    return response.data;
  },

  // Track order
  trackOrder: async (orderId: number) => {
    const response = await apiClient.get<ApiResponse<{
      status: string;
      trackingNumber?: string;
      estimatedDelivery?: string;
      lastUpdate: string;
    }>>(`/api/orders/${orderId}/track`);
    return response.data;
  },

  // Get orders by status
  getOrdersByStatus: async (status: string, page = 1, limit = 10) => {
    const response = await apiClient.get<PaginatedResponse<Order>>(
      `/api/orders/status/${status}?page=${page}&limit=${limit}`
    );
    return response.data;
  },

  // Get order statistics
  getOrderStats: async () => {
    const response = await apiClient.get<ApiResponse<{
      totalOrders: number;
      pendingOrders: number;
      completedOrders: number;
      totalSpent: number;
    }>>('/api/orders/stats');
    return response.data;
  },
};
