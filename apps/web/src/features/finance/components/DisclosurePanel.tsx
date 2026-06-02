import { ChevronDown } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

type DisclosurePanelProps = {
  title: string;
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
};

export const DisclosurePanel = ({
  title,
  summary,
  children,
  defaultOpen = false,
  open,
  onOpenChange,
  className = '',
}: DisclosurePanelProps) => {
  const panelId = useId();
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isOpen = open ?? internalOpen;

  const toggle = () => {
    const nextOpen = !isOpen;

    if (open === undefined) {
      setInternalOpen(nextOpen);
    }

    onOpenChange?.(nextOpen);
  };

  return (
    <section
      className={['rounded-[1.35rem] border border-border/70 bg-white/85 shadow-card', className].join(
        ' ',
      )}
    >
      <button
        aria-controls={panelId}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        onClick={toggle}
        type="button"
      >
        <span>
          <span className="block text-sm font-black text-foreground">{title}</span>
          {summary && (
            <span className="mt-0.5 block text-xs font-semibold text-muted-foreground">
              {summary}
            </span>
          )}
        </span>
        <ChevronDown
          aria-hidden={true}
          className={isOpen ? 'h-4 w-4 rotate-180 transition' : 'h-4 w-4 transition'}
        />
      </button>

      {isOpen && (
        <div className="border-t border-border/70 px-4 py-3 text-sm text-foreground" id={panelId}>
          {children}
        </div>
      )}
    </section>
  );
};
