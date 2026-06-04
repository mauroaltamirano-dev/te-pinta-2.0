import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type CustomerDrawerOverlayProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export const CustomerDrawerOverlay = ({
  isOpen,
  onClose,
  children,
}: CustomerDrawerOverlayProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 hidden lg:flex lg:items-stretch lg:justify-end">
      <button
        aria-label="Cerrar panel"
        className="absolute inset-0 animate-backdrop-fade-in bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
        type="button"
      />
      <div className="relative z-10 flex h-dvh w-full max-w-md animate-drawer-in-right flex-col overflow-hidden border-l border-border/70 bg-card shadow-2xl 2xl:max-w-lg">
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>,
    document.body,
  );
};
