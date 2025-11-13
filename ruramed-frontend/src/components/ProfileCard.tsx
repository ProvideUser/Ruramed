'use client';

import { useEffect, useState, useRef } from 'react';
import { useProfileStore } from '@/store/profile.store';
import { userService } from '@/services/user.service';
import { User, Trash2, Edit2, Loader2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

export function ProfileCard() {
  const {
    profile: userProfile,
    isLoading: isProfileLoading,
    error: profileError,
    fetchProfile,
    deleteProfileField,
  } = useProfileStore();

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    gender: '',
    dateOfBirth: '',
    bloodGroup: '',
    alternateContact: '',
  });
  const [isDeleting, setIsDeleting] = useState(false);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [deletingPicture, setDeletingPicture] = useState(false);

  const hasFetchedRef = useRef(false);

  const jwtToken = localStorage.getItem('jwtToken') || '';
  const sessionId = localStorage.getItem('sessionId') || '';

  // Prevent multiple fetches for profile
  useEffect(() => {
    if (!userProfile && !hasFetchedRef.current && !isProfileLoading) {
      hasFetchedRef.current = true;
      fetchProfile().catch(console.error);
    }
  }, []);

  // Update form data and fetch profile picture when profile loads
  useEffect(() => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || '',
        gender: userProfile.gender || '',
        dateOfBirth: userProfile.dateOfBirth || '',
        bloodGroup: userProfile.bloodGroup || '',
        alternateContact: userProfile.alternateContact || '',
      });

      if (userProfile.profilePicture) {
        fetchProfilePicture(userProfile.profilePicture);
      } else {
        setProfilePictureUrl(null);
      }
    }
  }, [userProfile]);

  // Fetch profile picture blob and create object URL
  const fetchProfilePicture = async (filename: string) => {
    try {
      const blob = await userService.fetchProfilePictureBlob(
        filename,
        jwtToken,
        sessionId
      );
      const objectUrl = URL.createObjectURL(blob);
      setProfilePictureUrl(objectUrl);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load profile picture');
      setProfilePictureUrl(null);
    }
  };

  // Cleanup object URL on unmount or when profilePictureUrl changes
  useEffect(() => {
    return () => {
      if (profilePictureUrl) {
        URL.revokeObjectURL(profilePictureUrl);
      }
    };
  }, [profilePictureUrl]);

  const handleEditMode = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (userProfile) {
      setFormData({
        fullName: userProfile.fullName || '',
        gender: userProfile.gender || '',
        dateOfBirth: userProfile.dateOfBirth || '',
        bloodGroup: userProfile.bloodGroup || '',
        alternateContact: userProfile.alternateContact || '',
      });
    }
    setIsEditing(false);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveAll = async () => {
    try {
      const updates: any = {};

      if (formData.fullName !== (userProfile?.fullName || '')) {
        updates.fullName = formData.fullName || null;
      }
      if (formData.gender !== (userProfile?.gender || '')) {
        updates.gender = formData.gender || null;
      }
      if (formData.dateOfBirth !== (userProfile?.dateOfBirth || '')) {
        updates.dateOfBirth = formData.dateOfBirth || null;
      }
      if (formData.bloodGroup !== (userProfile?.bloodGroup || '')) {
        updates.bloodGroup = formData.bloodGroup || null;
      }
      if (formData.alternateContact !== (userProfile?.alternateContact || '')) {
        updates.alternateContact = formData.alternateContact || null;
      }

      if (Object.keys(updates).length === 0) {
        toast.error('No changes detected');
        return;
      }

      await useProfileStore.getState().updateProfile(updates);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleDeleteField = async (fieldName: string) => {
    if (!confirm(`Are you sure you want to delete ${fieldName}?`)) return;

    try {
      setIsDeleting(true);
      await deleteProfileField(fieldName);
      await fetchProfile();
      toast.success(`${fieldName} deleted successfully`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete field');
    } finally {
      setIsDeleting(false);
    }
  };

  // Upload profile picture handler
  const handleProfilePictureChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    console.log('handleProfilePictureChange triggered');
    if (!e.target.files || e.target.files.length === 0) return;
    console.log('Selected file:', e.target.files[0]); 
    const file = e.target.files[0];

    setUploading(true);

    try {
      const relativeUrl = await userService.uploadProfilePicture(
        file,
        jwtToken,
        sessionId
      );

      // After successful upload, fetch and display new picture
      await fetchProfilePicture(relativeUrl);

      // Optional: update profile in store with new picture URL if needed
      await useProfileStore.getState().fetchProfile();

      toast.success('Profile picture uploaded successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
      // Reset input value so same file can be selected again if needed
      e.target.value = '';
    }
  };

  // Delete profile picture handler
  const handleDeleteProfilePicture = async () => {
    if (!confirm('Are you sure you want to delete your profile picture?')) return;

    setDeletingPicture(true);

    try {
      await userService.deleteProfilePicture(jwtToken, sessionId);
      setProfilePictureUrl(null);
      await useProfileStore.getState().fetchProfile();
      toast.success('Profile picture deleted successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete profile picture');
    } finally {
      setDeletingPicture(false);
    }
  };

  if (isProfileLoading && !userProfile) {
    return (
      <div className="card">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
          <span className="ml-2 text-slate-600 dark:text-slate-400">
            Loading profile...
          </span>
        </div>
      </div>
    );
  }

  if (profileError && !userProfile) {
    return (
      <div className="card bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
        <p className="text-red-600 dark:text-red-400">
          Error loading profile: {profileError}
        </p>
      </div>
    );
  }

  if (!userProfile) {
    return null;
  }

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string | null): string => {
    if (!dateOfBirth) return '—';

    try {
      const [year, month, day] = dateOfBirth.split('-').map(Number);
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();

      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      return age >= 0 ? `${age} years` : '—';
    } catch {
      return '—';
    }
  };

  // Format date for display
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    try {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  };

  const profileFields = [
    {
      key: 'fullName',
      label: 'Full Name',
      value: userProfile.fullName,
      type: 'text',
      placeholder: 'Enter your full name',
      maxLength: 100,
      editable: true,
    },
    {
      key: 'gender',
      label: 'Gender',
      value: userProfile.gender,
      type: 'select',
      options: ['Male', 'Female', 'Other', 'Prefer not to say'],
      editable: true,
    },
    {
      key: 'dateOfBirth',
      label: 'Date of Birth',
      value: userProfile.dateOfBirth,
      type: 'date',
      max: new Date().toISOString().split('T')[0],
      editable: true,
    },
    {
      key: 'age',
      label: 'Age',
      value: calculateAge(userProfile.dateOfBirth),
      type: 'text',
      editable: false,
      computed: true,
    },
    {
      key: 'bloodGroup',
      label: 'Blood Group',
      value: userProfile.bloodGroup,
      type: 'select',
      options: [
        'A+',
        'A-',
        'B+',
        'B-',
        'AB+',
        'AB-',
        'O+',
        'O-',
        'Unknown',
        'Prefer not to say',
      ],
      editable: true,
    },
    {
      key: 'alternateContact',
      label: 'Alternate Contact',
      value: userProfile.alternateContact,
      type: 'tel',
      placeholder: '+91 XXXXXXXXXX',
      pattern: '[0-9+\\-\\s()]*',
      maxLength: 15,
      editable: true,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 rounded-full overflow-hidden border border-gray-300 dark:border-slate-600">
              {profilePictureUrl ? (
                <img
                  src={profilePictureUrl}
                  alt="Profile Picture"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary-600 to-secondary-600 flex items-center justify-center text-white">
                  <User className="w-8 h-8" />
                </div>
              )}

              {/* Delete profile picture button */}
              {profilePictureUrl && !deletingPicture && (
                <button
                  onClick={handleDeleteProfilePicture}
                  type="button"
                  title="Delete Profile Picture"
                  className="absolute top-0 right-0 p-1 bg-red-600 hover:bg-red-700 text-white rounded-bl"
                  disabled={isProfileLoading}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {deletingPicture && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <Loader2 className="w-6 h-6 animate-spin text-white" />
                </div>
              )}
            </div>

            {/* Upload profile picture input */}
            <div>
              <label
                htmlFor="profilePictureInput"
                className="cursor-pointer inline-block px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin inline" />
                ) : (
                  'Upload Picture'
                )}
              </label>
              <input
                id="profilePictureInput"
                type="file"
                accept="image/*"
                onChange={handleProfilePictureChange}
                disabled={uploading || isProfileLoading}
                className="hidden"
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                My Profile
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                ID: {userProfile.customerUniqueId}
              </p>
            </div>
          </div>

          {/* Edit/Save/Cancel Buttons */}
          {!isEditing ? (
            <button
              onClick={handleEditMode}
              disabled={isProfileLoading}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg disabled:opacity-50 transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSaveAll}
                disabled={isProfileLoading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                <Save className="w-4 h-4" />
                Save All
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={isProfileLoading}
                className="flex items-center gap-2 px-4 py-2 bg-slate-300 hover:bg-slate-400 dark:bg-slate-600 dark:hover:bg-slate-700 text-slate-900 dark:text-white rounded-lg disabled:opacity-50 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          )}
        </div>

        {/* Verification Status */}
        <div className="flex gap-4">
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              userProfile.emailVerified
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
            }`}
          >
            {userProfile.emailVerified ? '✓ Email Verified' : '⚠ Email Not Verified'}
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              userProfile.mobileVerified
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                : 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
            }`}
          >
            {userProfile.mobileVerified ? '✓ Mobile Verified' : '⚠ Mobile Not Verified'}
          </div>
        </div>
      </div>

      {/* Profile Fields */}
      <div className="card space-y-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Profile Information
        </h3>

        {userService.hasProfileDetails(userProfile) ? (
          <div className="space-y-4">
            {profileFields.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    {field.label}
                    {field.computed && (
                      <span className="ml-2 text-xs text-slate-500 dark:text-slate-500">
                        (Auto-calculated)
                      </span>
                    )}
                  </p>

                  {isEditing && field.editable ? (
                    <div className="flex gap-2">
                      {field.type === 'select' ? (
                        <select
                          value={formData[field.key as keyof typeof formData]}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        >
                          <option value="">Select {field.label}</option>
                          {field.options?.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : field.type === 'tel' ? (
                        <input
                          type="tel"
                          value={formData[field.key as keyof typeof formData]}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^0-9+\-\s()]/g, '');
                            handleInputChange(field.key, value);
                          }}
                          placeholder={field.placeholder}
                          maxLength={field.maxLength}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      ) : (
                        <input
                          type={field.type}
                          value={formData[field.key as keyof typeof formData]}
                          onChange={(e) => handleInputChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          maxLength={field.maxLength}
                          max={field.max}
                          className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                        />
                      )}
                    </div>
                  ) : (
                    <p className="text-base font-medium text-slate-900 dark:text-white">
                      {field.key === 'dateOfBirth' ? formatDate(field.value) : field.value || '—'}
                    </p>
                  )}
                </div>

                {/* Delete button (only show when not editing and field is editable and not computed) */}
                {!isEditing && field.editable && !field.computed && (
                  <button
                    onClick={() => handleDeleteField(field.key)}
                    disabled={!field.value || isDeleting || isProfileLoading}
                    className="p-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50 transition-colors ml-4"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <User className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-600 dark:text-slate-400">No profile details added yet</p>
            <button
              onClick={handleEditMode}
              className="mt-4 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Add Profile Information
            </button>
          </div>
        )}
      </div>

      {/* Created/Updated Info */}
      <div className="card bg-slate-50 dark:bg-slate-700/50">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Created: {new Date(userProfile.createdAt).toLocaleDateString()} • Updated:{' '}
          {new Date(userProfile.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}
