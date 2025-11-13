'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, User, LogOut, LayoutDashboard, ShoppingCart, ChevronDown, Crosshair } from 'lucide-react';
import { useAuthStore } from '@/store/auth.store';
import { useCartStore } from '@/store/cart.store';
import { useUIStore } from '@/store/ui.store';
import { addressService } from '@/services/address.service';
import { useSharedLocation } from './LocationProvider';
import ThemeToggle from './ThemeToggle';
import { Address } from '@/types';
import { formatLocation } from '@/lib/utils';

export default function Header() {
  const router = useRouter();
  const { user, isAuthenticated, logout, _hasHydrated } = useAuthStore();
  const { getTotalItems } = useCartStore();
  const cartItemCount = getTotalItems();
  const { currentLocation, setCurrentLocation } = useUIStore();
  
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  const locationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  
  // Timeout refs for delayed closing
  const locationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const profileTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Auto-detect location for all users
  const { location: detectedLocation, loading: locationLoading, source, refreshLocation } = useSharedLocation();

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update UI store when location is detected
  useEffect(() => {
    if (detectedLocation) {
      setCurrentLocation(detectedLocation);
    }
  }, [detectedLocation, setCurrentLocation]);

  // CRITICAL FIX: Load addresses function with authentication check
  const loadAddresses = useCallback(async () => {
    // Only load addresses if authenticated and hydration is complete
    if (!isAuthenticated || !_hasHydrated) {
      console.log('Skipping address load: not authenticated or not hydrated');
      return;
    }

    setAddressLoading(true);
    try {
      const response = await addressService.getAddresses();
      
      // Handle different response formats with proper typing
      const data: Address[] = Array.isArray(response) 
        ? response 
        : (response as any)?.data || [];
      
      setAddresses(data);
      
      // Only try to find default if we have addresses
      if (data.length > 0) {
        const defaultAddr = data.find((addr: Address) => addr.is_default);
        if (defaultAddr) {
          setSelectedAddress(defaultAddr);
        }
      }
    } catch (error) {
      console.error('Failed to load addresses:', error);
      setAddresses([]); // Set empty array on error
    } finally {
      setAddressLoading(false);
    }
  }, [isAuthenticated, _hasHydrated]);

  // CRITICAL FIX: Only load addresses when dropdown is shown AND user is authenticated
  useEffect(() => {
    if (showLocationDropdown && isAuthenticated && _hasHydrated && addresses.length === 0) {
      loadAddresses();
    }
  }, [showLocationDropdown, isAuthenticated, _hasHydrated, addresses.length, loadAddresses]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (locationTimeoutRef.current) {
        clearTimeout(locationTimeoutRef.current);
      }
      if (profileTimeoutRef.current) {
        clearTimeout(profileTimeoutRef.current);
      }
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowProfileDropdown(false);
      setAddresses([]); // Clear addresses on logout
      setSelectedAddress(null);
      router.push('/');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleAddressSelect = (address: Address) => {
    setSelectedAddress(address);
    setShowLocationDropdown(false);
    
    // Update current location with address data
    setCurrentLocation({
      city: address.city,
      state: address.state,
      country: address.country,
    });
  };

  const handleDetectLocation = async () => {
    // Keep dropdown open, refresh in background
    await refreshLocation();
  };

  // Display location: priority = selected address > detected location > default
  const displayLocation = selectedAddress 
    ? formatLocation({ city: selectedAddress.city, state: selectedAddress.state })
    : currentLocation
    ? formatLocation(currentLocation)
    : 'Detecting...';

  // Avoid hydration mismatch
  if (!mounted || !_hasHydrated) {
    return (
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-6">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-10 h-10 rounded-lg overflow-hidden shadow-md group-hover:shadow-lg transition-shadow">
                  <img 
                    src="/logo.png" 
                    alt="RuraMed Logo" 
                    className="w-full h-full object-cover"
                  />
                </div>
                <span className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">
                  RuraMed
                </span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Section: Logo + Location */}
          <div className="flex items-center gap-6">
            
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-12 h-12 flex items-center justify-center">
                <img 
                  src="/logo.svg" 
                  alt="RuraMed Logo" 
                  className="w-full h-full object-contain rounded-md shadow-md"
                />
              </div>

              <span className="text-xl font-bold text-slate-900 dark:text-white hidden sm:block">
                RuraMed
              </span>
            </Link>

            {/* Location Dropdown */}
            <div 
              className="relative" 
              ref={locationRef}
              onMouseEnter={() => {
                // Clear any pending close timeout
                if (locationTimeoutRef.current) {
                  clearTimeout(locationTimeoutRef.current);
                }
                setShowLocationDropdown(true);
              }}
              onMouseLeave={() => {
                // Add 300ms delay before closing
                locationTimeoutRef.current = setTimeout(() => {
                  setShowLocationDropdown(false);
                }, 300);
              }}
            >
              <button
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                disabled={locationLoading}
              >
                <MapPin className={`w-5 h-5 text-primary-600 dark:text-primary-400 ${locationLoading ? 'animate-pulse' : ''}`} />
                <div className="hidden md:block text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-slate-500 dark:text-slate-400">Deliver to</span>
                    {/* Location Source Badge */}
                    {!locationLoading && source && !selectedAddress && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                        source === 'gps' 
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      }`}>
                        {source === 'gps' ? 'GPS' : 'IP'}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                    {locationLoading ? 'Detecting...' : displayLocation}
                  </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showLocationDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Location Dropdown Menu */}
              {showLocationDropdown && (
                <div className="absolute left-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 animate-slide-down z-[110]">
                  
                  {/* Current Detected Location */}
                  {currentLocation && (
                    <div className="p-3 border-b border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-2 text-sm">
                        <Crosshair className="w-4 h-4 text-green-600" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-white">
                              Current Location
                            </span>
                            {source && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                source === 'gps' 
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                              }`}>
                                {source === 'gps' ? 'GPS' : 'IP'}
                              </span>
                            )}
                            {locationLoading && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 animate-pulse">
                                Updating...
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {formatLocation(currentLocation)}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={handleDetectLocation}
                        disabled={locationLoading}
                        className={`mt-2 text-xs text-primary-600 dark:text-primary-400 hover:underline ${
                          locationLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {locationLoading ? 'Refreshing...' : 'Refresh Location'}
                      </button>
                    </div>
                  )}

                  {/* Authenticated User: Show Saved Addresses */}
                  {isAuthenticated ? (
                    <div className="p-2">
                      {addressLoading ? (
                        <div className="p-4 text-center text-sm text-slate-500">Loading addresses...</div>
                      ) : addresses.length > 0 ? (
                        <>
                          <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase">
                            Saved Addresses
                          </div>
                          {addresses.map((address) => (
                            <button
                              key={address.id}
                              onClick={() => handleAddressSelect(address)}
                              className={`w-full text-left px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                                selectedAddress?.id === address.id ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                              }`}
                            >
                              <div className="text-sm font-medium text-slate-900 dark:text-white">
                                {addressService.getAddressTypeLabel(address.address_type)}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                {address.address_line1}, {address.city}
                              </div>
                            </button>
                          ))}
                          <Link
                            href="/dashboard/addresses"
                            className="block w-full text-center px-3 py-2 mt-2 text-sm text-primary-600 dark:text-primary-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
                            onClick={() => setShowLocationDropdown(false)}
                          >
                            Manage Addresses
                          </Link>
                        </>
                      ) : (
                        <div className="p-4 text-center">
                          <p className="text-sm text-slate-500 mb-3">No addresses saved</p>
                          <Link
                            href="/dashboard/addresses"
                            className="btn-primary text-sm"
                            onClick={() => setShowLocationDropdown(false)}
                          >
                            Add Address
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Non-authenticated: Show detected location info */
                    <div className="p-4 text-center">
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                        {currentLocation 
                          ? 'Login to save addresses and get faster checkout'
                          : 'Allow location access or login to see delivery options'
                        }
                      </p>
                      <Link
                        href="/login"
                        className="btn-primary text-sm"
                        onClick={() => setShowLocationDropdown(false)}
                      >
                        Login
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Cart, Theme, Profile */}
          <div className="flex items-center gap-3">
            
            {/* Cart Icon */}
            <Link
              href="/dashboard/cart"
              className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ShoppingCart className="w-6 h-6 text-slate-700 dark:text-slate-300" />
              {cartItemCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {cartItemCount > 9 ? '9+' : cartItemCount}
                </span>
              )}
            </Link>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Profile Section */}
            {isAuthenticated && user ? (
              <div 
                className="relative" 
                ref={profileRef}
                onMouseEnter={() => {
                  // Clear any pending close timeout
                  if (profileTimeoutRef.current) {
                    clearTimeout(profileTimeoutRef.current);
                  }
                  setShowProfileDropdown(true);
                }}
                onMouseLeave={() => {
                  // Add 300ms delay before closing
                  profileTimeoutRef.current = setTimeout(() => {
                    setShowProfileDropdown(false);
                  }, 300);
                }}
              >
                <button
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="hidden md:block text-sm font-medium text-slate-900 dark:text-white">
                    {user.name}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 animate-slide-down z-[110]">
                    <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                      <div className="font-medium text-slate-900 dark:text-white">{user.name}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{user.email}</div>
                    </div>
                    <div className="p-2">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        <LayoutDashboard className="w-5 h-5 text-slate-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Dashboard</span>
                      </Link>
                      <Link
                        href="/dashboard/profile"
                        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => setShowProfileDropdown(false)}
                      >
                        <User className="w-5 h-5 text-slate-500" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">Profile</span>
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600 dark:text-red-400"
                      >
                        <LogOut className="w-5 h-5" />
                        <span className="text-sm font-medium">Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="btn-primary">
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
