import apiClient from '@/lib/api-client';
import { 
  UserProfile, 
  UpdateUserProfileInput, 
  UserProfileResponse, 
  ApiResponse,
  PaginatedResponse,
  Order 
} from '@/types';

export const userService = {
  // ============================================================================
  // USER ORDERS
  // ============================================================================

  getUserOrders: async (
    page: number = 1, 
    limit: number = 10, 
    filters?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<PaginatedResponse<Order>> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters?.startDate) {
        params.append('start_date', filters.startDate);
      }
      if (filters?.endDate) {
        params.append('end_date', filters.endDate);
      }

      const response = await apiClient.get<PaginatedResponse<Order>>(
        `/users/orders?${params.toString()}`
      );
      
      return response.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch orders';
      throw {
        ...error,
        message: errorMessage
      };
    }
  },

  getUserOrderById: async (orderId: number): Promise<Order> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: Order }>(
        `/users/orders/${orderId}`
      );
      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch order';
      throw {
        ...error,
        message: errorMessage
      };
    }
  },

  // ============================================================================
  // USER PROFILE DETAILS
  // ============================================================================

  getProfileDetails: async (): Promise<UserProfile> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: any;
      }>('/users/profile/details');
      
      const profileData = response.data.data;
      
      if (profileData.dateOfBirth) {
        profileData.dateOfBirth = profileData.dateOfBirth.split('T')[0];
      }
      
      return profileData;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to fetch profile details';
      throw {
        ...error,
        message: errorMessage
      };
    }
  },

  updateProfileDetails: async (data: UpdateUserProfileInput): Promise<UserProfile> => {
    try {
      const payload: any = {};
      
      if (data.fullName !== undefined) payload.full_name = data.fullName;
      if (data.profilePicture !== undefined) payload.profile_picture = data.profilePicture;
      if (data.gender !== undefined) payload.gender = data.gender;
      if (data.dateOfBirth !== undefined) payload.date_of_birth = data.dateOfBirth;
      if (data.bloodGroup !== undefined) payload.blood_group = data.bloodGroup;
      if (data.alternateContact !== undefined) payload.alternate_contact = data.alternateContact;

      Object.keys(payload).forEach(key => 
        payload[key] === undefined && delete payload[key]
      );

      const response = await apiClient.put<{
        success: boolean;
        data: any;
      }>(
        '/users/profile/details',
        payload
      );
      
      const updatedProfile = response.data.data;
      
      if (updatedProfile.dateOfBirth) {
        updatedProfile.dateOfBirth = updatedProfile.dateOfBirth.split('T')[0];
      }
      
      return updatedProfile;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to update profile details';
      throw {
        ...error,
        message: errorMessage
      };
    }
  },

  deleteProfileField: async (fieldName: string): Promise<UserProfile> => {
    try {
      const response = await apiClient.delete<UserProfileResponse>(
        `/users/profile/details/${fieldName}`
      );
      return response.data.profile;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || `Failed to delete ${fieldName}`;
      throw {
        ...error,
        message: errorMessage
      };
    }
  },

  deleteAllProfileFields: async (): Promise<UserProfile> => {
    try {
      const response = await apiClient.delete<UserProfileResponse>(
        '/users/profile/details'
      );
      return response.data.profile;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to delete all profile fields';
      throw {
        ...error,
        message: errorMessage
      };
    }
  },

  hasProfileDetails: (profile: UserProfile | null): boolean => {
    if (!profile) return false;
    
    console.log('🔍 Checking profile details:', profile);
    
    const hasDetails = !!(
      (profile.fullName && profile.fullName.trim() !== '') ||
      profile.gender ||
      profile.dateOfBirth ||
      profile.bloodGroup ||
      profile.alternateContact
    );
    
    console.log('✅ Has profile details:', hasDetails);
    return hasDetails;
  },

  // ============================================================================
  // USER STATISTICS
  // ============================================================================

  getUserStats: async (): Promise<{
    totalOrders: number;
    pendingOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalSpent: number;
  }> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          totalOrders: number;
          pendingOrders: number;
          completedOrders: number;
          cancelledOrders: number;
          totalSpent: number;
        };
      }>('/users/stats');
      
      return response.data.data;
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to fetch user stats';
      throw {
        ...error,
        message: errorMessage
      };
    }
  },

  // ============================================================================
  // PROFILE PICTURE HANDLING
  // ============================================================================

  uploadProfilePicture: async (file: File, jwtToken: string, sessionId: string): Promise<string> => {
    const formData = new FormData();
    formData.append('profilePicture', file);

    try {
      const response = await fetch('/api/users/profile/picture', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'x-session-id': sessionId
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      return data.data.profilePicture;  // relative URL
    } catch (error: any) {
      throw new Error(error.message || 'Upload failed');
    }
  },

  fetchProfilePictureBlob: async (filename: string, jwtToken: string, sessionId: string): Promise<Blob> => {
    try {
      const response = await fetch(`/api/users/profile/picture/${filename}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'x-session-id': sessionId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch profile picture');
      }

      return await response.blob();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to fetch profile picture');
    }
  },

  deleteProfilePicture: async (jwtToken: string, sessionId: string): Promise<void> => {
    try {
      const response = await fetch('/api/users/profile/picture', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'x-session-id': sessionId,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Delete failed');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Delete failed');
    }
  },
};
