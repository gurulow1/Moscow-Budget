import { Fragment, useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowRight, ArrowUp, Compass, RotateCcw } from 'lucide-react';
import { cn, getPreferredScrollBehavior, safeLocalStorage } from '../lib/utils';
import { ACTION_LINKS, SUGGESTIONS, TOUR_STEMS, answer, type HelperAction, type HelperActionId } from '../lib/helperAnswers';
import Sheet from '../ui/Sheet';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  action?: HelperAction;
  /** ai — the language model answered; rules — a ready answer from the reference (the AI was unavailable) */
  source?: 'ai' | 'rules';
}

const HISTORY_KEY = 'mos_ai_drawer_history';

const nowTime = () => new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const welcome = (): Message => ({
  id: 'welcome',
  sender: 'ai',
  text: 'Здравствуйте! Я ИИ-помощник по бюджету Москвы: объясню цифры, городские программы и налоговый вычет. Отвечаю только на эти темы и могу ошибаться — важное проверяйте на budget.mos.ru и nalog.gov.ru.',
  timestamp: nowTime(),
});

function readHistory(): Message[] {
  const raw = safeLocalStorage.getItem(HISTORY_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        parsed.every(
          (item) =>
            typeof item === 'object' &&
            item !== null &&
            typeof item.id === 'string' &&
            (item.sender === 'ai' || item.sender === 'user') &&
            typeof item.text === 'string' &&
            typeof item.timestamp === 'string',
        )
      ) {
        return parsed as Message[];
      }
    } catch {
      // A broken history starts over.
    }
  }
  return [welcome()];
}

type Reply = Pick<Message, 'text' | 'action' | 'source'>;

// The server keeps the OpenRouter key and screens questions; without it the helper falls back to ready answers.
async function fetchReply(history: Message[], query: string): Promise<Reply> {
  const messages = history
    .filter((message) => message.id !== 'welcome')
    .slice(-8)
    .map((message) => ({ role: message.sender === 'user' ? 'user' : 'assistant', content: message.text }));
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
      signal: controller.signal,
    });
    const data = (await response.json().catch(() => null)) as { reply?: string; action?: HelperActionId | null } | null;
    if (response.ok && data?.reply) {
      return { text: data.reply, action: data.action ? ACTION_LINKS[data.action] : undefined, source: 'ai' };
    }
    if (response.status === 429) {
      return { text: 'Слишком много вопросов подряд. Подождите минуту и спросите снова.', source: 'rules' };
    }
  } catch {
    // Offline or timed out: answer from the reference below.
  } finally {
    window.clearTimeout(timer);
  }
  const local = answer(query);
  return { text: local.text, action: local.action, source: 'rules' };
}

