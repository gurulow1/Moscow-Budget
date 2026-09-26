import { forwardRef, type ReactNode } from 'react';
import { Check, ChevronLeft, X } from 'lucide-react';
import { cn } from '../lib/utils';

// A full-screen step (quiz, meeting): no tab bar, the page scrolls, the main action floats at the bottom.
export function FlowPage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col px-4 pb-[calc(7rem_+_env(safe-area-inset-bottom))] pt-[calc(1.5rem_+_env(safe-area-inset-top))]',
        className,
      )}
    >
      {children}
    </div>
  );
}

interface FlowTopProps {
  icon: 'close' | 'back';
  label: string;
  onPress: () => void;
  title?: string;
  step?: string;
  children?: ReactNode;
}

export const FlowTop = forwardRef<HTMLHeadingElement, FlowTopProps>(function FlowTop(
  { icon, label, onPress, title, step, children },
  titleRef,
) {
  const Icon = icon === 'close' ? X : ChevronLeft;
  return (
    <div className="flex min-h-11 items-center gap-3">
      <button
        type="button"
        onClick={onPress}
        aria-label={label}
        className="mgb-glass grid size-11 shrink-0 place-items-center rounded-full text-ink"
      >
        <Icon size={icon === 'close' ? 18 : 20} strokeWidth={2.2} aria-hidden="true" />
      </button>
      {title && (
        <h1 ref={titleRef} tabIndex={-1} className="m-0 min-w-0 flex-1 text-[1.375rem] font-bold leading-tight tracking-[-0.02em] outline-none">
          {title}
        </h1>
      )}
      {children}
      {step && <span className="shrink-0 text-[0.9375rem] font-semibold text-ink-2">{step}</span>}
    </div>
  );
});

interface BottomActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

// aria-disabled keeps the button focusable, so a screen reader still hears why it is muted.
export function BottomAction({ label, onClick, disabled }: BottomActionProps) {
  return (
    <button
      type="button"
      aria-disabled={disabled || undefined}
      onClick={() => !disabled && onClick()}
      className={cn(
        'fixed bottom-[calc(1.5rem_+_env(safe-area-inset-bottom))] left-1/2 z-40 h-14 w-[calc(min(100vw,30rem)_-_2rem)] -translate-x-1/2 rounded-full text-[1rem] font-semibold transition-colors duration-200',
        disabled
          ? 'cursor-default bg-track text-ink-3'
          : 'bg-accent-fill text-white shadow-[0_12px_24px_-16px_var(--mgb-accent)]',
      )}
    >
      {label}
    </button>
  );
}

export function PrimaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-14 w-full items-center justify-center rounded-full bg-accent-fill text-[1rem] font-semibold text-white shadow-[0_12px_24px_-16px_var(--mgb-accent)]"
    >
      {children}
    </button>
  );
}

export function SecondaryButton({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[3.25rem] w-full items-center justify-center rounded-full border border-line bg-card text-[1rem] font-semibold text-ink"
    >
      {children}
    </button>
  );
}

// A round mark: a check for a met target, "!" for a missed one.
export function Mark({ ok, size = 20 }: { ok: boolean; size?: 20 | 28 | 40 }) {
  const glyph = size === 20 ? 11 : size === 28 ? 15 : 20;
  return (
    <span
      aria-hidden="true"
      className={cn('grid shrink-0 place-items-center rounded-full', ok ? 'bg-ok-soft text-ok-ink' : 'bg-accent-soft text-accent')}
      style={{ width: size, height: size }}
    >
      {ok ? (
        <Check size={glyph} strokeWidth={3.4} />
      ) : size === 28 ? (
        <X size={glyph - 2} strokeWidth={3.2} />
      ) : (
        <svg width={glyph} height={glyph} viewBox="0 0 24 24" className="fill-none stroke-current" strokeWidth={3.4} strokeLinecap="round">
          <path d="M12 5v8.5M12 19v.01" />
        </svg>
      )}
    </span>
  );
}

// A card list row: title and a note on the left, a figure or a mark on the right.
export function ListRow({ title, note, right }: { title: string; note?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="m-0 text-[1rem] font-semibold leading-snug">{title}</p>
        {note && <p className="m-0 mt-0.5 text-[0.8125rem] leading-snug text-ink-2">{note}</p>}
      </div>
      {right}
    </div>
  );
}

export const Divider = () => <div aria-hidden="true" className="mx-5 h-px bg-line" />;
