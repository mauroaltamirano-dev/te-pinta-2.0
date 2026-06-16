import type { ComponentType } from 'react';
import { Boxes, Calculator, Layers3, PieChart, ReceiptText, ScrollText, Soup } from 'lucide-react';

export type FinanceSectionId =
  | 'dashboard'
  | 'catalog'
  | 'purchases'
  | 'ledger'
  | 'base-costs'
  | 'recipes'
  | 'calculator';

type FinanceSection = {
  id: FinanceSectionId;
  label: string;
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
};

type FinanceSectionNavProps = {
  activeSection: FinanceSectionId;
  onSectionChange: (section: FinanceSectionId) => void;
};

export const financeSections: FinanceSection[] = [
  { id: 'dashboard', label: 'Dashboard', icon: PieChart },
  { id: 'catalog', label: 'Catálogo', icon: Boxes },
  { id: 'purchases', label: 'Compras', icon: ReceiptText },
  { id: 'ledger', label: 'Movimientos', icon: ScrollText },
  { id: 'base-costs', label: 'Costos base', icon: Layers3 },
  { id: 'recipes', label: 'Recetas', icon: Soup },
  { id: 'calculator', label: 'Calculadora', icon: Calculator },
];

const isFinanceSectionId = (value: string): value is FinanceSectionId =>
  financeSections.some((section) => section.id === value);

export const FinanceSectionNav = ({ activeSection, onSectionChange }: FinanceSectionNavProps) => (
  <div className="space-y-2">
    <label
      className="block text-sm font-bold text-foreground sm:hidden"
      htmlFor="finance-section-select"
    >
      Sección de gestión
    </label>
    <select
      aria-label="Sección de gestión"
      className="block w-full rounded-2xl border border-border bg-card px-3 py-2 text-sm font-black text-foreground shadow-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:hidden"
      id="finance-section-select"
      onChange={(event) => {
        if (isFinanceSectionId(event.target.value)) {
          onSectionChange(event.target.value);
        }
      }}
      value={activeSection}
    >
      {financeSections.map((section) => (
        <option key={section.id} value={section.id}>
          {section.label}
        </option>
      ))}
    </select>

    <div
      aria-label="Secciones de gestión"
      className="hidden gap-2 rounded-[1.5rem] border border-border/70 bg-card p-2 shadow-card sm:grid sm:grid-cols-2 lg:grid-cols-7"
      role="tablist"
    >
      {financeSections.map((section) => {
        const Icon = section.icon;
        const isActive = activeSection === section.id;

        return (
          <button
            aria-controls={`finance-panel-${section.id}`}
            aria-selected={isActive}
            className={
              isActive
                ? 'inline-flex items-center justify-center gap-2 rounded-2xl bg-sidebar px-3 py-2 text-sm font-black text-white shadow-card'
                : 'inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-sm font-black text-muted-foreground transition hover:bg-background hover:text-foreground'
            }
            id={`finance-tab-${section.id}`}
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            role="tab"
            type="button"
          >
            <Icon className="h-4 w-4" aria-hidden={true} />
            {section.label}
          </button>
        );
      })}
    </div>
  </div>
);
