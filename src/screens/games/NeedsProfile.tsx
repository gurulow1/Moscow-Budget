import { Fragment, useState } from 'react';
import { INTERESTS, readInterests, saveInterests } from '../../data/quests';
import { BottomAction } from '../../ui/Flow';
import { Choice, GamePage, GameResult, Task, finish, type GameProps, type Outcome } from './GameKit';

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
    <GamePage item={props.item} onClose={props.onClose}>
      <Task note="Профиль хранится только в этом браузере. Вход через Mos ID — в плане городского пилота, сейчас он не подключён.">
        Выберите темы бюджета, которые вам ближе всего. Можно несколько.
      </Task>

      <div role="group" aria-label="Темы" className="grid gap-2.5">
        {INTERESTS.map((item) => (
          <Fragment key={item.id}>
            <Choice kind="checkbox" checked={picked.includes(item.id)} onClick={() => toggle(item.id)} title={item.label} text={item.text} />
          </Fragment>
        ))}
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
