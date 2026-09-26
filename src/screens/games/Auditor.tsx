import { Fragment, useState } from 'react';
import { BottomAction } from '../../ui/Flow';
import { Choice, GamePage, GameResult, Task, finish, type GameProps, type Outcome } from './GameKit';

const ORDERS = [
  {
    title: 'Субсидия на закупку станков',
    amount: '45 млн ₽',
    who: 'Получатель: завод «Мостехмаш». Станки лазерной резки отечественного производства, договор № 41-Ф.',
    valid: true,
    details: 'Целевая поддержка московского производства: соответствует программе импортозамещения, документы на месте.',
  },
  {
    title: 'Компенсация процентов по кредиту на модернизацию',
    amount: '12 млн ₽',
    who: 'Получатель: фабрика «Трёхгорная». Проценты по займу на переоснащение цехов.',
    valid: true,
    details: 'Обычная мера поддержки малого и среднего бизнеса: деньги идут по назначению через профильный департамент.',
  },
  {
    title: 'Возмещение стоимости оборудования до приёмки',
    amount: '80 млн ₽',
    who: 'Получатель: «Техно-Пул». Есть договор, но нет актов приёмки, подтверждения расходов и решения комиссии.',
    valid: false,
    details:
      'Расход не подтверждён: до выплаты субсидии нужны документы по порядку отбора и соглашению. Заявку возвращают на доработку — это не обвинение получателя, а проверка.',
  },
];

const RIGHT = ORDERS.findIndex((order) => !order.valid);

export default function Auditor(props: GameProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const answered = picked !== null;

  const restart = () => {
    setPicked(null);
    setOutcome(null);
  };

  if (outcome) {
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title={outcome.win ? 'Нарушение найдено' : 'Ордер в порядке'}
        message={
          outcome.win
            ? ORDERS[RIGHT].details
            : `Выбранный ордер оформлен правильно. Проблема была в ордере «${ORDERS[RIGHT].title}»: ${ORDERS[RIGHT].details.charAt(0).toLowerCase()}${ORDERS[RIGHT].details.slice(1)}`
        }
        onRetry={restart}
        retryLabel={outcome.win ? 'Проверить ещё раз' : undefined}
      />
    );
  }

  return (
    <GamePage item={props.item} onClose={props.onClose}>
      <Task note="Один ордер оформлен с ошибкой. Ответ можно дать один раз.">
        Проверьте три расходных ордера и найдите тот, где выплата пока не подтверждена документами.
      </Task>

      <div role="radiogroup" aria-label="Расходные ордера" className="grid gap-2.5">
        {ORDERS.map((order, i) => {
          const isRight = answered && i === RIGHT;
          const isMine = answered && i === picked;
          return (
            <Fragment key={order.title}>
              <Choice
                checked={i === picked}
                onClick={() => setPicked(i)}
                locked={answered}
                title={order.title}
                tone={isRight ? 'ok' : isMine ? 'bad' : null}
                tag={isRight ? 'нарушение' : isMine ? 'ваш выбор' : undefined}
                text={
                  <>
                    <b className="font-semibold text-ink">{order.amount}</b> · {order.who}
                  </>
                }
              >
                {(isRight || isMine) && <span className="mt-1 border-t border-line pt-2 text-[0.875rem] leading-[1.45] text-ink">{order.details}</span>}
              </Choice>
            </Fragment>
          );
        })}
      </div>

      <BottomAction
        label={answered ? 'Показать итог' : 'Выберите ордер'}
        disabled={!answered}
        onClick={() => setOutcome(finish(props, picked === RIGHT))}
      />
    </GamePage>
  );
}
