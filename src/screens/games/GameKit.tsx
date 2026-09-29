import { useEffect, useRef, type ReactNode } from 'react';
import type { QuestItem } from '../../data/quests';
import { cn } from '../../lib/utils';
import { Divider, FlowPage, FlowTop, ListRow, Mark, PrimaryButton, SecondaryButton } from '../../ui/Flow';
import Stamp from '../../ui/exhibits/Stamp';

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

interface GamePageProps {
  item: QuestItem;
  onClose: () => void;
  /** The task in a few words, set big like the start screen's headline. */
  headline: ReactNode;
  task?: ReactNode;
  note?: ReactNode;
  /** Status under the task on a wide screen, under the object on a phone. */
  side?: ReactNode;
  /** On a phone, put the status above the object, where the bottom button cannot cover it. */
  sideFirst?: boolean;
  step?: string;
  /** The game's object. */
  children: ReactNode;
}

// Every game has one object to play with. Phone: the task, the object, the status. Wide screen, like the start
// screen: the words on the left, the object on the right.
export function GamePage({ item, onClose, headline, task, note, side, sideFirst, step, children }: GamePageProps) {
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);
  return (
    <FlowPage className="lg:max-w-[76rem]">
      <FlowTop icon="close" label="Закрыть игру" onPress={onClose} title={item.title} step={step} />
      <div
        className={cn(
          'mt-4 grid flex-1 lg:mt-10',
          sideFirst ? "grid-rows-[auto_auto_1fr] [grid-template-areas:'t'_'s'_'o']" : "grid-rows-[auto_1fr_auto] [grid-template-areas:'t'_'o'_'s']",
          "lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:grid-rows-[auto_1fr] lg:gap-x-16 lg:[grid-template-areas:'t_o'_'s_o']",
        )}
      >
        <div className="[grid-area:t]">
          <p className="m-0 text-[0.875rem] font-bold text-ink-2 lg:text-[1rem]">Задание</p>
          <h2 className="m-0 mt-1.5 text-[1.625rem] font-bold leading-[1.12] tracking-[-0.03em] [text-wrap:balance] lg:mt-3 lg:text-[2.625rem] lg:leading-[1.05] lg:tracking-[-0.04em]">
            {headline}
          </h2>
          {task && <p className="m-0 mt-2 text-[1rem] leading-[1.45] text-ink-2 [text-wrap:pretty] lg:mt-4 lg:text-[1.125rem]">{task}</p>}
          {note && <p className="m-0 mt-2 text-[0.8125rem] leading-snug text-ink-3 lg:text-[0.875rem]">{note}</p>}
        </div>
        <div className="mt-5 min-w-0 [grid-area:o] lg:mt-0">{children}</div>
        {side && <div className="mt-4 min-w-0 [grid-area:s] lg:mt-8">{side}</div>}
      </div>
    </FlowPage>
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
    <FlowPage className="pb-[calc(2rem_+_env(safe-area-inset-bottom))] lg:max-w-[68rem]">
      <FlowTop ref={titleRef} icon="close" label="Закрыть итог" onPress={onClose} title="Итог игры" />
      <div className="mt-[1.125rem] grid gap-3 lg:mt-10 lg:grid-cols-2 lg:items-start lg:gap-8">
        {/* The verdict on paper, stamped. */}
        {/* The stamp has its own row under the words, so a long verdict never runs under it. */}
        <section className="mgb-paper px-6 pb-4 pt-6 lg:px-8 lg:pb-6 lg:pt-8" aria-label="Итог">
          <p className="mgb-paper-head m-0">Итог · {item.title}</p>
          <h2 className="m-0 mt-3 text-[1.875rem] font-bold leading-[1.1] tracking-[-0.03em] lg:text-[2.375rem]">{title}</h2>
          <div className="mt-3 text-[0.9375rem] leading-[1.5] text-[#4E5462] [text-wrap:pretty] lg:text-[1.0625rem]">{message}</div>
          <div className="mt-2 flex justify-end">
            <Stamp
              word={outcome.win ? 'ЗАСЧИТАНО' : 'ДОРАБОТАТЬ'}
              sub={outcome.win ? 'УЧЕБНЫЙ ЗАЧЁТ' : 'ЕЩЁ ОДНА ПОПЫТКА'}
              tone={outcome.win ? 'ok' : 'bad'}
              className="shrink-0"
            />
          </div>
        </section>

        <div className="grid gap-3">
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
