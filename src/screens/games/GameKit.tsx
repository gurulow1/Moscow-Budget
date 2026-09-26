import { useEffect, useRef, type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { QuestItem } from '../../data/quests';
import { Divider, FlowPage, FlowTop, ListRow, Mark, PrimaryButton, SecondaryButton } from '../../ui/Flow';

export interface GameProps {
  item: QuestItem;
  /** Gives the points once per activity id; true when they were given now. */
  onComplete: (id: string, points: number) => boolean;
  onClose: () => void;
  onToQuests: () => void;
}

export interface Outcome {
  win: boolean;
  awarded: boolean;
}

// A finished run: record the points once, remember whether they were given now.
export const finish = (props: GameProps, win: boolean): Outcome => ({
  win,
  awarded: win && props.item.reward ? props.onComplete(props.item.id, props.item.reward) : false,
});

export function GamePage({ item, onClose, children }: { item: QuestItem; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  return (
    <FlowPage>
      <FlowTop icon="close" label="Закрыть игру" onPress={onClose} title={item.title} />
      <div className="mt-4 grid gap-3">{children}</div>
    </FlowPage>
  );
}

export function Task({ children, note }: { children: ReactNode; note?: ReactNode }) {
  return (
    <section className="mgb-card px-5 py-[1.125rem]" aria-label="Задание">
      <p className="m-0 text-[0.875rem] text-ink-2">Задание</p>
      <p className="m-0 mt-1 text-[1rem] leading-[1.45] [text-wrap:pretty]">{children}</p>
      {note && <p className="m-0 mt-2 text-[0.8125rem] leading-snug text-ink-3">{note}</p>}
    </section>
  );
}

interface ChoiceProps {
  kind?: 'radio' | 'checkbox';
  checked: boolean;
  onClick: () => void;
  title: ReactNode;
  text?: ReactNode;
  /** After the answer: ok — right, bad — wrong; the card shows it instead of the selection. */
  tone?: 'ok' | 'bad' | null;
  tag?: string;
  /** Extra lines shown under the card text, e.g. the explanation after the answer */
  children?: ReactNode;
  locked?: boolean;
}

// A selectable card: a radio for one answer, a checkbox for several.
export function Choice({ kind = 'radio', checked, onClick, title, text, tone, tag, children, locked }: ChoiceProps) {
  return (
    <button
      type="button"
      role={kind}
      aria-checked={checked}
      aria-disabled={locked || undefined}
      onClick={() => !locked && onClick()}
      className={cn(
        'grid w-full gap-1.5 rounded-3xl border-[1.5px] px-[1.125rem] py-4 text-left text-ink transition-[border-color,box-shadow,background-color,opacity] duration-200',
        tone === 'ok'
          ? 'border-c3 bg-ok-soft'
          : tone === 'bad'
            ? 'border-accent bg-accent-soft'
            : checked
              ? 'border-accent bg-card shadow-[0_0_0_3px_var(--mgb-accent-soft),var(--mgb-shadow)]'
              : 'border-line bg-card shadow-[var(--mgb-shadow)]',
        locked && !tone && 'opacity-55',
        locked && 'cursor-default',
      )}
    >
      <span className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className={cn(
            'grid size-6 shrink-0 place-items-center border-2',
            kind === 'radio' ? 'rounded-full' : 'rounded-[0.4375rem]',
            tone === 'ok' ? 'border-c3 bg-c3 text-white' : tone === 'bad' ? 'border-accent bg-accent text-white' : checked ? 'border-accent' : 'border-track',
            kind === 'checkbox' && checked && !tone && 'bg-accent text-white',
          )}
        >
          {kind === 'radio' && !tone ? (
            <span className={cn('size-2.5 rounded-full bg-accent transition-opacity', checked ? 'opacity-100' : 'opacity-0')} />
          ) : (
            (checked || tone) && <Check size={14} strokeWidth={3} />
          )}
        </span>
        <span className="min-w-0 flex-1 text-[1.0625rem] font-semibold leading-tight tracking-[-0.01em]">{title}</span>
        {tag && (
          <span className={cn('shrink-0 text-[0.8125rem] font-semibold', tone === 'bad' ? 'text-accent' : 'text-ok-ink')}>{tag}</span>
        )}
      </span>
      {text && <span className="text-[0.875rem] leading-[1.45] text-ink-2 [text-wrap:pretty]">{text}</span>}
      {children}
    </button>
  );
}

interface GameResultProps extends GameProps {
  outcome: Outcome;
  title: string;
  message: ReactNode;
  onRetry: () => void;
  retryLabel?: string;
  /** Facts or a review under the verdict */
  children?: ReactNode;
}

export function GameResult({ item, outcome, title, message, onRetry, retryLabel, onClose, onToQuests, children }: GameResultProps) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
    titleRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <FlowPage className="pb-[calc(2rem_+_env(safe-area-inset-bottom))]">
      <FlowTop ref={titleRef} icon="close" label="Закрыть итог" onPress={onClose} title="Итог игры" />
      <div className="mt-[1.125rem] grid gap-3">
        <section className="mgb-card px-5 py-[1.125rem]" aria-label="Итог">
          <p className="m-0 text-[0.875rem] text-ink-2">{item.title}</p>
          <div className="mt-2.5 flex items-center gap-3">
            <Mark ok={outcome.win} size={40} />
            <h2 className="m-0 text-[1.75rem] font-bold leading-[1.15] tracking-[-0.025em]">{title}</h2>
          </div>
          <div className="mt-2.5 text-[0.9375rem] leading-[1.45] text-ink-2 [text-wrap:pretty]">{message}</div>
        </section>

        {children}

        {item.reward && (
          <section className="mgb-card" aria-label="Награда">
            <ListRow
              title="Учебные баллы"
              note={!outcome.win ? 'начисляются, когда задание выполнено' : outcome.awarded ? 'за первое прохождение' : 'за это задание уже начислены'}
              right={<b className="shrink-0 text-[1.0625rem] font-bold">{outcome.awarded ? `+${item.reward}` : '0'}</b>}
            />
          </section>
        )}

        {outcome.win ? (
          <>
            <PrimaryButton onClick={onToQuests}>К квестам</PrimaryButton>
            <SecondaryButton onClick={onRetry}>{retryLabel ?? 'Сыграть ещё раз'}</SecondaryButton>
          </>
        ) : (
          <>
            <PrimaryButton onClick={onRetry}>{retryLabel ?? 'Попробовать ещё раз'}</PrimaryButton>
            <SecondaryButton onClick={onToQuests}>К квестам</SecondaryButton>
          </>
        )}
      </div>
    </FlowPage>
  );
}

// A list of verdicts, e.g. which conditions were right: a mark, a line and an explanation.
export function Review({ title, rows }: { title: string; rows: { ok: boolean; title: string; text: string }[] }) {
  return (
    <section className="mgb-card" aria-label={title}>
      <h3 className="m-0 px-5 pb-0.5 pt-4 text-[0.875rem] font-normal text-ink-2">{title}</h3>
      {rows.map((row, i) => (
        <div key={row.title}>
          {i > 0 && <Divider />}
          <div className="flex gap-3 px-5 py-3.5">
            <Mark ok={row.ok} size={28} />
            <div className="min-w-0 flex-1">
              <p className="m-0 text-[0.9375rem] font-semibold leading-snug">{row.title}</p>
              <p className="m-0 mt-1 text-[0.875rem] leading-snug text-ink-2">{row.text}</p>
            </div>
          </div>
        </div>
      ))}
    </section>
  );
}