// **words** in an answer are follow-up questions: tapping one asks about it. Bold figures are just emphasis.
function RichText({ text, onAsk }: { text: string; onAsk?: (query: string) => void }) {
  return (
    <>
      {text.split('**').map((part, i) =>
        i % 2 === 1 && (!onAsk || /\d/.test(part)) ? (
          <b key={i} className="font-semibold">
            {part}
          </b>
        ) : i % 2 === 1 ? (
          <button
            key={i}
            type="button"
            onClick={() => onAsk?.(part)}
            className="inline font-semibold text-ink underline decoration-ink-3 decoration-dotted underline-offset-[3px]"
          >
            {part}
          </button>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

// The budget helper: opened by the header button (the 'open_mos_ai_chat' event), optionally with a first question.
export default function HelperChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(readHistory);
  const [input, setInput] = useState('');
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const pendingRef = useRef(false);

  useEffect(() => {
    safeLocalStorage.setItem(HISTORY_KEY, JSON.stringify(messages));
  }, [messages]);

  // A new answer is shown from its first line; a question or the typing dots keep the end in view.
  const lastRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const last = messagesRef.current.at(-1);
    const target = last?.sender === 'ai' && messagesRef.current.length > 1 && !pending ? lastRef.current : endRef.current;
    target?.scrollIntoView({ behavior: getPreferredScrollBehavior(), block: target === endRef.current ? 'end' : 'start' });
  }, [messages, open, pending]);

  const close = useCallback(() => setOpen(false), []);

  const ask = useCallback(async (raw: string) => {
    const query = raw.trim();
    if (!query || pendingRef.current) return;
    if (TOUR_STEMS.some((stem) => query.toLowerCase().includes(stem))) {
      setOpen(false);
      window.dispatchEvent(new CustomEvent('start_mos_onboarding'));
      return;
    }
    const stamp = Date.now();
    const history: Message[] = [...messagesRef.current, { id: `u-${stamp}`, sender: 'user', text: query, timestamp: nowTime() }];
    setMessages(history);
    pendingRef.current = true;
    setPending(true);
    const reply = await fetchReply(history, query);
    setMessages((prev) => [...prev, { id: `a-${stamp}`, sender: 'ai', timestamp: nowTime(), ...reply }]);
    pendingRef.current = false;
    setPending(false);
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ initialQuery?: string } | undefined>).detail;
      setOpen(true);
      if (detail?.initialQuery) ask(detail.initialQuery);
    };
    window.addEventListener('open_mos_ai_chat', handler);
    return () => window.removeEventListener('open_mos_ai_chat', handler);
  }, [ask]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending || !input.trim()) return;
    ask(input);
    setInput('');
  };

  const fresh = messages.length <= 1;

  return (
    <Sheet
      open={open}
      onClose={close}
      fill
      title="Помощник"
      subtitle="ИИ по открытым данным · может ошибаться"
      actions={
        <>
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new CustomEvent('start_mos_onboarding'));
            }}
            aria-label="Экскурсия с Фини"
            className="mgb-glass grid size-11 shrink-0 place-items-center rounded-full text-ink"
          >
            <Compass size={18} strokeWidth={2} aria-hidden="true" />
          </button>
          {!fresh && (
            <button
              type="button"
              onClick={() => setMessages([welcome()])}
              aria-label="Очистить диалог"
              className="mgb-glass grid size-11 shrink-0 place-items-center rounded-full text-ink"
            >
              <RotateCcw size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </>
      }
    >
      <div role="log" aria-live="polite" aria-label="Диалог" className="-mx-4 flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-3">
        {messages.map((message, index) => {
          const mine = message.sender === 'user';
          return (
            <div
              key={message.id}
              ref={index === messages.length - 1 ? lastRef : undefined}
              className={cn('flex max-w-[88%] scroll-mt-2 flex-col gap-1', mine ? 'items-end self-end' : 'items-start self-start')}
            >
              <div
                className={cn(
                  'whitespace-pre-line break-words px-4 py-3 text-[0.9375rem] leading-[1.5]',
                  mine
                    ? 'rounded-[1.25rem] rounded-br-md bg-accent-fill text-white'
                    : 'rounded-[1.25rem] rounded-bl-md border border-line bg-card text-ink shadow-[var(--mgb-shadow)]',
                )}
              >
                {mine ? message.text : <RichText text={message.text} onAsk={message.source === 'ai' ? undefined : ask} />}
                {message.action && (
                  <a
                    href={message.action.href}
                    onClick={close}
                    className="mt-2.5 flex h-10 items-center justify-center gap-1.5 rounded-full bg-accent-soft px-4 text-[0.875rem] font-semibold text-accent no-underline"
                  >
                    {message.action.label}
                    <ArrowRight size={16} aria-hidden="true" />
                  </a>
                )}
              </div>
              <span className="px-1 text-[0.6875rem] text-ink-3">
                {message.timestamp}
                {message.source === 'rules' && ' · ответ из справочника'}
              </span>
            </div>
          );
        })}

        {pending && (
          <div className="flex items-center gap-1.5 self-start rounded-[1.25rem] rounded-bl-md border border-line bg-card px-4 py-3.5 shadow-[var(--mgb-shadow)]">
            <span className="sr-only">Помощник отвечает…</span>
            {[0, 150, 300].map((delay) => (
              <span key={delay} aria-hidden="true" className="size-2 animate-bounce rounded-full bg-ink-3" style={{ animationDelay: `${delay}ms` }} />
            ))}
          </div>
        )}

        {fresh && (
          <div className="grid gap-2" role="group" aria-label="Частые вопросы">
            {SUGGESTIONS.slice(0, 4).map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => ask(question)}
                className="flex min-h-12 items-center justify-between gap-2 rounded-2xl border border-line bg-card px-4 py-2.5 text-left text-[0.9375rem] font-semibold text-ink shadow-[var(--mgb-shadow)]"
              >
                {question}
                <ArrowRight size={16} aria-hidden="true" className="shrink-0 text-ink-3" />
              </button>
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="-mx-4 shrink-0 border-t border-line pt-2.5">
        {!fresh && (
          <div role="group" aria-label="Подсказки" className="mgb-scroll-x flex gap-2 px-4 pb-2.5">
            {SUGGESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => ask(question)}
                disabled={pending}
                className="h-9 shrink-0 whitespace-nowrap rounded-full bg-track px-3.5 text-[0.8125rem] font-semibold text-ink-2"
              >
                {question}
              </button>
            ))}
          </div>
        )}
        <form onSubmit={submit} className="flex items-center gap-2 px-4">
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Спросите о бюджете Москвы"
            aria-label="Ваш вопрос"
            enterKeyHint="send"
            maxLength={600}
            className="h-12 min-w-0 flex-1 rounded-full border border-line bg-card px-4 text-[1rem] text-ink outline-none placeholder:text-ink-3 focus:border-accent"
          />
          <button
            type="submit"
            aria-label="Отправить"
            disabled={!input.trim() || pending}
            className={cn(
              'grid size-12 shrink-0 place-items-center rounded-full transition-colors duration-200',
              input.trim() && !pending ? 'bg-accent-fill text-white' : 'bg-track text-ink-3',
            )}
          >
            <ArrowUp size={20} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </form>
      </div>
    </Sheet>
  );
}
