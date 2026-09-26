import { useState, type ReactNode } from 'react';
import { ChevronRight, Compass, Eye, Moon, RotateCcw } from 'lucide-react';
import Sheet from '../ui/Sheet';
import { cn, readStoredStringArray } from '../lib/utils';
import { getLevelInfo, QUIZ_IDS } from '../lib/progress';
import { INTERESTS, readInterests } from '../data/quests';

interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
  balance: number;
  totalXp: number;
  completedActivities: string[];
  isDark: boolean;
  onToggleTheme: () => void;
  onOpenAccessibility: () => void;
  onStartTour: () => void;
  onReset: () => void;
}

const ROW = 'flex min-h-[3.5rem] w-full items-center gap-3 px-5 py-3 text-left text-ink';
const DIVIDER = <div aria-hidden="true" className="mx-5 h-px bg-line" />;

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={ROW}>
      <span className="flex-1 text-[1rem] font-medium">{label}</span>
      <b className="text-[1.0625rem] font-bold">{value}</b>
    </div>
  );
}

export default function ProfileSheet({
  open,
  onClose,
  balance,
  totalXp,
  completedActivities,
  isDark,
  onToggleTheme,
  onOpenAccessibility,
  onStartTour,
  onReset,
}: ProfileSheetProps) {
  const [confirmingReset, setConfirmingReset] = useState(false);
  const level = getLevelInfo(totalXp);
  const solvedQuizzes = QUIZ_IDS.filter((id) => completedActivities.includes(id)).length;
  const districtBadges = open ? readStoredStringArray('mos_unlocked_nfts_v3').length : 0;
  const interests = open ? readInterests() : [];
  const close = () => {
    setConfirmingReset(false);
    onClose();
  };

  return (
    <Sheet open={open} title="Мой прогресс" onClose={close}>
      <div className="grid gap-3">
        <section className="mgb-card px-5 py-[1.125rem]" aria-label="Уровень">
          <p className="m-0 text-[0.875rem] text-ink-2">Уровень {level.level}</p>
          <p className="m-0 mt-0.5 text-[1.25rem] font-bold tracking-[-0.02em]">{level.title}</p>
          <div
            role="progressbar"
            aria-label="Прогресс уровня"
            aria-valuemin={level.min}
            aria-valuemax={level.nextLevelXp}
            aria-valuenow={Math.min(totalXp, level.nextLevelXp)}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-track"
          >
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, level.progress)}%` }} />
          </div>
          <p className="m-0 mt-2 text-[0.8125rem] text-ink-2">
            {level.level === 5 ? `${totalXp} баллов · высший уровень` : `${totalXp} из ${level.nextLevelXp} баллов до следующего уровня`}
          </p>
        </section>

        <section className="mgb-card" aria-label="Статистика">
          <Stat label="Учебные баллы" value={balance} />
          {DIVIDER}
          <Stat label="Викторины" value={`${solvedQuizzes} из ${QUIZ_IDS.length}`} />
          {DIVIDER}
          <Stat label="Знаки районов" value={`${districtBadges} из 5`} />
          {interests.length > 0 && (
            <>
              {DIVIDER}
              <div className={ROW}>
                <span className="flex-1 text-[1rem] font-medium">Мои темы</span>
                <span className="max-w-[60%] text-right text-[0.9375rem] leading-snug text-ink-2">
                  {INTERESTS.filter((item) => interests.includes(item.id))
                    .map((item) => item.label)
                    .join(', ')}
                </span>
              </div>
            </>
          )}
        </section>

        <section className="mgb-card" aria-label="Настройки">
          <button type="button" role="switch" aria-checked={isDark} onClick={onToggleTheme} className={ROW}>
            <Moon size={20} strokeWidth={1.8} aria-hidden="true" className="text-ink-2" />
            <span className="flex-1 text-[1rem] font-medium">Ночная тема</span>
            <span
              aria-hidden="true"
              className={cn(
                'relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200',
                isDark ? 'bg-accent-fill' : 'bg-track',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-6 rounded-full bg-white shadow transition-[left] duration-200',
                  isDark ? 'left-[1.375rem]' : 'left-0.5',
                )}
              />
            </span>
          </button>
          {DIVIDER}
          <button type="button" onClick={onOpenAccessibility} className={ROW}>
            <Eye size={20} strokeWidth={1.8} aria-hidden="true" className="text-ink-2" />
            <span className="flex-1 text-[1rem] font-medium">Версия для слабовидящих</span>
            <ChevronRight size={18} aria-hidden="true" className="text-ink-3" />
          </button>
          {DIVIDER}
          <button type="button" onClick={onStartTour} className={ROW}>
            <Compass size={20} strokeWidth={1.8} aria-hidden="true" className="text-ink-2" />
            <span className="flex-1 text-[1rem] font-medium">Экскурсия с Фини</span>
            <ChevronRight size={18} aria-hidden="true" className="text-ink-3" />
          </button>
        </section>

        {confirmingReset ? (
          <section className="mgb-card px-5 py-[1.125rem]" aria-label="Сброс прогресса">
            <p className="m-0 text-[0.9375rem] leading-snug text-ink">
              Удалить баллы, расчёт, пройденные задания и результаты тестов в этом браузере?
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmingReset(false)}
                className="h-12 rounded-full border border-line bg-card text-[1rem] font-semibold text-ink"
              >
                Отмена
              </button>
              <button type="button" onClick={onReset} className="h-12 rounded-full bg-accent-fill text-[1rem] font-semibold text-white">
                Сбросить
              </button>
            </div>
          </section>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingReset(true)}
            className="flex h-12 items-center justify-center gap-2 rounded-full text-[0.9375rem] font-semibold text-ink-2"
          >
            <RotateCcw size={17} aria-hidden="true" />
            Сбросить прогресс
          </button>
        )}

        <p className="m-0 px-2 text-[0.8125rem] leading-relaxed text-ink-2">
          Баллы учебные: они хранятся только в этом браузере и никуда не передаются.
        </p>
      </div>
    </Sheet>
  );
}
