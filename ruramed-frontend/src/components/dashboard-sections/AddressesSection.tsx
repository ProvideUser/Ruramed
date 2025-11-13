'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, MapPin, Edit2, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { Address, AddressInput } from '@/types';
import { addressService } from '@/services/address.service';
import toast from 'react-hot-toast';

export function AddressesSection() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<AddressInput>({
    address_type: 'home',
    address_line1: '',
    address_line2: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'India',
    landmark: '',
    contact_name: '',
    contact_phone: '',
    delivery_instructions: '',
    is_default: false,
  });

  // Load addresses on mount
  useEffect(() => {
    loadAddresses();
  }, []);

  // Fetch addresses from API
  const loadAddresses = async () => {
    try {
      setLoading(true);
      const data = await addressService.getAddresses();
      setAddresses(addressService.sortAddresses(data));
    } catch (error: any) {
      console.error('Failed to load addresses:', error);
      toast.error(error.response?.data?.error || 'Failed to load addresses');
    } finally {
      setLoading(false);
    }
  };

  // Reset form to initial state
  const resetForm = () => {
    setFormData({
      address_type: 'home',
      address_line1: '',
      address_line2: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'India',
      landmark: '',
      contact_name: '',
      contact_phone: '',
      delivery_instructions: '',
      is_default: false,
    });
    setEditingId(null);
    setShowForm(false);
  };

  // Handle form submission (create or update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation
    const validation = addressService.validateAddress(formData);
    if (!validation.valid) {
      toast.error(validation.errors[0]);
      return;
    }

    try {
      setSubmitting(true);

      if (editingId) {
        await addressService.updateAddress(editingId, formData);
        toast.success('Address updated successfully!');
      } else {
        await addressService.createAddress(formData);
        toast.success('Address added successfully!');
      }

      await loadAddresses();
      resetForm();
    } catch (error: any) {
      console.error('Failed to save address:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to save address';
      const details = error.response?.data?.details;
      
      if (details && Array.isArray(details)) {
        toast.error(details.join(', '));
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Handle edit button click
  const handleEdit = (address: Address) => {
    setFormData({
      address_type: address.address_type,
      address_line1: address.address_line1,
      address_line2: address.address_line2 || '',
      city: address.city,
      state: address.state,
      postal_code: address.postal_code,
      country: address.country,
      landmark: address.landmark || '',
      contact_name: address.contact_name || '',
      contact_phone: address.contact_phone || '',
      delivery_instructions: address.delivery_instructions || '',
      is_default: address.is_default,
    });
    setEditingId(address.id);
    setShowForm(true);
  };

  // Handle delete with confirmation
  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this address?')) {
      return;
    }

    try {
      await addressService.deleteAddress(id);
      toast.success('Address deleted successfully!');
      await loadAddresses();
    } catch (error: any) {
      console.error('Failed to delete address:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to delete address';
      toast.error(errorMessage);
    }
  };

  // Handle set as default
  const handleSetDefault = async (id: number) => {
    try {
      await addressService.setDefaultAddress(id);
      toast.success('Default address updated!');
      await loadAddresses();
    } catch (error: any) {
      console.error('Failed to set default address:', error);
      toast.error(error.response?.data?.error || 'Failed to update default address');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
        <span className="ml-3 text-slate-600 dark:text-slate-400">Loading addresses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            Delivery Addresses
          </h1>
          <p className="mt-2 text-slate-600 dark:text-slate-400">
            Manage your delivery addresses
          </p>
        </div>
        <button
          onClick={() => {
            if (showForm && !editingId) {
              resetForm();
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Address
        </button>
      </div>

      {/* Add/Edit Address Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="card space-y-4 max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {editingId ? 'Edit Address' : 'Add New Address'}
            </h2>
            {editingId && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                ID: {editingId}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Address Type */}
            <div>
              <label htmlFor="address_type" className="label">
                Address Type <span className="text-red-500">*</span>
              </label>
              <select
                id="address_type"
                value={formData.address_type}
                onChange={(e) =>
                  setFormData({ ...formData, address_type: e.target.value as any })
                }
                className="input-field"
                required
              >
                <option value="home">🏠 Home</option>
                <option value="work">💼 Work</option>
                <option value="other">📍 Other</option>
              </select>
            </div>

            {/* Contact Name */}
            <div>
              <label htmlFor="contact_name" className="label">
                Contact Name
              </label>
              <input
                type="text"
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="John Doe"
                className="input-field"
              />
            </div>

            {/* Address Line 1 */}
            <div className="md:col-span-2">
              <label htmlFor="address_line1" className="label">
                Address Line 1 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="address_line1"
                value={formData.address_line1}
                onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                placeholder="123 Main Street, Building Name"
                className="input-field"
                required
                minLength={5}
              />
            </div>

            {/* Address Line 2 */}
            <div className="md:col-span-2">
              <label htmlFor="address_line2" className="label">
                Address Line 2 (Apartment, Suite, etc.)
              </label>
              <input
                type="text"
                id="address_line2"
                value={formData.address_line2}
                onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                placeholder="Apartment 4B, Floor 2"
                className="input-field"
              />
            </div>

            {/* City */}
            <div>
              <label htmlFor="city" className="label">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Salem"
                className="input-field"
                required
                minLength={2}
              />
            </div>

            {/* State */}
            <div>
              <label htmlFor="state" className="label">
                State <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Tamil Nadu"
                className="input-field"
                required
                minLength={2}
              />
            </div>

            {/* Postal Code */}
            <div>
              <label htmlFor="postal_code" className="label">
                Postal Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="postal_code"
                value={formData.postal_code}
                onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                placeholder="636001"
                className="input-field"
                required
                pattern="\d{6}"
                maxLength={6}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                6-digit PIN code
              </p>
            </div>

            {/* Contact Phone */}
            <div>
              <label htmlFor="contact_phone" className="label">
                Contact Phone
              </label>
              <input
                type="tel"
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="9876543210"
                className="input-field"
                pattern="[0-9]{10}"
                maxLength={10}
              />
            </div>

            {/* Landmark */}
            <div className="md:col-span-2">
              <label htmlFor="landmark" className="label">
                Landmark (Optional)
              </label>
              <input
                type="text"
                id="landmark"
                value={formData.landmark}
                onChange={(e) => setFormData({ ...formData, landmark: e.target.value })}
                placeholder="Near City Mall, Opposite Park"
                className="input-field"
              />
            </div>

            {/* Delivery Instructions */}
            <div className="md:col-span-2">
              <label htmlFor="delivery_instructions" className="label">
                Delivery Instructions (Optional)
              </label>
              <textarea
                id="delivery_instructions"
                value={formData.delivery_instructions}
                onChange={(e) => setFormData({ ...formData, delivery_instructions: e.target.value })}
                placeholder="Ring the doorbell twice, leave at doorstep if not available..."
                className="input-field resize-none"
                rows={3}
              />
            </div>
          </div>

          {/* Set as Default */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_default"
              checked={formData.is_default}
              onChange={(e) =>
                setFormData({ ...formData, is_default: e.target.checked })
              }
              className="w-4 h-4 rounded"
            />
            <label htmlFor="is_default" className="text-sm text-slate-700 dark:text-slate-300">
              Set as default address
            </label>
          </div>

          {/* Form Actions */}
          <div className="flex gap-2 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button 
              type="submit" 
              className="btn-primary flex items-center gap-2"
              disabled={submitting}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingId ? 'Update Address' : 'Save Address'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="btn-secondary"
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ✅ Responsive Grid: 1 col mobile, 2 cols tablet, 3 cols desktop */}
      {addresses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {addresses.map((address) => (
            <div
              key={address.id}
              className="card group hover:shadow-xl transition-all duration-200 flex flex-col h-full relative"
            >
              {/* Default Badge - Absolute Position */}
              {!!address.is_default && (
                <div className="absolute top-3 right-3 z-10">
                  <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-xs rounded-full flex items-center gap-1 font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Default
                  </span>
                </div>
              )}

              {/* Card Content */}
              <div className="flex-1 space-y-3">
                {/* Header */}
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                    <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-white capitalize text-base">
                      {address.address_type === 'home' ? '🏠 Home' : address.address_type === 'work' ? '💼 Work' : '📍 Other'}
                    </p>
                    {address.contact_name && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {address.contact_name}
                      </p>
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-slate-200 dark:border-slate-700"></div>

                {/* Address Details */}
                <div className="space-y-2 text-sm">
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed line-clamp-2">
                    {address.address_line1}
                    {address.address_line2 && `, ${address.address_line2}`}
                  </p>
                  
                  {address.landmark && (
                    <p className="text-slate-600 dark:text-slate-400 text-xs line-clamp-1">
                      📍 {address.landmark}
                    </p>
                  )}
                  
                  <p className="text-slate-700 dark:text-slate-300 font-medium">
                    {address.city}, {address.state}
                  </p>
                  
                  <p className="text-slate-600 dark:text-slate-400">
                    PIN: {address.postal_code}
                  </p>
                  
                  {address.contact_phone && (
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      📞 {address.contact_phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons - Bottom of Card */}
              <div className="flex gap-2 pt-4 mt-4 border-t border-slate-200 dark:border-slate-700">
                {!address.is_default && (
                  <button
                    onClick={() => handleSetDefault(address.id)}
                    className="flex-1 p-2 text-xs font-medium text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                    title="Set as default"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Set Default
                  </button>
                )}
                <button
                  onClick={() => handleEdit(address)}
                  className="flex-1 p-2 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                  title="Edit address"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(address.id)}
                  className="flex-1 p-2 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center justify-center gap-1"
                  title="Delete address"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 card max-w-md mx-auto">
          <MapPin className="w-16 h-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-slate-600 dark:text-slate-400 mb-4 text-lg">
            No addresses yet
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Your First Address
          </button>
        </div>
      )}

      {/* Info Banner */}
      {addresses.length > 0 && !addresses.some(a => a.is_default) && (
        <div className="card bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 max-w-2xl mx-auto">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                No default address set
              </p>
              <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                Set a default address for faster checkout. Click "Set Default" on any address card.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
