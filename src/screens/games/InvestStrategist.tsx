import { useState } from 'react';
import { Check } from 'lucide-react';
import { BottomAction } from '../../ui/Flow';
import { GamePage, GameResult, finish, type GameProps, type Outcome } from './GameKit';
import './games.css';

const OPTIONS = [
  {
    kind: 'tech',
    kicker: 'Вариант А',
    title: 'Технопарк',
    text: 'Новые ИТ-производства и субсидии на закупку робототехники.',
    right: true,
    why: 'Город поддерживает технопарки и высокотехнологичные производства: это рабочие места с высокой квалификацией и новые технологии для Москвы.',
  },
  {
    kind: 'trade',
    kicker: 'Вариант Б',
    title: 'Розничная и оптовая торговля',
    text: 'Обычные коммерческие рынки и торговые центры.',
    right: false,
    why: 'Торговля развивается в основном за счёт частных денег, поэтому в программах поддержки технологий у неё низкий приоритет.',
  },
] as const;

// Two posters share the screen; the chosen one takes most of it.
export default function InvestStrategist(props: GameProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  if (outcome && picked !== null) {
    const choice = OPTIONS[picked];
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title={outcome.win ? 'Верный приоритет' : 'Слабый приоритет'}
        message={choice.why}
        onRetry={() => {
          setPicked(null);
          setOutcome(null);
        }}
      />
    );
  }

  return (
    <GamePage
      item={props.item}
      onClose={props.onClose}
      headline="Куда вложить свободные деньги?"
      task="В бюджете осталось финансирование на развитие. Выберите, где оно даст наибольший технологический эффект."
      note="Учебный сценарий, суммы не указаны."
    >
      <div role="radiogroup" aria-label="Куда вложить" className="mgb-posters">
        {OPTIONS.map((option, i) => (
          <button
            key={option.kind}
            type="button"
            role="radio"
            aria-checked={picked === i}
            onClick={() => setPicked(i)}
            className={`mgb-poster is-${option.kind}`}
          >
            <span aria-hidden="true" className="p-check">
              {picked === i && <Check size={18} strokeWidth={3} />}
            </span>
            <span className="p-kicker">{option.kicker}</span>
            <span className="p-title">{option.title}</span>
            <span className="p-text">{option.text}</span>
          </button>
        ))}
      </div>

      <BottomAction
        label={picked === null ? 'Выберите вариант' : 'Утвердить выбор'}
        disabled={picked === null}
        onClick={() => picked !== null && setOutcome(finish(props, OPTIONS[picked].right))}
      />
    </GamePage>
  );
}
