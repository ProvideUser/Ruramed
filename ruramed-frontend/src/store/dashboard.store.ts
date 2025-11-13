import { create } from 'zustand';

type DashboardSection = 
  | 'overview' 
  | 'profile' 
  | 'addresses' 
  | 'consultations' 
  | 'medicines' 
  | 'orders' 
  | 'prescriptions' 
  | 'settings';

interface DashboardState {
  activeSection: DashboardSection;
  isLoading: boolean;
  error: string | null;
  
  setActiveSection: (section: DashboardSection) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  activeSection: 'profile', // Changed from 'overview' to 'profile' or other section
  isLoading: false,
  error: null,

  setActiveSection: (section) => {
    set({ activeSection: section, error: null });
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  },

  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),
}));
