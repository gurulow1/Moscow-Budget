import { Fragment, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { BUDGET_FACTS } from '../../data/budgetFacts';
import { sourceLink } from '../../data/quests';
import { cn } from '../../lib/utils';
import { BottomAction } from '../../ui/Flow';
import { Choice, GamePage, GameResult, Task, finish, type GameProps, type Outcome } from './GameKit';

const bn = (value: number) => `${value.toLocaleString('ru-RU', { maximumFractionDigits: 1 })}\u00A0млрд\u00A0₽`;

const SECTIONS = [
  {
    id: 'health',
    title: 'Здравоохранение',
    color: 'var(--mgb-c4)',
    text: `На развитие здравоохранения в 2026 году предусмотрено ${bn(BUDGET_FACTS.healthcare.amountBillion)} — без учёта оплаты медицинской помощи из Фонда ОМС. Это поликлиники, больницы и цифровая медицина (ЕМИАС).`,
  },
  {
    id: 'transport',
    title: 'Транспорт',
    color: 'var(--mgb-c1)',
    text: `Развитие транспортной системы — ${bn(BUDGET_FACTS.transport.amountBillion)}. Строятся и продлеваются линии метро, город закупает электробусы и трамваи, развивает МЦД.`,
  },
  {
    id: 'education',
    title: 'Образование',
    color: 'var(--mgb-c2)',
    text: `Развитие образования — ${bn(BUDGET_FACTS.education.amountBillion)}. Школы переходят на единый московский стандарт, работает «Московская электронная школа» (МЭШ).`,
  },
];

const QUESTION = {
  text: 'Какая программа получит больше всего денег в 2026 году?',
  options: [
    { label: 'Развитие транспортной системы', amount: BUDGET_FACTS.transport.amountBillion },
    { label: 'Развитие городской среды', amount: BUDGET_FACTS.urbanEnvironment.amountBillion },
    { label: 'Спорт Москвы', amount: BUDGET_FACTS.sport.amountBillion },
  ],
  right: 0,
};

export default function AnalyticSurfing(props: GameProps) {
  const [open, setOpen] = useState<string | null>(null);
  const [read, setRead] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const allRead = read.length === SECTIONS.length;
  const source = sourceLink('openBudget2026');

  const toggle = (id: string) => {
    setOpen(open === id ? null : id);
    if (!read.includes(id)) setRead([...read, id]);
  };

  if (outcome) {
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title={outcome.win ? 'Верно' : 'Неверно'}
        message={`Транспорт — крупнейшая программа бюджета: ${bn(BUDGET_FACTS.transport.amountBillion)}. Городская среда — ${bn(BUDGET_FACTS.urbanEnvironment.amountBillion)}, спорт — ${bn(BUDGET_FACTS.sport.amountBillion)}.`}
        onRetry={() => {
          setPicked(null);
          setOutcome(null);
        }}
        retryLabel={outcome.win ? 'Ответить ещё раз' : undefined}
      />
    );
  }

  if (asking) {
    return (
      <GamePage item={props.item} onClose={props.onClose}>
        <section className="mgb-card px-5 py-[1.125rem]" aria-labelledby="surf-question">
          <p className="m-0 text-[0.875rem] text-ink-2">Контрольный вопрос</p>
          <h2 id="surf-question" className="m-0 mt-1 text-[1.375rem] font-bold leading-tight tracking-[-0.02em]">
            {QUESTION.text}
          </h2>
        </section>
        <div role="radiogroup" aria-label="Варианты ответа" className="grid gap-2.5">
          {QUESTION.options.map((option, i) => (
            <Fragment key={option.label}>
              <Choice checked={picked === i} onClick={() => setPicked(i)} title={option.label} />
            </Fragment>
          ))}
        </div>
        <a href={source.url} target="_blank" rel="noopener noreferrer" className="px-2 text-[0.8125rem] text-ink-3 underline underline-offset-[3px]">
          {source.label} · проверено {source.checked} ↗
        </a>
        <BottomAction
          label={picked === null ? 'Выберите ответ' : 'Проверить'}
          disabled={picked === null}
          onClick={() => setOutcome(finish(props, picked === QUESTION.right))}
        />
      </GamePage>
    );
  }

  return (
    <GamePage item={props.item} onClose={props.onClose}>
      <Task note={`Прочитано ${read.length} из ${SECTIONS.length}`}>
        Откройте и прочитайте три раздела о крупных направлениях бюджета. Потом ответьте на один вопрос.
      </Task>

      <section className="mgb-card" aria-label="Разделы">
        {SECTIONS.map((section, i) => {
          const isOpen = open === section.id;
          const isRead = read.includes(section.id);
          return (
            <div key={section.id}>
              {i > 0 && <div aria-hidden="true" className="mx-5 h-px bg-line" />}
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => toggle(section.id)}
                className="flex min-h-[3.75rem] w-full items-center gap-3 px-5 py-3 text-left text-ink"
              >
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ background: section.color }} />
                <span className="flex-1 text-[1rem] font-semibold">{section.title}</span>
                {isRead && (
                  <span className="grid size-6 place-items-center rounded-full bg-ok-soft text-ok-ink">
                    <Check size={13} strokeWidth={3} aria-hidden="true" />
                    <span className="sr-only">прочитано</span>
                  </span>
                )}
                <ChevronDown size={18} aria-hidden="true" className={cn('shrink-0 text-ink-3 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && <p className="m-0 px-5 pb-4 text-[0.9375rem] leading-[1.5] text-ink-2 [text-wrap:pretty]">{section.text}</p>}
            </div>
          );
        })}
      </section>

      <BottomAction label={allRead ? 'К вопросу' : 'Прочитайте все разделы'} disabled={!allRead} onClick={() => setAsking(true)} />
    </GamePage>
  );
}
