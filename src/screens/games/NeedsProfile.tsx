import { useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bus, Check, GraduationCap, HeartPulse, HandHeart, Trees, type LucideIcon } from 'lucide-react';
import { INTERESTS, readInterests, saveInterests } from '../../data/quests';
import { BottomAction } from '../../ui/Flow';
import { reducedMotion } from '../../ui/exhibits/useEntrance';
import { GamePage, GameResult, finish, type GameProps, type Outcome } from './GameKit';
import './games.css';

const LOOK: Record<string, { icon: LucideIcon; color: string }> = {
  transport: { icon: Bus, color: 'var(--mgb-c1)' },
  education: { icon: GraduationCap, color: 'var(--mgb-c2)' },
  health: { icon: HeartPulse, color: 'var(--mgb-c4)' },
  social: { icon: HandHeart, color: 'var(--mgb-c3)' },
  city: { icon: Trees, color: '#1FA36B' },
};

// A resident's pass: every topic picked below flies onto it as a badge.
function Pass({ picked }: { picked: string[] }) {
  const reduce = reducedMotion();
  return (
    <div className="mgb-pass flex flex-col" aria-label={picked.length ? `На пропуске: ${picked.length} тем` : 'Пропуск пока пустой'} role="img">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="m-0 font-mono text-[0.6875rem] font-bold uppercase tracking-[0.14em] opacity-75">Пропуск горожанина</p>
          <p className="m-0 mt-1 text-[1.375rem] font-bold leading-tight tracking-[-0.03em] lg:text-[1.75rem]">Мои темы бюджета</p>
        </div>
        <span className="pass-chip" aria-hidden="true" />
      </div>
      <div className="mt-auto flex min-h-[4.5rem] flex-wrap content-end gap-1.5">
        <AnimatePresence initial={false}>
          {picked.length === 0 && (
            <motion.span key="empty" className="text-[0.875rem] opacity-70" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} exit={{ opacity: 0 }}>
              Выберите темы ниже — они появятся здесь
            </motion.span>
          )}
          {INTERESTS.filter((item) => picked.includes(item.id)).map((item) => {
            const { icon: Icon, color } = LOOK[item.id];
            return (
              <motion.span
                key={item.id}
                layout={!reduce}
                className="pass-slot"
                initial={reduce ? false : { opacity: 0, y: 40, scale: 0.6 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                transition={{ type: 'spring', stiffness: 420, damping: 26 }}
              >
                <i style={{ color }}>
                  <Icon size={13} strokeWidth={2.4} />
                </i>
                {item.label}
              </motion.span>
            );
          })}
        </AnimatePresence>
      </div>
      <p className="m-0 mt-3 flex justify-between font-mono text-[0.6875rem] tracking-[0.1em] opacity-70">
        <span>МОСГОРБЮДЖЕТ.ТРЕК</span>
        <span>{String(picked.length).padStart(2, '0')} / 05</span>
      </p>
    </div>
  );
}

export default function NeedsProfile(props: GameProps) {
  const [picked, setPicked] = useState<string[]>(readInterests);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const toggle = (id: string) => setPicked((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  const names = INTERESTS.filter((item) => picked.includes(item.id)).map((item) => item.label.toLowerCase());

  if (outcome) {
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title="Профиль сохранён"
        message={`Ваши темы: ${names.join(', ')}. Их видно в профиле, поменять можно здесь же.`}
        onRetry={() => setOutcome(null)}
        retryLabel="Изменить темы"
      />
    );
  }

  return (
    <GamePage
      item={props.item}
      onClose={props.onClose}
      headline="Соберите свой пропуск"
      task="Выберите темы бюджета, которые вам ближе всего. Можно несколько."
      note="Профиль хранится только в этом браузере. Вход через Mos ID — в плане городского пилота, сейчас он не подключён."
      side={
        <div className="hidden lg:block">
          <Pass picked={picked} />
        </div>
      }
    >
      <div className="mb-3 lg:hidden">
        <Pass picked={picked} />
      </div>
      <div role="group" aria-label="Темы" className="grid grid-cols-2 gap-2.5 lg:gap-3">
        {INTERESTS.map((item, i) => {
          const { icon: Icon, color } = LOOK[item.id];
          const on = picked.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(item.id)}
              className={`mgb-topic mgb-bare lg:min-h-[10rem] lg:px-5 lg:pb-5 lg:pt-[4.5rem] ${i === INTERESTS.length - 1 && INTERESTS.length % 2 ? 'col-span-2' : ''}`}
              style={{ '--c': color } as CSSProperties}
            >
              <span className="t-icon" aria-hidden="true">
                <Icon size={22} strokeWidth={2} />
              </span>
              <span className="t-tick" aria-hidden="true">
                {on && <Check size={14} strokeWidth={3.2} />}
              </span>
              <span className="t-title lg:text-[1.25rem]">{item.label}</span>
              <span className="t-text lg:text-[0.9375rem]">{item.text}</span>
            </button>
          );
        })}
      </div>

      <BottomAction
        label={picked.length === 0 ? 'Выберите хотя бы одну тему' : 'Сохранить профиль'}
        disabled={picked.length === 0}
        onClick={() => {
          saveInterests(picked);
          setOutcome(finish(props, true));
        }}
      />
    </GamePage>
  );
}
