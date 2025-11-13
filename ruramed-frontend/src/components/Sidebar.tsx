'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  LayoutDashboard, 
  User, 
  MapPin, 
  Stethoscope, 
  Pill, 
  ShoppingBag,
  FileText,
  Settings,
  X,
  Menu
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';

interface SidebarItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sidebarItems: SidebarItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Profile', href: '/dashboard/profile', icon: User },
  { name: 'Addresses', href: '/dashboard/addresses', icon: MapPin },
  { name: 'Consultations', href: '/dashboard/consultations', icon: Stethoscope },
  { name: 'Buy Medicine', href: '/dashboard/medicines', icon: Pill },
  { name: 'My Orders', href: '/dashboard/orders', icon: ShoppingBag },
  { name: 'Prescriptions', href: '/dashboard/prescriptions', icon: FileText },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <>
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between p-4 lg:hidden border-b border-slate-200 dark:border-slate-800">
          <span className="text-lg font-semibold text-slate-900 dark:text-white">Menu</span>
          <button
            onClick={toggleSidebar}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto h-[calc(100vh-5rem)] lg:h-[calc(100vh-4rem)]">
          {sidebarItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  // Close sidebar on mobile after clicking
                  if (window.innerWidth < 1024) {
                    toggleSidebar();
                  }
                }}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-primary-600 dark:text-primary-400' : ''}`} />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Help Section */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
            <h4 className="text-sm font-semibold text-primary-900 dark:text-primary-100 mb-1">
              Need Help?
            </h4>
            <p className="text-xs text-primary-700 dark:text-primary-300 mb-3">
              Contact our support team 24/7
            </p>
            <Link
              href="/contact"
              className="block w-full text-center px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Contact Support
            </Link>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Toggle Button */}
      <button
        onClick={toggleSidebar}
        className="fixed bottom-6 right-6 lg:hidden z-50 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all"
      >
        <Menu className="w-6 h-6" />
      </button>
    </>
  );
}
