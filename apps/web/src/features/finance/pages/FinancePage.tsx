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
import type { FinanceWallet } from '../types';

const getSectionFromQuery = (section: string | null): FinanceSectionId =>
  financeSections.some((item) => item.id === section) ? (section as FinanceSectionId) : 'dashboard';

const financeWallets: FinanceWallet[] = ['production_cost', 'services', 'profit'];

const getWalletFromQuery = (wallet: string | null): FinanceWallet | undefined =>
  financeWallets.includes(wallet as FinanceWallet) ? (wallet as FinanceWallet) : undefined;

export const FinancePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState<FinanceSectionId>(() =>
    getSectionFromQuery(searchParams.get('section')),
  );
  const workspaceData = useFinanceWorkspaceData();
  const selectedRecipeMenuItemId =
    activeSection === 'recipes' ? (searchParams.get('menuItemId') ?? undefined) : undefined;
  const selectedLedgerWallet =
    activeSection === 'ledger' ? getWalletFromQuery(searchParams.get('wallet')) : undefined;

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
    if (section !== 'ledger') {
      nextParams.delete('wallet');
    }
    setSearchParams(nextParams, { replace: true });
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <PageHero
        eyebrow="Gestión"
        title="Gestión"
        description="Centro operativo para costos, compras, recetas y rentabilidad. Si faltan datos, la app avisa sin romper la operación."
      >
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-black uppercase tracking-wide text-sidebar-muted ring-1 ring-white/10">
          <CircleDollarSign className="h-4 w-4 text-accent" aria-hidden={true} />
          Gestión operativa
        </span>
      </PageHero>

      <FinanceSectionNav activeSection={activeSection} onSectionChange={handleSectionChange} />
      <FinanceLegacyWorkspace
        activeSection={activeSection}
        data={workspaceData}
        selectedLedgerWallet={selectedLedgerWallet}
        selectedRecipeMenuItemId={selectedRecipeMenuItemId}
      />
    </div>
  );
};
