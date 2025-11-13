/**
 * Location Service - Fresh Detection (No Persistent Cache)
 * GPS: Photon API for reverse geocoding
 * IP: ipapi.co (primary) + ipwho.is (fallback)
 */

import { LocationData } from '@/types';

export interface GeolocationResult {
  success: boolean;
  location?: LocationData;
  error?: string;
  source: 'gps' | 'ip' | 'manual';
}

class LocationService {
  private readonly PHOTON_API = 'https://photon.komoot.io';
  private readonly GPS_TIMEOUT = 8000; // 8 seconds
  private readonly API_TIMEOUT = 5000; // 5 seconds

  /**
   * Get user location - GPS first, IP fallback (NO CACHE)
   */
  async getUserLocation(): Promise<GeolocationResult> {
    console.log('🌍 [LocationService] Starting fresh location detection...');

    // Try GPS first
    const gpsResult = await this.getGPSLocation();
    if (gpsResult.success && gpsResult.location) {
      console.log(`✅ [LocationService] GPS Success: ${this.formatLocation(gpsResult.location)}`);
      return gpsResult;
    }

    console.warn('⚠️ [LocationService] GPS failed, trying IP detection...');

    // Fallback to IP
    const ipResult = await this.getIPLocation();
    if (ipResult.success && ipResult.location) {
      console.log(`✅ [LocationService] IP Success: ${this.formatLocation(ipResult.location)}`);
      return ipResult;
    }

    console.error('❌ [LocationService] All detection methods failed');
    return {
      success: false,
      error: 'Unable to detect location',
      source: 'manual',
    };
  }

  /**
   * Get location using browser Geolocation API (GPS)
   */
  private async getGPSLocation(): Promise<GeolocationResult> {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      return {
        success: false,
        error: 'Geolocation not supported',
        source: 'gps',
      };
    }

    try {
      console.log('🛰️ [GPS] Requesting position...');

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('GPS timeout'));
        }, this.GPS_TIMEOUT);

        navigator.geolocation.getCurrentPosition(
          (pos) => {
            clearTimeout(timeoutId);
            resolve(pos);
          },
          (err) => {
            clearTimeout(timeoutId);
            reject(err);
          },
          {
            enableHighAccuracy: true,
            timeout: this.GPS_TIMEOUT,
            maximumAge: 0,
          }
        );
      });

      const { latitude, longitude, accuracy } = position.coords;
      console.log(`📍 [GPS] Coordinates: ${latitude.toFixed(6)}, ${longitude.toFixed(6)} (±${Math.round(accuracy)}m)`);

      // Reverse geocode with Photon
      const location = await this.photonReverseGeocode(latitude, longitude);

      return {
        success: true,
        location,
        source: 'gps',
      };
    } catch (error: any) {
      console.warn('⚠️ [GPS] Denied or unavailable:', error.message);
      return {
        success: false,
        error: error.message || 'GPS access denied',
        source: 'gps',
      };
    }
  }

  /**
   * Photon API reverse geocoding (GPS coordinates → Address)
   */
  private async photonReverseGeocode(lat: number, lon: number): Promise<LocationData> {
    try {
      console.log('🗺️ [Photon] Reverse geocoding...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

      const response = await fetch(
        `${this.PHOTON_API}/reverse?lat=${lat}&lon=${lon}&limit=1`,
        {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' },
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Photon API error: ${response.status}`);
      }

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const props = data.features[0].properties;

        // Extract city with priority order
        const city = props.city || 
                     props.town || 
                     props.village || 
                     props.suburb ||
                     props.county || 
                     props.district ||
                     props.name || 
                     'Unknown';

        const state = props.state || props.county || 'Unknown';
        const country = props.country || 'India';

        console.log(`✅ [Photon] Resolved: ${city}, ${state}`);

        return {
          city,
          state,
          country,
          latitude: lat,
          longitude: lon,
        };
      }

      // No results from Photon
      console.warn('⚠️ [Photon] No results, using coordinates');
      return {
        city: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
        state: 'GPS Coordinates',
        country: 'India',
        latitude: lat,
        longitude: lon,
      };
    } catch (error: any) {
      console.error('❌ [Photon] Failed:', error.message);
      // Return coordinates as fallback
      return {
        city: `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`,
        state: 'GPS Coordinates',
        country: 'India',
        latitude: lat,
        longitude: lon,
      };
    }
  }

  /**
   * Get location using IP address
   * Primary: ipapi.co (accurate for India)
   * Fallback: ipwho.is
   */
  private async getIPLocation(): Promise<GeolocationResult> {
    // Try ipapi.co first (more accurate for India)
    try {
      console.log('🌐 [IP] Trying ipapi.co...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        if (data.city && data.region) {
          const location: LocationData = {
            city: data.city,
            state: data.region,
            country: data.country_name || 'India',
            latitude: data.latitude,
            longitude: data.longitude,
          };

          console.log(`✅ [IP] ipapi.co: ${location.city}, ${location.state}`);
          return { success: true, location, source: 'ip' };
        }
      }
    } catch (error) {
      console.warn('⚠️ [IP] ipapi.co failed, trying ipwho.is...');
    }

    // Fallback to ipwho.is
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.API_TIMEOUT);

      const response = await fetch('https://ipwho.is', {
        signal: controller.signal,
        headers: { 'Accept': 'application/json' },
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();

        if (data.success !== false && data.city) {
          const location: LocationData = {
            city: data.city,
            state: data.region || data.region_code || 'Unknown',
            country: data.country || 'India',
            latitude: data.latitude,
            longitude: data.longitude,
          };

          console.log(`✅ [IP] ipwho.is: ${location.city}, ${location.state}`);
          return { success: true, location, source: 'ip' };
        }
      }
    } catch (error: any) {
      console.error('❌ [IP] ipwho.is failed:', error.message);
    }

    return {
      success: false,
      error: 'All IP detection services failed',
      source: 'ip',
    };
  }

  /**
   * Search locations (for autocomplete)
   */
  async searchLocations(query: string): Promise<LocationData[]> {
    if (!query || query.trim().length < 2) return [];

    try {
      const response = await fetch(
        `${this.PHOTON_API}/api?q=${encodeURIComponent(query)}&limit=8&lang=en`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) return [];

      const data = await response.json();

      if (data.features && data.features.length > 0) {
        return data.features.map((feature: any) => {
          const props = feature.properties;
          const coords = feature.geometry.coordinates;

          return {
            city: props.city || props.name || 'Unknown',
            state: props.state || 'Unknown',
            country: props.country || 'India',
            latitude: coords[1],
            longitude: coords[0],
          };
        });
      }

      return [];
    } catch (error) {
      console.error('Photon search failed:', error);
      return [];
    }
  }

  /**
   * Calculate distance between coordinates (Haversine)
   */
  calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(lat: number, lng: number): boolean {
    return (
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180
    );
  }

  /**
   * Format location for display
   */
  formatLocation(location: LocationData): string {
    if (!location.city || location.city === 'Unknown') {
      return 'Location Unknown';
    }
    return `${location.city}, ${location.state}`;
  }
}

export const locationService = new LocationService();
