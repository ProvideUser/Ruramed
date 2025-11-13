'use client';

import { useDashboardStore } from '@/store/dashboard.store';
import { Loader2 } from 'lucide-react';

// Import section components
//import { DashboardOverview } from './dashboard-sections/DashboardOverview';
import { ProfileSection } from './dashboard-sections/ProfileSection';
import { AddressesSection } from './dashboard-sections/AddressesSection';
import { ConsultationsSection } from './dashboard-sections/ConsultationsSection';
import { MedicinesSection } from './dashboard-sections/MedicinesSection';
import { OrdersSection } from './dashboard-sections/OrdersSection';
import { PrescriptionsSection } from './dashboard-sections/PrescriptionsSection';
import { SettingsSection } from './dashboard-sections/SettingsSection';

const sectionComponents: Record<string, React.ComponentType> = {
 // overview: DashboardOverview,
  profile: ProfileSection,
  addresses: AddressesSection,
  consultations: ConsultationsSection,
  medicines: MedicinesSection,
  orders: OrdersSection,
  prescriptions: PrescriptionsSection,
  settings: SettingsSection,
};

export function DashboardContent() {
  const { activeSection, isLoading } = useDashboardStore();

  const SectionComponent = sectionComponents[activeSection];

  return (
    <main className="flex-1 overflow-auto">
      <div className="p-6 md:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-96">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
          </div>
        ) : (
          <SectionComponent />
        )}
      </div>
    </main>
  );
}
