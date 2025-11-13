import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { LocationData } from '@/types';

type Theme = 'light' | 'dark';

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  currentLocation: LocationData | null; // NEW: Store location for non-auth users
  
  // Actions
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setCurrentLocation: (location: LocationData | null) => void; // NEW
}

export const useUIStore = create<UIState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      sidebarOpen: true,
      currentLocation: null, // NEW

      setTheme: (theme) => {
        set({ theme });
        
        // Only apply theme on client side after mount
        if (typeof window !== 'undefined') {
          // Use requestAnimationFrame to avoid hydration mismatch
          requestAnimationFrame(() => {
            if (theme === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
          });
        }
      },

      toggleTheme: () => {
        const newTheme = get().theme === 'light' ? 'dark' : 'light';
        get().setTheme(newTheme);
      },

      setSidebarOpen: (open) => {
        set({ sidebarOpen: open });
      },

      toggleSidebar: () => {
        set({ sidebarOpen: !get().sidebarOpen });
      },

      // NEW: Set current location
      setCurrentLocation: (location) => {
        set({ currentLocation: location });
      },
    }),
    {
      name: 'ui-storage',
      skipHydration: true,
    }
  )
);
