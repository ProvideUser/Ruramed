// src/components/DashboardSidebar.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation'; // Import usePathname
import {
  LayoutGrid,
  User,
  MapPin,
  Stethoscope,
  Pill,
  ShoppingCart,
  FileText,
  Settings,
  Menu,
  X,
} from 'lucide-react';
// We no longer need useDashboardStore for navigation

// We add an 'href' property to each item
const menuItems = [
 // { id: 'overview', label: 'Dashboard', icon: LayoutGrid, href: '/dashboard' },
  { id: 'profile', label: 'Profile', icon: User, href: '/dashboard/profile' },
  { id: 'addresses', label: 'Addresses', icon: MapPin, href: '/dashboard/addresses' },
  { id: 'consultations', label: 'Consultations', icon: Stethoscope, href: '/dashboard/consultations' },
  { id: 'medicines', label: 'Buy Medicines', icon: Pill, href: '/dashboard/medicines' },
  { id: 'orders', label: 'My Orders', icon: ShoppingCart, href: '/dashboard/orders' },
  { id: 'prescriptions', label: 'Prescriptions', icon: FileText, href: '/dashboard/prescriptions' },
  { id: 'settings', label: 'Settings', icon: Settings, href: '/dashboard/settings' },
];

export function DashboardSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname(); // Get the current URL path

  // We only need the mobile state logic now
  const handleLinkClick = () => {
    setIsOpen(false); // Close mobile menu on click
  };

  return (
    <>
      {/* Mobile Menu Button (No changes here) */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="md:hidden fixed bottom-6 right-6 z-40 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed md:relative z-30 top-0 left-0 h-screen
          w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700
          overflow-y-auto transition-transform duration-300
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Sidebar Header (No changes here) */}
        <div className="sticky top-0 p-6 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Menu</h2>
        </div>

        {/* Navigation Items: Replaced <button> with <Link> */}
        <nav className="p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            // Check if the current path matches the item's href
            const isActive = pathname === item.href; 

            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={handleLinkClick} // Close menu on mobile
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-lg
                  transition-all duration-200 text-left
                  ${
                    isActive
                      ? 'bg-primary-600 text-white shadow-md'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Overlay (No changes here) */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}