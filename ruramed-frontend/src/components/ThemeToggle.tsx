'use client';

import { Moon, Sun } from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { useEffect, useState } from 'react';

export default function ThemeToggle() {
  const { theme, toggleTheme, setTheme } = useUIStore();
  const [mounted, setMounted] = useState(false);

  // Only run on client
  useEffect(() => {
    setMounted(true);
    // Rehydrate store
    useUIStore.persist.rehydrate();
    
    // Apply saved theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Avoid hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800"></div>
    );
  }

  return (
    <button
      onClick={toggleTheme}
      className="relative inline-flex items-center justify-center w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
      aria-label="Toggle theme"
    >
      <Sun
        className={`absolute w-5 h-5 text-amber-500 transition-all duration-300 ${
          theme === 'light'
            ? 'rotate-0 scale-100 opacity-100'
            : 'rotate-90 scale-0 opacity-0'
        }`}
      />
      <Moon
        className={`absolute w-5 h-5 text-blue-400 transition-all duration-300 ${
          theme === 'dark'
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
      />
    </button>
  );
}
