import { Fragment, useState } from 'react';
import { BottomAction } from '../../ui/Flow';
import { Choice, GamePage, GameResult, Task, finish, type GameProps, type Outcome } from './GameKit';

const OPTIONS = [
  {
    title: 'Технопарк «Строгино»',
    text: 'Новые ИТ-производства и субсидии на закупку робототехники.',
    right: true,
    why: 'Город поддерживает технопарки и высокотехнологичные производства: это рабочие места с высокой квалификацией и новые технологии для Москвы.',
  },
  {
    title: 'Розничная и оптовая торговля',
    text: 'Обычные коммерческие рынки и торговые центры.',
    right: false,
    why: 'Торговля развивается в основном за счёт частных денег, поэтому в программах поддержки технологий у неё низкий приоритет.',
  },
];

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
    <GamePage item={props.item} onClose={props.onClose}>
      <Task>
        В бюджете осталось свободное финансирование на развитие. Куда его направить, чтобы получить наибольший технологический эффект?
      </Task>

      <div role="radiogroup" aria-label="Куда вложить" className="grid gap-2.5">
        {OPTIONS.map((option, i) => (
          <Fragment key={option.title}>
            <Choice checked={picked === i} onClick={() => setPicked(i)} title={option.title} text={option.text} />
          </Fragment>
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
