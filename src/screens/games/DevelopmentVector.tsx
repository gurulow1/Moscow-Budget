import { Fragment, useState } from 'react';
import { BottomAction } from '../../ui/Flow';
import { Choice, GamePage, GameResult, Review, Task, finish, type GameProps, type Outcome } from './GameKit';

// Three conditions match the city's industrial support, two are the distractors from the «промышленность» quiz.
const CONDITIONS = [
  {
    title: 'Модернизация цехов и станков',
    text: 'Роботизация и переход с импортных станков с ЧПУ на отечественные.',
    right: true,
    why: 'Главная цель промышленных субсидий Москвы — обновить производство и заменить импортное оборудование.',
  },
  {
    title: 'Оплата рекламы за рубежом',
    text: 'Компенсация рекламных кампаний предприятия в других странах.',
    right: false,
    why: 'Реклама за рубежом не входит в цели промышленных субсидий города.',
  },
  {
    title: 'Новые высокотехнологичные рабочие места',
    text: 'Трудоустройство выпускников профильных московских вузов.',
    right: true,
    why: 'Город поддерживает производства, которые создают квалифицированные рабочие места.',
  },
  {
    title: 'Покрытие штрафов предприятия',
    text: 'Выплата штрафов за нарушения из бюджетных денег.',
    right: false,
    why: 'Штрафы — ответственность предприятия; бюджет их не компенсирует.',
  },
  {
    title: 'Снижение вредных выбросов',
    text: 'Системы очистки и фильтрации на заводах внутри МКАД.',
    right: true,
    why: 'Экологическая модернизация — одно из условий поддержки производств в городе.',
  },
];

const RIGHT_COUNT = CONDITIONS.filter((item) => item.right).length;

export default function DevelopmentVector(props: GameProps) {
  const [checked, setChecked] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const toggle = (i: number) => setChecked((current) => (current.includes(i) ? current.filter((item) => item !== i) : [...current, i]));
  const exact = CONDITIONS.every((item, i) => item.right === checked.includes(i));

  if (outcome) {
    const extra = CONDITIONS.filter((item, i) => !item.right && checked.includes(i)).length;
    const missed = CONDITIONS.filter((item, i) => item.right && !checked.includes(i)).length;
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title={outcome.win ? 'Вектор настроен' : 'Нужна доработка'}
        message={
          outcome.win
            ? 'Все три условия совпадают с целями промышленной поддержки Москвы.'
            : [extra > 0 && `лишних условий: ${extra}`, missed > 0 && `не хватает: ${missed}`].filter(Boolean).join(', ').replace(/^./, (c) => c.toUpperCase()) + '.'
        }
        onRetry={() => {
          setChecked([]);
          setOutcome(null);
        }}
      >
        <Review
          title="Разбор условий"
          rows={CONDITIONS.map((item, i) => ({
            ok: item.right === checked.includes(i),
            title: `${item.title} — ${item.right ? 'подходит' : 'не подходит'}`,
            text: item.why,
          }))}
        />
      </GameResult>
    );
  }

  return (
    <GamePage item={props.item} onClose={props.onClose}>
      <Task note={`Верных условий ${RIGHT_COUNT}.`}>Отметьте условия, при которых город даёт промышленному предприятию субсидию.</Task>

      <div role="group" aria-label="Условия субсидии" className="grid gap-2.5">
        {CONDITIONS.map((item, i) => (
          <Fragment key={item.title}>
            <Choice kind="checkbox" checked={checked.includes(i)} onClick={() => toggle(i)} title={item.title} text={item.text} />
          </Fragment>
        ))}
      </div>

      <BottomAction
        label={checked.length === 0 ? 'Отметьте условия' : `Утвердить · выбрано ${checked.length}`}
        disabled={checked.length === 0}
        onClick={() => setOutcome(finish(props, exact))}
      />
    </GamePage>
  );
}
