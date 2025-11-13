import apiClient from '@/lib/api-client';
import { Order, CreateOrderInput, ApiResponse, PaginatedResponse } from '@/types';

export const orderService = {
  /**
   * Get user's order history with pagination
   */
  getOrders: async (page = 1, limit = 10): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get<{
      success: boolean;
      data: Order[];
      pagination: {
        currentPage: number;
        totalItems: number;
        totalPages: number;
        itemsPerPage: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
      };
    }>(`/users/orders?page=${page}&limit=${limit}`);
    
    // ✅ CRITICAL FIX: Return the correct structure
    return {
      data: response.data.data,
      pagination: response.data.pagination,
      success: response.data.success,
      total: response.data.pagination.totalItems,
      page: response.data.pagination.currentPage,
      limit: response.data.pagination.itemsPerPage,
    };
  },

  /**
   * Get single order by ID with full details
   */
  getOrderById: async (id: number): Promise<Order> => {
    const response = await apiClient.get<ApiResponse<Order>>(`/users/orders/${id}`);
    return response.data.data!;
  },

  /**
   * Create new order
   */
  createOrder: async (data: CreateOrderInput): Promise<Order> => {
    const response = await apiClient.post<ApiResponse<Order>>('/orders', data);
    return response.data.data!;
  },

  /**
   * Cancel order (only if status is pending/confirmed)
   */
  cancelOrder: async (id: number, reason?: string): Promise<Order> => {
    const response = await apiClient.put<ApiResponse<Order>>(`/orders/${id}/cancel`, {
      reason,
    });
    return response.data.data!;
  },

  /**
   * Track order status and location
   */
  trackOrder: async (id: number): Promise<{
    order: Order;
    trackingInfo: {
      currentStatus: string;
      lastUpdated: string;
      estimatedDelivery: string;
      trackingNumber?: string;
      location?: string;
    };
  }> => {
    const response = await apiClient.get<ApiResponse<any>>(`/orders/${id}/track`);
    return response.data.data!;
  },

  /**
   * Generate and download order receipt/invoice
   */
  getOrderReceipt: async (id: number): Promise<Blob> => {
    const response = await apiClient.get(`/orders/${id}/receipt`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Reorder - Get order details for quick reorder
   */
  reorder: async (id: number): Promise<{
    medicines: Array<{ id: number; name: string; quantity: number }>;
    totalAmount: number;
  }> => {
    const response = await apiClient.post<ApiResponse<any>>(`/orders/${id}/reorder`);
    return response.data.data!;
  },

  /**
   * Get orders by status
   */
  getOrdersByStatus: async (
    status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled',
    page = 1,
    limit = 10
  ): Promise<PaginatedResponse<Order>> => {
    const response = await apiClient.get<PaginatedResponse<Order>>(
      `/users/orders?status=${status}&page=${page}&limit=${limit}`
    );
    return response.data;
  },

  /**
   * Get order statistics for user
   */
  getOrderStats: async (): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalSpent: number;
  }> => {
    const response = await apiClient.get<ApiResponse<any>>('/users/stats');
    return response.data.data!;
  },

  /**
   * Calculate order total (client-side utility)
   */
  calculateOrderTotal: (items: Array<{ price: number; quantity: number }>): number => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  },

  /**
   * Get order status label with color
   */
  getOrderStatusLabel: (
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
      pending: {
        label: '⏳ Pending',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-100',
      },
      confirmed: {
        label: '✓ Confirmed',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
      },
      processing: {
        label: '📦 Processing',
        color: 'text-purple-700',
        bgColor: 'bg-purple-100',
      },
      shipped: {
        label: '🚚 Shipped',
        color: 'text-indigo-700',
        bgColor: 'bg-indigo-100',
      },
      delivered: {
        label: '✅ Delivered',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
      },
      cancelled: {
        label: '❌ Cancelled',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
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
   * Get payment status label with color
   */
  getPaymentStatusLabel: (
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
      pending: {
        label: '⏳ Payment Pending',
        color: 'text-orange-700',
        bgColor: 'bg-orange-100',
      },
      paid: {
        label: '✓ Paid',
        color: 'text-green-700',
        bgColor: 'bg-green-100',
      },
      failed: {
        label: '❌ Payment Failed',
        color: 'text-red-700',
        bgColor: 'bg-red-100',
      },
      refunded: {
        label: '↩️ Refunded',
        color: 'text-blue-700',
        bgColor: 'bg-blue-100',
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
   * Check if order can be cancelled
   */
  canCancelOrder: (order: Order): boolean => {
    return ['pending', 'confirmed'].includes(order.status);
  },

  /**
   * Format order number for display
   */
  formatOrderNumber: (orderNumber: string): string => {
    // Format as ORD-XXXX-XXXX
    if (orderNumber.length >= 8) {
      return `ORD-${orderNumber.slice(0, 4)}-${orderNumber.slice(4, 8)}`;
    }
    return orderNumber;
  },

  /**
   * Download receipt as PDF
   */
  downloadReceipt: async (orderId: number): Promise<void> => {
    try {
      const blob = await orderService.getOrderReceipt(orderId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download receipt:', error);
      throw error;
    }
  },
};
