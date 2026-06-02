import { useState } from 'react';
import { CircleDollarSign } from 'lucide-react';

import { PageHero } from '@/components/layout/PageHero';

import { FinanceLegacyWorkspace } from '../components/FinanceLegacyWorkspace';
import { FinanceSectionNav, type FinanceSectionId } from '../components/FinanceSectionNav';
import { useFinanceWorkspaceData } from '../hooks/useFinanceWorkspaceData';

export const FinancePage = () => {
  const [activeSection, setActiveSection] = useState<FinanceSectionId>('dashboard');
  const workspaceData = useFinanceWorkspaceData();
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHero
        eyebrow="Finanzas"
        title="Finanzas"
        description="Un espacio único para costos, compras y rentabilidad. Si faltan datos, la app avisa sin romper la operación."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-sidebar-muted ring-1 ring-white/10">
          <CircleDollarSign className="h-4 w-4 text-accent" aria-hidden={true} />
          MVP financiero
        </span>
      </PageHero>

      <FinanceSectionNav activeSection={activeSection} onSectionChange={setActiveSection} />
      <FinanceLegacyWorkspace activeSection={activeSection} data={workspaceData} />
    </div>
  );
};
