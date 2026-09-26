import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

interface SheetProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** A tall sheet whose content scrolls on its own (a chat); the default grows with its content. */
  fill?: boolean;
  /** Extra buttons next to «Закрыть» */
  actions?: ReactNode;
  subtitle?: string;
}

// A bottom sheet in the phone column: Escape and the backdrop close it, Tab stays inside, focus returns afterwards.
export default function Sheet({ open, title, onClose, children, fill, actions, subtitle }: SheetProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => panelRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;
      const focusable: HTMLElement[] = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), textarea:not([disabled])'),
      );
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      if (event.shiftKey && (document.activeElement === first || document.activeElement === panelRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus?.focus();
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[300] flex items-end justify-center lg:items-center lg:p-6">
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[rgba(8,11,18,0.45)]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            className={cn(
              'relative w-full max-w-[30rem] rounded-t-[1.75rem] bg-page px-4 pt-3 text-ink shadow-[0_-18px_40px_-24px_rgba(0,0,0,0.5)] outline-none lg:max-w-[36rem] lg:rounded-[1.75rem]',
              fill
                ? 'flex h-[92dvh] flex-col overflow-hidden pb-[calc(0.75rem_+_env(safe-area-inset-bottom))] lg:h-[80dvh]'
                : 'max-h-[88dvh] overflow-y-auto pb-[calc(1.5rem_+_env(safe-area-inset-bottom))]',
            )}
          >
            <span aria-hidden="true" className="mx-auto block h-1 w-10 shrink-0 rounded-full bg-track lg:hidden" />
            <div className="mt-3 flex shrink-0 items-center justify-between gap-2 px-1">
              <div className="min-w-0 flex-1">
                <h2 className="m-0 text-[1.375rem] font-bold leading-tight tracking-[-0.02em]">{title}</h2>
                {subtitle && <p className="m-0 mt-0.5 text-[0.8125rem] leading-snug text-ink-2">{subtitle}</p>}
              </div>
              {actions}
              <button
                type="button"
                onClick={onClose}
                aria-label="Закрыть"
                className="mgb-glass grid size-11 shrink-0 place-items-center rounded-full text-ink"
              >
                <X size={18} strokeWidth={2.2} aria-hidden="true" />
              </button>
            </div>
            <div className={cn('mt-4', fill && 'mt-3 flex min-h-0 flex-1 flex-col')}>{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
