import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Bot, X, User, Send } from 'lucide-react';
import { cn, getPreferredScrollBehavior, safeLocalStorage } from '../lib/utils';
import { BUDGET_FACTS, formatBudgetAmount } from '../data/budgetFacts';

interface BudgetAIChatDrawerProps {
  activeMobileTab: 'calc' | 'quests' | 'analytics';
  tourStep?: number | null;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
}

const WELCOME_TEXT = `Здравствуйте! Я помогу быстро разобраться в бюджете Москвы, городских программах и налоговых вычетах.

Что хотите узнать?`;

const nowTime = () =>
  new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

const makeWelcome = (): ChatMessage => ({
  id: 'welcome-drawer',
  sender: 'ai',
  text: WELCOME_TEXT,
  timestamp: nowTime(),
});

const generateResponse = (query: string): string => {
  const s = query.toLowerCase().trim();

  if (s.includes('викторин') || s.includes('тест') || s.includes('игра') || s.includes('вызов')) {
    return `Откройте раздел «Викторины», чтобы запустить квиз дня из проверенного банка вопросов. За правильные ответы начисляются баллы маршрута.`;
  }

  if (
    s.includes('доход') || s.includes('налог') || s.includes('ндфл') ||
    s.includes('прибыль') || s.includes('сбор') || s.includes('вычет') || s.includes('бюджет')
  ) {
    return `На 2026 год доходы Москвы запланированы в размере **${formatBudgetAmount(BUDGET_FACTS.income.amountBillion)}**, расходы — **${formatBudgetAmount(BUDGET_FACTS.expenses.amountBillion)}**, дефицит — **${formatBudgetAmount(BUDGET_FACTS.deficit.amountBillion)}**.

Общий лимит расходов для большинства социальных вычетов составляет **150 000 ₽**, а на обучение ребёнка — **110 000 ₽** на обоих родителей. Фактический возврат зависит от уплаченного НДФЛ. Источники: Закон Москвы № 39 и ФНС России.`;
  }

  if (
    s.includes('транспорт') || s.includes('метро') || s.includes('электробус') ||
    s.includes('дорог') || s.includes('мцд') || s.includes('бкл')
  ) {
    return `Развитие транспортной системы — одно из крупнейших направлений расходов Москвы. В аналитике оно показано округлённой долей около **20%**. Точные статьи и актуальное исполнение проверяйте на **budget.mos.ru**.`;
  }

  if (
    s.includes('социал') || s.includes('пенси') || s.includes('льгот') ||
    s.includes('выплат') || s.includes('семь') || s.includes('поддержк')
  ) {
    return `На социальную сферу Москвы в 2026 году предусмотрено около **${formatBudgetAmount(BUDGET_FACTS.socialSphere.amountBillion)}**, то есть примерно половина расходов. Программа социальной поддержки жителей составляет **${formatBudgetAmount(BUDGET_FACTS.socialSupport.amountBillion)}**. Источник: портал «Открытый бюджет Москвы».`;
  }

  if (
    s.includes('школ') || s.includes('колледж') || s.includes('детск') ||
    s.includes('образован') || s.includes('мэш')
  ) {
    return `На развитие образования Москвы в 2026 году предусмотрено **${formatBudgetAmount(BUDGET_FACTS.education.amountBillion)}** — около 12,8% всех плановых расходов. Детализацию программы смотрите на **budget.mos.ru**.`;
  }

  if (
    s.includes('больниц') || s.includes('клиник') || s.includes('врач') ||
    s.includes('здоров') || s.includes('медицин') || s.includes('емиас') || s.includes('лекарств')
  ) {
    return `На развитие здравоохранения Москвы в 2026 году предусмотрено **${formatBudgetAmount(BUDGET_FACTS.healthcare.amountBillion)}** без учёта оплаты медицинской помощи из Фонда ОМС. Детализацию программы проверяйте на **budget.mos.ru**.`;
  }

  if (
    s.includes('промышлен') || s.includes('инвест') || s.includes('завод') ||
    s.includes('технополис') || s.includes('субсид') || s.includes('бизнес')
  ) {
    return `В плане на 2026 год на развитие цифровой среды и инноваций предусмотрено **${formatBudgetAmount(BUDGET_FACTS.digital.amountBillion)}**. Условия конкретных льгот можно открыть на страницах программ.`;
  }

  return `Я могу показать проверенные верхнеуровневые показатели по темам **доходы**, **социальная сфера**, **образование**, **здравоохранение**, **транспорт** и **экономика**. Первичные данные: **budget.mos.ru**; налоговые вычеты: **nalog.gov.ru**.`;
};

