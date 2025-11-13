'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { locationService } from '@/services/location.service';
import { LocationData } from '@/types';

interface LocationContextType {
  location: LocationData | null;
  loading: boolean;
  error: string | null;
  source: 'gps' | 'ip' | null;
  refreshLocation: () => Promise<void>;
}

const LocationContext = createContext<LocationContextType>({
  location: null,
  loading: true,
  error: null,
  source: null,
  refreshLocation: async () => {},
});

export const useSharedLocation = () => useContext(LocationContext);

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<'gps' | 'ip' | null>(null);

  const detectLocation = async () => {
    setLoading(true);
    setError(null);
    setSource(null);

    try {
      console.log('🌍 [LocationProvider] Starting detection...');
      const result = await locationService.getUserLocation();

      if (result.success && result.location) {
        setLocation(result.location);
        
        if (result.source === 'gps' || result.source === 'ip') {
          setSource(result.source);
        }
        
        console.log(
          `✅ [LocationProvider] Success: ${locationService.formatLocation(result.location)} [${result.source.toUpperCase()}]`
        );
      } else {
        setError(result.error || 'Unable to detect location');
        console.error('❌ [LocationProvider] Failed:', result.error);
      }
    } catch (err: any) {
      console.error('❌ [LocationProvider] Exception:', err);
      setError(err.message || 'Location detection failed');
    } finally {
      setLoading(false);
    }
  };

  const refreshLocation = async () => {
    console.log('🔄 [LocationProvider] Manual refresh triggered');
    await detectLocation();
  };

  // Detect location ONCE on mount
  useEffect(() => {
    detectLocation();
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        loading,
        error,
        source,
        refreshLocation,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}
