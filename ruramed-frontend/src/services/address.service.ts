import apiClient from '@/lib/api-client';
import { Address, AddressInput, ApiResponse } from '@/types';

export const addressService = {
  /**
   * Get all addresses for current user
   */
  getAddresses: async (): Promise<Address[]> => {
    const response = await apiClient.get<{ addresses: Address[]; count: number; timestamp: string }>('/addresses');
    return response.data.addresses;
  },

  /**
   * Get single address by ID
   */
  getAddressById: async (id: number): Promise<Address> => {
    const response = await apiClient.get<{ address: Address; timestamp: string }>(`/addresses/${id}`);
    return response.data.address;
  },

  /**
   * Get default address for current user
   */
  getDefaultAddress: async (): Promise<Address | null> => {
    try {
      const response = await apiClient.get<{ address: Address; timestamp: string }>('/addresses/default/current');
      return response.data.address;
    } catch (error: any) {
      // If no default address exists, return null
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  },

  /**
   * Create new address
   */
  createAddress: async (data: AddressInput): Promise<number> => {
    const response = await apiClient.post<{ message: string; address_id: number; timestamp: string }>('/addresses', data);
    return response.data.address_id;
  },

  /**
   * Update existing address
   */
  updateAddress: async (id: number, data: Partial<AddressInput>): Promise<void> => {
    await apiClient.put<{ message: string; timestamp: string }>(`/addresses/${id}`, data);
  },

  /**
   * Delete address
   */
  deleteAddress: async (id: number): Promise<void> => {
    await apiClient.delete<{ message: string; timestamp: string }>(`/addresses/${id}`);
  },

  /**
   * Set address as default
   * ✅ FIXED: Changed from PUT /default to PATCH /set-default
   */
  setDefaultAddress: async (id: number): Promise<void> => {
    await apiClient.patch<{ message: string; timestamp: string }>(`/addresses/${id}/set-default`);
  },

  /**
   * Check if delivery service is available for an address
   * ✅ FIXED: Changed from /check-service to /service-check
   */
  checkServiceAvailability: async (id: number): Promise<{
    address_id: number;
    is_serviced: boolean;
    service_area: {
      name: string;
      delivery_fee: number;
      delivery_time_hours: number;
      min_order_amount: number;
    } | null;
    timestamp: string;
  }> => {
    const response = await apiClient.get(`/addresses/${id}/service-check`);
    return response.data;
  },

  /**
   * Validate address format (server-side)
   */
  validateAddressOnServer: async (data: AddressInput): Promise<{
    is_valid: boolean;
    issues: string[] | null;
    timestamp: string;
  }> => {
    const response = await apiClient.post('/addresses/validate', data);
    return response.data;
  },

  /**
   * Geocode address string to coordinates
   */
  geocodeAddress: async (address: string): Promise<{
    address: string;
    coordinates: { lat: number; lng: number };
    timestamp: string;
  }> => {
    const response = await apiClient.post('/addresses/geocode', { address });
    return response.data;
  },

  /**
   * Client-side validation before submission
   */
  validateAddress: (address: AddressInput): { valid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!address.address_line1 || address.address_line1.trim().length < 5) {
      errors.push('Address line 1 must be at least 5 characters long');
    }

    if (!address.city || address.city.trim().length < 2) {
      errors.push('City must be at least 2 characters');
    }

    if (!address.state || address.state.trim().length < 2) {
      errors.push('State must be at least 2 characters');
    }

    if (!address.postal_code || !/^\d{6}$/.test(address.postal_code)) {
      errors.push('Postal code must be a valid 6-digit Indian PIN code');
    }

    if (!address.address_type || !['home', 'work', 'other'].includes(address.address_type)) {
      errors.push('Address type must be home, work, or other');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Format address for display
   */
  formatAddress: (address: Address): string => {
    const parts = [
      address.address_line1,
      address.address_line2,
      address.landmark,
      address.city,
      address.state,
      address.postal_code,
      address.country,
    ].filter(Boolean);

    return parts.join(', ');
  },

  /**
   * Get address type label with icon
   */
  getAddressTypeLabel: (type: 'home' | 'work' | 'other'): string => {
    const labels = {
      home: '🏠 Home',
      work: '💼 Work',
      other: '📍 Other',
    };
    return labels[type];
  },

  /**
   * Sort addresses with default first
   */
  sortAddresses: (addresses: Address[]): Address[] => {
    return [...addresses].sort((a, b) => {
      // Default addresses first
      if (a.is_default && !b.is_default) return -1;
      if (!a.is_default && b.is_default) return 1;
      
      // Then sort by creation date (newest first)
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  },
};
