import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { PILOT_POINTS_PER_ANSWER, getDailyQuiz, liveStreak, todayEntry, type CityRewardLedger } from '../../data/quests';
import { cn, plural } from '../../lib/utils';
import FlapBoard from './FlapBoard';
import { reducedMotion } from './useEntrance';

const NB = ' ';
const MAX_POINTS = 3 * PILOT_POINTS_PER_ANSWER;
const today = () =>
  new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', timeZone: 'Europe/Moscow' }).format(new Date()).toUpperCase();

// The board shows today's date, then what the quiz holds, one after another.
function useBoardText() {
  const messages = [today(), '3 ВОПРОСА', `ДО ${MAX_POINTS} БАЛЛОВ`];
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reducedMotion()) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setI((n) => n + 1);
    }, 4800);
    return () => window.clearInterval(timer);
  }, []);
  return messages[i % messages.length];
}

interface DailyQuizBoardProps {
  ledger: CityRewardLedger;
  onStart: () => void;
  className?: string;
}

// The quiz of the day is always a departures board: the date flips on it, today's first question is the headline.
export default function DailyQuizBoard({ ledger, onStart, className }: DailyQuizBoardProps) {
  const text = useBoardText();
  const done = todayEntry(ledger);
  const streak = liveStreak(ledger);
  const [question] = useState(() => getDailyQuiz().questions[0]?.question ?? 'Три вопроса о бюджете Москвы');

  return (
    <section className={cn('mgb-card mgb-board flex flex-col border-0 px-5 py-5 lg:px-7 lg:py-7', className)} aria-labelledby="daily-quiz-title">
      <div className="relative flex items-center justify-between gap-3">
        <span className="mgb-board-label text-[0.6875rem] lg:text-[0.75rem]">
          Квиз дня{streak > 0 && ` · серия ${streak} ${plural(streak, ['день', 'дня', 'дней'])}`}
        </span>
        <span className="flex gap-1.5" aria-label={done ? `Сегодня ${done.correctAnswers} из 3 верных` : 'Сегодня ещё не пройден'}>
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn('size-2 rounded-full', done && i < done.correctAnswers ? 'bg-[#FFB547]' : 'bg-[rgba(243,239,230,0.2)]')} />
          ))}
        </span>
      </div>
      <div className="relative mt-4 [container-type:inline-size] lg:mt-5">
        <FlapBoard
          rows={[text]}
          cols={12}
          amber={[0]}
          label={`Табло: ${today().toLowerCase()}, 3 вопроса, до ${MAX_POINTS} баллов`}
          className="[--cw:min(2.125rem,calc(100cqw/13.1))]"
        />
      </div>
      <p className="relative m-0 mt-5 text-[0.8125rem] font-medium text-[rgba(243,239,230,0.68)] lg:mt-6 lg:text-[0.875rem]">Первый вопрос</p>
      <h2
        id="daily-quiz-title"
        className="relative m-0 mt-1 text-[1.25rem] font-bold leading-[1.2] tracking-[-0.025em] text-[#F7F4EE] [text-wrap:pretty] lg:text-[1.5rem]"
      >
        {question}
      </h2>
      <p className="relative m-0 mt-2 text-[0.875rem] leading-snug text-[rgba(243,239,230,0.76)] lg:text-[0.9375rem]">
        {done
          ? `Сегодня ${done.correctAnswers} из 3 верных${done.points > 0 ? ` · +${done.points}${NB}${plural(done.points, ['балл', 'балла', 'баллов'])}` : ''}`
          : `3 вопроса · ${PILOT_POINTS_PER_ANSWER}${NB}баллов за верный ответ`}
      </p>
      <span aria-hidden="true" className="block h-5 lg:h-auto lg:min-h-6 lg:flex-1" />
      <button
        type="button"
        onClick={onStart}
        className="mgb-board-btn relative inline-flex h-12 items-center justify-center gap-2 self-start rounded-[0.875rem] px-6 text-[0.9375rem] lg:h-[3.25rem]"
      >
        {done ? 'Ещё раз' : 'Ответить'}
        <ArrowRight size={18} aria-hidden="true" />
      </button>
    </section>
  );
}
