import { useState } from 'react';
import { cn } from '../../lib/utils';
import { BottomAction } from '../../ui/Flow';
import Stamp from '../../ui/exhibits/Stamp';
import { GamePage, GameResult, finish, type GameProps, type Outcome } from './GameKit';
import './games.css';

// Three payment orders on paper. The one without an acceptance act and a commission decision is the one to return.
// Companies and numbers are made up for the exercise.
const ORDERS = [
  {
    no: '0412',
    title: 'Субсидия на закупку станков',
    amount: '45 000 000 ₽',
    recipient: 'ООО «Мостехмаш»',
    basis: 'Договор № 41-Ф',
    purpose: 'Станки лазерной резки отечественного производства',
    signed: 0,
    valid: true,
    details: 'Целевая поддержка московского производства: акт приёмки и решение комиссии на месте.',
  },
  {
    no: '0413',
    title: 'Компенсация процентов по кредиту',
    amount: '12 000 000 ₽',
    recipient: 'ООО «Текстиль-Модерн»',
    basis: 'Кредитный договор № 7/26',
    purpose: 'Проценты по займу на переоснащение цехов',
    signed: 1,
    valid: true,
    details: 'Обычная мера поддержки малого и среднего бизнеса: деньги идут по назначению через профильный департамент.',
  },
  {
    no: '0414',
    title: 'Возмещение стоимости оборудования',
    amount: '80 000 000 ₽',
    recipient: 'ООО «Техно-Пул»',
    basis: 'Договор № 17-С',
    purpose: 'Промышленное оборудование для нового цеха',
    signed: -1,
    valid: false,
    details:
      'Нет акта приёмки и решения комиссии — расход не подтверждён. Заявку возвращают на доработку: это не обвинение получателя, а проверка документов до выплаты.',
  },
];

const RIGHT = ORDERS.findIndex((order) => !order.valid);

// Hand signatures, one per order, drawn once.
const SIGNATURES = [
  'M6 30 C14 8 22 8 20 26 S30 34 36 18 S44 6 48 24 S58 32 66 14 S80 18 92 22',
  'M6 26 C12 12 18 34 26 18 S36 6 40 22 C44 34 52 10 60 20 S74 30 94 16',
];

function Signature({ which }: { which: number }) {
  return (
    <svg viewBox="0 0 100 40" aria-hidden="true" className="o-ink">
      <path d={SIGNATURES[which]} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SmallSeal() {
  return (
    <svg viewBox="0 0 60 60" aria-hidden="true" className="o-ink" style={{ transform: 'rotate(-10deg)' }}>
      <g fill="none" stroke="currentColor" opacity="0.85">
        <circle cx="30" cy="30" r="26" strokeWidth="2.4" />
        <circle cx="30" cy="30" r="19" strokeWidth="1.2" />
      </g>
      <text x="30" y="33.5" textAnchor="middle" fontSize="7.4" fontWeight="800" fill="currentColor" opacity="0.9" letterSpacing="0.3" fontFamily="var(--font-sans)">
        ОДОБРЕНО
      </text>
    </svg>
  );
}

export default function Auditor(props: GameProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  const restart = () => {
    setPicked(null);
    setChecked(false);
    setOutcome(null);
  };

  if (outcome) {
    return (
      <GameResult
        {...props}
        outcome={outcome}
        title={outcome.win ? 'Нарушение найдено' : 'Ордер был в порядке'}
        message={
          outcome.win
            ? ORDERS[RIGHT].details
            : `Проблема была в ордере № ${ORDERS[RIGHT].no}: ${ORDERS[RIGHT].details.charAt(0).toLowerCase()}${ORDERS[RIGHT].details.slice(1)}`
        }
        onRetry={restart}
        retryLabel={outcome.win ? 'Проверить ещё раз' : undefined}
      />
    );
  }

  return (
    <GamePage
      item={props.item}
      onClose={props.onClose}
      headline="Найдите ордер, который нельзя оплатить"
      task="В одном из трёх ордеров выплата не подтверждена документами. Проверьте нижнюю часть каждого бланка."
      note="Ответ даётся один раз. Компании и номера вымышленные."
      side={
        checked && picked !== null ? (
          <p aria-live="polite" className={cn('m-0 text-[1rem] font-semibold leading-snug lg:text-[1.125rem]', picked === RIGHT ? 'text-ok-ink' : 'text-accent')}>
            {picked === RIGHT ? 'Верно: в ордере нет акта приёмки и решения комиссии.' : `Не тот ордер — без документов № ${ORDERS[RIGHT].no}.`}
          </p>
        ) : undefined
      }
    >
      <div
        role="radiogroup"
        aria-label="Расходные ордера"
        className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 pt-1 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-4 lg:overflow-visible lg:px-0"
      >
        {ORDERS.map((order, i) => {
          const verdict = checked ? (i === RIGHT ? 'bad' : i === picked ? 'ok' : null) : null;
          return (
            <button
              key={order.no}
              type="button"
              role="radio"
              aria-checked={i === picked}
              onClick={() => !checked && setPicked(i)}
              className={cn('mgb-paper mgb-order w-[84%] shrink-0 snap-center sm:w-[60%] lg:w-auto', checked && 'cursor-default')}
            >
              <span className="o-num">
                <span>Ордер № {order.no}</span>
                <span>2026</span>
              </span>
              <span className="o-title">{order.title}</span>
              <span className="o-sum">{order.amount}</span>
              <dl>
                <div>
                  <dt>Получатель</dt>
                  <dd>{order.recipient}</dd>
                </div>
                <div>
                  <dt>Основание</dt>
                  <dd>{order.basis}</dd>
                </div>
                <div>
                  <dt>Назначение</dt>
                  <dd>{order.purpose}</dd>
                </div>
              </dl>
              <span className="o-checks">
                <span className="o-field">
                  Акт приёмки
                  <span className={cn('o-box', order.signed < 0 && 'is-empty')}>{order.signed < 0 ? 'НЕТ' : <Signature which={order.signed} />}</span>
                </span>
                <span className="o-field">
                  Решение комиссии
                  <span className={cn('o-box', !order.valid && 'is-empty')}>{order.valid ? <SmallSeal /> : 'НЕТ'}</span>
                </span>
              </span>
              {verdict && (
                <Stamp
                  word={verdict === 'bad' ? 'ВОЗВРАТ' : 'В ПОРЯДКЕ'}
                  sub={verdict === 'bad' ? 'НА ДОРАБОТКУ' : 'ПРОВЕРЕНО'}
                  tone={verdict === 'bad' ? 'bad' : 'ok'}
                  className="absolute left-1/2 top-[38%] -ml-[4.75rem] -mt-[4.75rem]"
                />
              )}
            </button>
          );
        })}
      </div>

      <BottomAction
        label={checked ? 'Показать итог' : picked === null ? 'Выберите ордер' : 'Вернуть на доработку'}
        disabled={picked === null}
        onClick={() => (checked ? setOutcome(finish(props, picked === RIGHT)) : setChecked(true))}
      />
    </GamePage>
  );
}
