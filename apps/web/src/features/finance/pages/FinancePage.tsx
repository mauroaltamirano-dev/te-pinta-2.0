import { useEffect, useState } from 'react';
import { CircleDollarSign } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

import { PageHero } from '@/components/layout/PageHero';

import { FinanceLegacyWorkspace } from '../components/FinanceLegacyWorkspace';
import {
  financeSections,
  FinanceSectionNav,
  type FinanceSectionId,
} from '../components/FinanceSectionNav';
import { useFinanceWorkspaceData } from '../hooks/useFinanceWorkspaceData';

const getSectionFromQuery = (section: string | null): FinanceSectionId =>
  financeSections.some((item) => item.id === section) ? (section as FinanceSectionId) : 'dashboard';

export const FinancePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<FinanceSectionId>(() =>
    getSectionFromQuery(searchParams.get('section')),
  );
  const workspaceData = useFinanceWorkspaceData();
  const selectedRecipeMenuItemId =
    activeSection === 'recipes' ? (searchParams.get('menuItemId') ?? undefined) : undefined;

  useEffect(() => {
    const nextSection = getSectionFromQuery(searchParams.get('section'));
    setActiveSection((current) => (current === nextSection ? current : nextSection));
  }, [searchParams]);

  const handleSectionChange = (section: FinanceSectionId) => {
    setActiveSection(section);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', section);
    if (section !== 'recipes') {
      nextParams.delete('menuItemId');
    }
    setSearchParams(nextParams, { replace: true });
  };

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

      <FinanceSectionNav activeSection={activeSection} onSectionChange={handleSectionChange} />
      <FinanceLegacyWorkspace
        activeSection={activeSection}
        data={workspaceData}
        selectedRecipeMenuItemId={selectedRecipeMenuItemId}
      />
    </div>
  );
};
