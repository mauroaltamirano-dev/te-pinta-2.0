import { ChevronLeft, X } from 'lucide-react';
import { type ReactNode, useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

type FinanceActionSheetProps = {
  isOpen: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  onBack?: () => void;
  closeLabel?: string;
  backLabel?: string;
  placement?: 'modal' | 'side';
};

export const FinanceActionSheet = ({
  isOpen,
  title,
  description,
  children,
  footer,
  onClose,
  onBack,
  closeLabel = 'Close',
  backLabel = 'Back',
  placement = 'modal',
}: FinanceActionSheetProps) => {
  const titleId = useId();
  const descriptionId = useId();
  const isSidePlacement = placement === 'side';

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return createPortal(
    <div
      className={[
        'fixed inset-0 z-50 flex bg-black/50 backdrop-blur-[2px]',
        isSidePlacement ? 'items-stretch justify-end' : 'items-end sm:items-center sm:justify-center',
      ].join(' ')}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        aria-describedby={description ? descriptionId : undefined}
        aria-labelledby={titleId}
        aria-modal="true"
        className={[
          'flex w-full flex-col overflow-hidden border border-[#E8D3BF] bg-[#FCF8F2] shadow-2xl',
          isSidePlacement
            ? 'h-dvh max-h-dvh max-w-full animate-slide-in-right rounded-none border-y-0 border-r-0 sm:max-w-xl lg:max-w-2xl'
            : 'max-h-[94dvh] animate-modal-enter rounded-t-3xl sm:max-h-[92dvh] sm:max-w-3xl sm:rounded-3xl',
        ].join(' ')}
        role="dialog"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#E8D3BF] bg-[#FFFDF9] px-4 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            {onBack && (
              <button
                aria-label={backLabel}
                className="mt-0.5 rounded-xl border border-border p-2 text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
                onClick={onBack}
                type="button"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden={true} />
              </button>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-lg font-bold text-foreground" id={titleId}>
                {title}
              </h2>
              {description && (
                <p className="mt-0.5 text-sm font-semibold text-muted-foreground" id={descriptionId}>
                  {description}
                </p>
              )}
            </div>
          </div>

          <button
            aria-label={closeLabel}
            className="rounded-xl border border-border p-2 text-muted-foreground transition hover:border-primary/30 hover:text-foreground"
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" aria-hidden={true} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">{children}</div>

        {footer && (
          <footer className="shrink-0 border-t border-[#E8D3BF] bg-card/95 px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
            {footer}
          </footer>
        )}
      </section>
    </div>,
    document.body,
  );
};