const INTRO_PROMPTS = [
  { label: '🧭 Начать экскурсию с Фини', query: 'экскурсия' },
  { label: 'Каков бюджет Москвы?', query: 'Каков бюджет Москвы?' },
  { label: 'Как получить налоговый вычет?', query: 'Как получить налоговый вычет?' },
  { label: 'Сколько тратится на транспорт?', query: 'Сколько тратится на транспорт?' },
];

const QUICK_PROMPTS = [
  { label: '🧭 Начать экскурсию с Фини', q: 'экскурсия' },
  { label: '📊 Доходы и Налоги', q: 'доход налог ндфл' },
  { label: '🚇 Метро и Транспорт', q: 'транспорт метро электробус' },
  { label: '🏥 Медицина и ЕМИАС', q: 'медицина емиас лекарства' },
  { label: '🏫 Школы и Образование', q: 'школа образование мэш' },
  { label: '⚙️ Промышленность & Льготы', q: 'промышленность субсидии' },
  { label: '👨‍👩‍👦 Льготы и пенсии', q: 'социальная доплаты льготы' },
  { label: '🎮 Сыграть в Викторину', q: 'викторина' },
];

export default function BudgetAIChatDrawer({ activeMobileTab, tourStep = null }: BudgetAIChatDrawerProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = safeLocalStorage.getItem('mos_ai_drawer_history');
    if (stored) {
      try {
        const parsed: unknown = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.every(message =>
          typeof message === 'object' && message !== null &&
          typeof message.id === 'string' &&
          (message.sender === 'ai' || message.sender === 'user') &&
          typeof message.text === 'string' &&
          typeof message.timestamp === 'string'
        )) {
          return parsed as ChatMessage[];
        }
      } catch {
        /* ignore corrupted history */
      }
    }
    return [makeWelcome()];
  });
  const [input, setInput] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: getPreferredScrollBehavior() });
  }, [messages, isTyping]);

  useEffect(() => {
    safeLocalStorage.setItem('mos_ai_drawer_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const send = (raw: string) => {
    if (!raw.trim()) return;
    const lower = raw.toLowerCase().trim();

    if (
      lower.includes('экскурсия') || lower.includes('обучение') ||
      lower.includes('гид') || lower.includes('тур')
    ) {
      setIsOpen(false);
      window.dispatchEvent(new CustomEvent('start_mos_onboarding'));
      return;
    }

    const userMsg: ChatMessage = {
      id: `drawer-msg-${Date.now()}`,
      sender: 'user',
      text: raw,
      timestamp: nowTime(),
    };
    setMessages((prev) => [...prev, userMsg]);
    const aiMsg: ChatMessage = {
      id: `drawer-msg-${Date.now() + 1}`,
      sender: 'ai',
      text: generateResponse(raw),
      timestamp: nowTime(),
    };
    setMessages((prev) => [...prev, aiMsg]);
    setIsTyping(false);
  };

  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ initialQuery?: string }>;
      setIsOpen(true);
      if (custom.detail?.initialQuery) {
        send(custom.detail.initialQuery);
      }
    };
    window.addEventListener('open_mos_ai_chat', handler);
    return () => window.removeEventListener('open_mos_ai_chat', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      send(input);
      setInput('');
    }
  };

  const clearChat = () => {
    setMessages([makeWelcome()]);
  };

  return (
    <>
      {activeMobileTab !== 'quests' && (
        <button
          id="tour-ai"
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed bottom-[8.25rem] md:bottom-6 right-5 md:right-8 z-50 w-11 h-11 bg-[#0F9F91] text-white rounded-full flex items-center justify-center shadow-[0_12px_28px_rgba(15,159,145,0.28)] hover:bg-[#0B766E] transition duration-200 cursor-pointer active:scale-95 border-2 border-white/90',
            tourStep !== null && tourStep !== 6 && 'opacity-20 pointer-events-none transition-opacity duration-200',
            tourStep === 6 && 'z-[220] ring-4 ring-[#0F9F91]/30 scale-105 animate-pulse'
          )}
          title="Открыть интерактивный справочник"
          aria-label="Открыть интерактивный справочник"
        >
          <MessageCircle size={20} className="stroke-[2.5px]" />
          <span className="absolute inline-flex h-full w-full rounded-full bg-[#3CD7C5] opacity-25 animate-ping pointer-events-none" />
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-[#0F172A]/20 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-3 right-3 bottom-3 h-[calc(100%-1.5rem)] w-[calc(100%-1.5rem)] sm:max-w-xl bg-white/92 text-[#172033] shadow-[0_24px_80px_rgba(15,23,42,0.2)] z-50 flex flex-col rounded-[30px] border border-white/95 overflow-hidden backdrop-blur-2xl"
              role="dialog"
              aria-modal="true"
              aria-label="Интерактивный бюджетный справочник"
            >
              <div className="flex items-center justify-between p-4 md:p-5 border-b border-slate-200/70 bg-white/72">
                <div className="flex items-center gap-2">
                  <div className="bg-[#DDF7F1] text-[#0F9F91] p-2 rounded-2xl border border-[#BDEDE4]">
                    <Bot size={18} className="stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-[#172033] leading-tight">Помощник по бюджету</h3>
                    <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider block">Городские цифры и решения</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.dispatchEvent(new CustomEvent('start_mos_onboarding'));
                    }}
                    className="text-[10px] font-extrabold text-[#0B766E] hover:text-white bg-[#DDF7F1] hover:bg-[#0F9F91] border border-[#BDEDE4] hover:border-[#0F9F91] px-2.5 py-1.5 rounded-full transition cursor-pointer select-none"
                  >
                    Экскурсия 🧭
                  </button>
                  <button
                    onClick={clearChat}
                    className="text-[10px] font-extrabold text-[#64748B] hover:text-[#0B766E] bg-white/70 hover:bg-[#EAF9F6] border border-slate-200/80 px-2.5 py-1.5 rounded-full transition cursor-pointer select-none"
                  >
                    Очистить
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    aria-label="Закрыть справочник"
                    className="p-1.5 hover:bg-slate-100 rounded-full text-[#64748B] hover:text-[#172033] transition"
                  >
                    <X size={18} className="stroke-[2.5px]" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 md:p-5 overflow-y-auto bg-[#F3F7F6]/72 flex flex-col space-y-3.5 no-scrollbar">
                {messages.length <= 1 && (
                  <div className="glass-panel p-3.5 rounded-[22px] space-y-2">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#0F9F91]">Частые вопросы о бюджете:</p>
                    <div className="flex flex-col gap-1.5">
                      {INTRO_PROMPTS.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => send(item.query)}
                          className="text-left text-xs text-[#334155] hover:text-[#0B766E] bg-white/70 hover:bg-[#EAF9F6] border border-slate-200/80 px-3 py-2.5 rounded-[16px] transition font-extrabold cursor-pointer select-none active:scale-95"
                        >
                          💡 {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {messages.map((msg) => {
                  const isAI = msg.sender === 'ai';
                  return (
                    <div
                      key={msg.id}
                      className={cn('flex gap-2.5 max-w-[92%]', isAI ? 'self-start' : 'self-end flex-row-reverse ml-auto')}
                    >
                      <div
                        className={cn(
                            'w-8 h-8 rounded-2xl shrink-0 flex items-center justify-center text-[12px] select-none shadow-sm',
                          isAI
                            ? 'bg-[#DDF7F1] text-[#0F9F91] border border-[#BDEDE4]'
                            : 'bg-white text-[#0B766E] border border-[#BDEDE4]'
                        )}
                      >
                        {isAI ? <Bot size={14} /> : <User size={14} />}
                      </div>
                      <div className="space-y-0.5">
                        <div
                          className={cn(
                            'p-3.5 rounded-[22px] text-sm font-medium leading-relaxed border shadow-[0_8px_20px_rgba(15,23,42,0.06)] break-words',
                            isAI
                              ? 'bg-white/90 text-[#172033] border-white rounded-tl-md whitespace-pre-wrap animate-pop'
                              : 'bg-[#DDF7F1] text-[#0B766E] border-[#BDEDE4] rounded-tr-md animate-pop'
                          )}
                        >
                          {msg.text.split('\n').map((line, li) => (
                            <p key={li} className={cn(li > 0 ? 'mt-1.5' : '')}>
                              {line.split('**').map((part, pi) =>
                                pi % 2 === 1 ? (
                                  <button
                                    key={pi}
                                    type="button"
                                    onClick={() => send(part)}
                                    className="inline text-[#0B766E] hover:text-[#0F9F91] font-extrabold hover:underline underline-offset-2 cursor-pointer transition-all duration-150 text-left active:scale-95 bg-transparent border-none p-0 mx-0.5 font-sans"
                                    title={`Спросить ассистента про "${part}"`}
                                  >
                                    {part}
                                  </button>
                                ) : (
                                  <React.Fragment key={pi}>{part}</React.Fragment>
                                )
                              )}
                            </p>
                          ))}
                        </div>
                        <span className="text-[8px] font-mono text-[#94A3B8] block text-right pr-1">{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex gap-2.5 max-w-[85%] self-start animate-pulse">
                    <div className="w-8 h-8 rounded-2xl bg-[#DDF7F1] text-[#0F9F91] flex items-center justify-center text-[12px] shrink-0 select-none border border-[#BDEDE4] shadow-sm">
                      <Bot size={13} />
                    </div>
                    <div className="bg-white text-[#172033] border border-white p-3.5 rounded-[22px] rounded-tl-md font-bold text-sm flex items-center gap-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
                      <span className="w-1.5 h-1.5 bg-[#0F9F91] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#0F9F91] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-[#0F9F91] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="px-4 pb-0 pt-3 bg-white/76 border-t border-slate-200/70 shrink-0">
                <div className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider mb-2 px-1">Частые вопросы:</div>
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto no-scrollbar pb-2">
                  {QUICK_PROMPTS.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => send(item.q)}
                      className="px-3 py-2 text-[11px] font-extrabold bg-white/78 hover:bg-[#DDF7F1] hover:text-[#0B766E] border border-slate-200/80 rounded-[16px] text-[#475569] text-left transition-all cursor-pointer select-none active:scale-95 leading-tight w-full hover:shadow-sm"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200/70 bg-white/86 pb-safe">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Напишите ваш вопрос..."
                    className="flex-1 text-base md:text-[13px] font-semibold px-4 py-3 bg-white border border-slate-200 hover:border-[#0F9F91]/50 focus:border-[#0F9F91] text-[#172033] rounded-[18px] outline-none placeholder-[#94A3B8] min-w-0 shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={cn(
                      'px-4 w-12 rounded-xl shadow-xs transition duration-150 flex items-center justify-center cursor-pointer select-none shrink-0',
                      input.trim()
                        ? 'bg-[#0F9F91] text-white hover:bg-[#0B766E] transform active:scale-95'
                        : 'bg-slate-100 text-slate-300 border border-slate-200 pointer-events-none'
                    )}
                  >
                    <Send size={15} className="-ml-0.5" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
