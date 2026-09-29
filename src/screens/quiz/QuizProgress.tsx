import { cn } from '../../lib/utils';

export type StepState = 'empty' | 'current' | 'right' | 'wrong';

// The quiz's progress as segments, one per question: green for a right answer, red for a wrong one.
export default function QuizProgress({ states }: { states: StepState[] }) {
  const right = states.filter((state) => state === 'right').length;
  return (
    <div role="img" aria-label={`Верных ответов: ${right}`} className="flex min-w-0 flex-1 gap-1.5">
      {states.map((state, i) => (
        <span key={i} className={cn('mgb-qstep', `is-${state}`)} />
      ))}
    </div>
  );
}
