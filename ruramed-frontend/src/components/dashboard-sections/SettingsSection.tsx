'use client';

import { useState } from 'react';
import {
  Settings,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Save,
  Loader2,
  LogOut,
  Trash2,
  Moon,
  Sun,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export function SettingsSection() {
  const router = useRouter();
  const { theme, toggleTheme } = useUIStore();
  const { logout } = useAuthStore();
  
  const [activeTab, setActiveTab] = useState<'preferences' | 'security' | 'notifications' | 'privacy'>('preferences');
  const [isSaving, setIsSaving] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [preferences, setPreferences] = useState({
    language: 'en',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: false,
    orderUpdates: true,
    appointmentReminders: true,
    medicineOffers: true,
    healthTips: false,
  });

  const [passwords, setPasswords] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [privacy, setPrivacy] = useState({
    profileVisibility: 'private',
    dataSharing: false,
    marketingEmails: false,
  });

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Preferences saved successfully!');
    } catch (error) {
      toast.error('Failed to save preferences');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Notification settings saved!');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwords.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    try {
      setIsSaving(true);
      // Mock API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Password changed successfully!');
      setShowChangePassword(false);
      setPasswords({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      toast.error('Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to logout?')) {
      logout();
      router.push('/login');
      toast.success('Logged out successfully');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      if (window.confirm('Type your email to confirm deletion')) {
        toast.success('Account deletion request submitted');
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Preferences
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'notifications'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Notifications
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'security'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Security
        </button>
        <button
          onClick={() => setActiveTab('privacy')}
          className={`px-4 py-3 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'privacy'
              ? 'border-primary-600 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          Privacy
        </button>
      </div>

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <form onSubmit={handleSavePreferences} className="card space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            General Preferences
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="language" className="label">
                Language
              </label>
              <select
                id="language"
                value={preferences.language}
                onChange={(e) =>
                  setPreferences({ ...preferences, language: e.target.value })
                }
                className="input-field"
              >
                <option value="en">English</option>
                <option value="ta">Tamil</option>
                <option value="hi">Hindi</option>
              </select>
            </div>

            <div>
              <label htmlFor="currency" className="label">
                Currency
              </label>
              <select
                id="currency"
                value={preferences.currency}
                onChange={(e) =>
                  setPreferences({ ...preferences, currency: e.target.value })
                }
                className="input-field"
              >
                <option value="INR">Indian Rupee (₹)</option>
                <option value="USD">US Dollar ($)</option>
                <option value="EUR">Euro (€)</option>
              </select>
            </div>

            <div>
              <label htmlFor="timezone" className="label">
                Timezone
              </label>
              <select
                id="timezone"
                value={preferences.timezone}
                onChange={(e) =>
                  setPreferences({ ...preferences, timezone: e.target.value })
                }
                className="input-field"
              >
                <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New_York (EST)</option>
              </select>
            </div>
          </div>

          {/* Theme Toggle */}
          <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              {theme === 'dark' ? (
                <Moon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              ) : (
                <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              )}
              <div>
                <p className="font-medium text-slate-900 dark:text-white">Dark Mode</p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Currently {theme === 'dark' ? 'enabled' : 'disabled'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
            >
              Toggle
            </button>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <form onSubmit={handleSaveNotifications} className="card space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Notification Settings
          </h2>

          <div className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div
                key={key}
                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    {key === 'emailNotifications' && 'Receive updates via email'}
                    {key === 'smsNotifications' && 'Receive updates via SMS'}
                    {key === 'orderUpdates' && 'Get notified about order status'}
                    {key === 'appointmentReminders' && 'Reminders for appointments'}
                    {key === 'medicineOffers' && 'Latest medicine offers and deals'}
                    {key === 'healthTips' && 'Daily health and wellness tips'}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setNotifications({
                      ...notifications,
                      [key]: e.target.checked,
                    })
                  }
                  className="w-5 h-5 rounded"
                />
              </div>
            ))}
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          {/* Change Password */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Password
                </h2>
              </div>
              <button
                onClick={() => setShowChangePassword(!showChangePassword)}
                className="btn-secondary text-sm"
              >
                {showChangePassword ? 'Cancel' : 'Change Password'}
              </button>
            </div>

            {showChangePassword && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label htmlFor="currentPassword" className="label">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="currentPassword"
                      value={passwords.currentPassword}
                      onChange={(e) =>
                        setPasswords({
                          ...passwords,
                          currentPassword: e.target.value,
                        })
                      }
                      className="input-field"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Eye className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="newPassword" className="label">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwords.newPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        newPassword: e.target.value,
                      })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="label">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwords.confirmPassword}
                    onChange={(e) =>
                      setPasswords({
                        ...passwords,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="input-field"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Two Factor Authentication */}
          <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
              Two-Factor Authentication
            </h3>
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-3">
              Add an extra layer of security to your account
            </p>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
              Enable 2FA
            </button>
          </div>

          {/* Active Sessions */}
          <div className="card">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-4">
              Active Sessions
            </h3>
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <p className="font-medium text-slate-900 dark:text-white">
                  Chrome on Windows
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  Last active: Just now
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Tab */}
      {activeTab === 'privacy' && (
        <form className="card space-y-6">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Privacy Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Profile Visibility
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Who can see your profile
                </p>
              </div>
              <select
                value={privacy.profileVisibility}
                onChange={(e) =>
                  setPrivacy({ ...privacy, profileVisibility: e.target.value })
                }
                className="input-field w-32"
              >
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="friends">Friends Only</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Data Sharing
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Allow RuraMed to analyze health data
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacy.dataSharing}
                onChange={(e) =>
                  setPrivacy({ ...privacy, dataSharing: e.target.checked })
                }
                className="w-5 h-5 rounded"
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
              <div>
                <p className="font-medium text-slate-900 dark:text-white">
                  Marketing Emails
                </p>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Receive promotional emails
                </p>
              </div>
              <input
                type="checkbox"
                checked={privacy.marketingEmails}
                onChange={(e) =>
                  setPrivacy({
                    ...privacy,
                    marketingEmails: e.target.checked,
                  })
                }
                className="w-5 h-5 rounded"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <button type="submit" className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              Save Privacy Settings
            </button>
          </div>
        </form>
      )}

      {/* Logout and Danger Zone */}
      <div className="space-y-4">
        <button
          onClick={handleLogout}
          className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-900 dark:text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>

        <div className="card border-2 border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10">
          <h3 className="font-semibold text-red-900 dark:text-red-200 mb-3">
            Danger Zone
          </h3>
          <button
            onClick={handleDeleteAccount}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete Account
          </button>
          <p className="text-xs text-red-800 dark:text-red-300 mt-2">
            This action is permanent and cannot be undone.
          </p>
        </div>
      </div>
    </div>
  );
}
