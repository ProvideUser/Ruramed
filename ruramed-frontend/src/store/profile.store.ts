import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile, UpdateUserProfileInput } from '@/types';
import { userService } from '@/services/user.service';

interface ProfileState {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  
  fetchProfile: () => Promise<void>;
  updateProfile: (data: UpdateUserProfileInput) => Promise<void>;
  deleteProfileField: (fieldName: string) => Promise<void>;
  deleteAllProfileFields: () => Promise<void>;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set) => ({
      profile: null,
      isLoading: false,
      error: null,

      setProfile: (profile) => {
        set({ profile });
      },

      setLoading: (loading) => {
        set({ isLoading: loading });
      },

      setError: (error) => {
        set({ error });
      },

      clearError: () => {
        set({ error: null });
      },

      fetchProfile: async () => {
        set({ isLoading: true, error: null });
        try {
          const profileData = await userService.getProfileDetails();
          console.log('📥 Received profile data:', profileData);
          
          set({
            profile: profileData,
            isLoading: false,
            error: null,
          });
          console.log('✅ User profile fetched successfully');
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to fetch profile details';
          console.error('❌ Failed to fetch profile:', errorMessage);
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      updateProfile: async (data: UpdateUserProfileInput) => {
        set({ isLoading: true, error: null });
        try {
          const updatedProfile = await userService.updateProfileDetails(data);
          
          // Ensure the updated profile is set immediately
          set({
            profile: updatedProfile,
            isLoading: false,
            error: null,
          });
          
          console.log('✅ User profile updated successfully:', updatedProfile);
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to update profile';
          console.error('❌ Failed to update profile:', errorMessage);
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      deleteProfileField: async (fieldName: string) => {
        set({ isLoading: true, error: null });
        try {
          const updatedProfile = await userService.deleteProfileField(fieldName);
          set({
            profile: updatedProfile,
            isLoading: false,
            error: null,
          });
          console.log(`✅ Profile field '${fieldName}' deleted successfully`);
        } catch (error: any) {
          const errorMessage = error.message || `Failed to delete ${fieldName}`;
          console.error('❌ Failed to delete field:', errorMessage);
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },

      deleteAllProfileFields: async () => {
        set({ isLoading: true, error: null });
        try {
          const updatedProfile = await userService.deleteAllProfileFields();
          set({
            profile: updatedProfile,
            isLoading: false,
            error: null,
          });
          console.log('✅ All profile fields deleted successfully');
        } catch (error: any) {
          const errorMessage = error.message || 'Failed to delete all profile fields';
          console.error('❌ Failed to delete all fields:', errorMessage);
          set({
            isLoading: false,
            error: errorMessage,
          });
          throw error;
        }
      },
    }),
    {
      name: 'profile-storage',
      partialize: (state) => ({
        profile: state.profile,
      }),
    }
  )
);
