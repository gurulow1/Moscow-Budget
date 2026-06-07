import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, Bot, X, User, Send } from 'lucide-react';
import { cn, safeLocalStorage } from '../lib/utils';

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

const WELCOME_TEXT = `Приветствую! Я Бюджетный Ассистент. Рад помочь вам разобраться в Законе о бюджете столицы на 2026 год!

Какой столичный вопрос вас интересует?`;

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
    return `Отличная идея! Я подготовил интерактивный экспресс-вызов в разделе "Викторины".

Перейдите в среднюю вкладку меню ниже, чтобы запустить квиз прямо сейчас и заработать ценные баллы!`;
  }

  if (
    s.includes('доход') || s.includes('налог') || s.includes('ндфл') ||
    s.includes('прибыль') || s.includes('сбор') || s.includes('вычет') || s.includes('бюджет')
  ) {
    return `Согласно **Закону о бюджете города Москвы на 2026 год**, налоговые доходы составляют фундамент бюджета. Главными источниками выступают **НДФЛ** и **Налог на прибыль организаций** (их сумма превышает **80%** всех налоговых поступлений).

Социальный лимит вычета по 3-НДФЛ для личного обучения был планово проиндексирован и увеличен до **150 000 рублей**, на обучение детей действует отдельный лимит — 110 тыс. руб.`;
  }

  if (
    s.includes('транспорт') || s.includes('метро') || s.includes('электробус') ||
    s.includes('дорог') || s.includes('мцд') || s.includes('бкл')
  ) {
    return `Программа **«Развитие транспортной системы»** традиционно является наиболее бюджетоемкой госпрограммой Москвы. За счет бюджета в 2026 году продолжается активное развитие передовой инфраструктуры:

1. Строительство новых радиальных веток метро (Троицкая, Рублево-Архангельская линии).
2. Регулярная опережающая закупка современных низкопольных **электробусов** отечественного бренда.
3. Финансирование полной интеграции дорожной сети, диаметров МЦД и речных электротрамваев.`;
  }

  if (
    s.includes('социал') || s.includes('пенси') || s.includes('льгот') ||
    s.includes('выплат') || s.includes('семь') || s.includes('поддержк')
  ) {
    return `Бюджет города Москвы на 2026 год является строго **социально ориентированным**. Более **50%** всех расходов города направлено непосредственно на социальную сферу:

* **Индексация доплат к пенсиям** (городской социальный стандарт) и социальных пособий семьям с детьми на уровень выше инфляции.
* Финансирование льготного и бесплатного проезда для школьников, студентов и пенсионеров.
* Поддержка программ социальной интеграции, активного долголетия и адресной помощи нуждающимся гражданам.`;
  }

  if (
    s.includes('школ') || s.includes('колледж') || s.includes('детск') ||
    s.includes('образован') || s.includes('мэш')
  ) {
    return `Государственная программа **«Столичное образование»** обеспечивает равные учебные стандарты во всех районах Москвы. Ключевые статьи бюджета 2026 года включают:

* Проект **«Мой Колледж»**: целевое финансирование подготовки ИТ и инженерных кадров.
* Капитальный ремонт и технологическое оснащение сотен общеобразовательных школ по единому стандарту.
* Развитие цифровой среды **МЭШ** (Московская электронная школа) и бесплатного горячего питания для младших классов.`;
  }

  if (
    s.includes('больниц') || s.includes('клиник') || s.includes('врач') ||
    s.includes('здоров') || s.includes('медицин') || s.includes('емиас') || s.includes('лекарств')
  ) {
    return `В рамках программы **«Столичное здравоохранение»** Москва переходит на новый стандарт амбулаторной помощи. Расходы бюджета гарантируют:

* Полное льготное обеспечение необходимыми лекарственными препаратами граждан с хроническими заболеваниями.
* Оснащение медицинских центров передовым диагностическим оборудованием и запуск флагманских скоропомощных корпусов.
* Масштабирование цифровой системы **ЕМИАС** с использованием интеллектуальных нейросетей-помощников в диагностике.`;
  }

  if (
    s.includes('промышлен') || s.includes('инвест') || s.includes('завод') ||
    s.includes('технополис') || s.includes('субсид') || s.includes('бизнес')
  ) {
    return `Правительство Москвы активно субсидирует промышленность и новые ИТ-производства:

* Особая экономическая зона **«Технополис Москва»** предлагает резидентам пониженный налог на прибыль, а также освобождение от имущественного, земельного и транспортного налогов на 10 лет.
* Предоставление льготных целевых займов через Московский фонд развития промышленности.
* Программа компенсации процентов по кредитам на закупку инновационного оборудования.`;
  }

  return `Спасибо за ваш вопрос о бюджете Москвы на 2026 год! Я с радостью помогу вам разобраться.

Поскольку я являюсь профильным консультантом финансового органа, я могу предоставить вам подробные аналитические выкладки по направлениям:
* 📊 **Доходы и налоги** (НДФЛ, вычеты)
* 🚇 **Транспортная инфраструктура** (метро, электробусы)
* 🏥 **Здравоохранение и образование** (школы, ЕМИАС, МЭШ)
* ⚙️ **Промышленность и субсидии инвестициям**`;
};

const INTRO_PROMPTS = [
  { label: '🤖 Начать Экскурсию с Фини', query: 'экскурсия' },
  { label: 'Каков бюджет Москвы?', query: 'Каков бюджет Москвы?' },
  { label: 'Как получить налоговый вычет?', query: 'Как получить налоговый вычет?' },
  { label: 'Сколько тратится на транспорт?', query: 'Сколько тратится на транспорт?' },
];

const QUICK_PROMPTS = [
  { label: '🤖 Начать Экскурсию с Фини', q: 'экскурсия' },
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
        return JSON.parse(stored) as ChatMessage[];
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
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    safeLocalStorage.setItem('mos_ai_drawer_history', JSON.stringify(messages));
  }, [messages]);

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
    setIsTyping(true);

    setTimeout(() => {
      const aiMsg: ChatMessage = {
        id: `drawer-msg-${Date.now() + 1}`,
        sender: 'ai',
        text: generateResponse(raw),
        timestamp: nowTime(),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1000);
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
            'fixed bottom-20 md:bottom-6 right-6 md:right-8 z-50 w-12 h-12 bg-[#CC1111] text-white rounded-full flex items-center justify-center shadow-2xl hover:bg-[#A30E0E] transition duration-200 cursor-pointer active:scale-95 border-2 border-white',
            tourStep !== null && tourStep !== 6 && 'blur-xs opacity-20 pointer-events-none scale-[0.98] transition-all duration-500',
            tourStep === 6 && 'z-[220] ring-4 ring-[#CC1111]/30 scale-105 animate-pulse'
          )}
          title="Открыть Бюджетного Ассистента"
        >
          <MessageCircle size={20} className="stroke-[2.5px]" />
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-25 animate-ping pointer-events-none" />
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
              className="fixed inset-0 bg-black z-50"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-[#1e293b] text-[#f8fafc] shadow-[0_0_50px_rgba(0,0,0,0.6)] z-50 flex flex-col border-l border-[rgba(148,163,184,0.15)]"
            >
              <div className="flex items-center justify-between p-4 border-b border-[rgba(148,163,184,0.15)] bg-[#151f32]/90">
                <div className="flex items-center gap-2">
                  <div className="bg-[#10b981]/20 text-[#10b981] p-1.5 rounded-lg border border-[#10b981]/10">
                    <Bot size={18} className="stroke-[2.5px]" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-[#f8fafc] leading-tight">Бюджетный Ассистент</h3>
                    <span className="text-[10px] text-[#94a3b8] font-bold uppercase tracking-wider block">Помощник граждан</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      window.dispatchEvent(new CustomEvent('start_mos_onboarding'));
                    }}
                    className="text-[10px] font-extrabold text-[#10b981] hover:text-[#f8fafc] bg-[#10b981]/15 hover:bg-[#10b981] border border-[#10b981]/30 hover:border-[#10b981] px-2.5 py-1.5 rounded-md transition cursor-pointer select-none"
                  >
                    Экскурсия 🤖
                  </button>
                  <button
                    onClick={clearChat}
                    className="text-[10px] font-extrabold text-[#94a3b8] hover:text-[#f8fafc] bg-[#334155]/60 hover:bg-[#ef4444]/20 hover:border-[#ef4444]/40 border border-[rgba(148,163,184,0.15)] px-2.5 py-1.5 rounded-md transition cursor-pointer select-none"
                  >
                    Очистить
                  </button>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-[#334155] rounded-lg text-[#94a3b8] hover:text-[#f8fafc] transition"
                  >
                    <X size={18} className="stroke-[2.5px]" />
                  </button>
                </div>
              </div>

              <div className="flex-1 p-4 overflow-y-auto bg-[#0f172a]/40 flex flex-col space-y-3.5 no-scrollbar">
                {messages.length <= 1 && (
                  <div className="p-3 bg-[#151f32] rounded-xl border border-[rgba(148,163,184,0.1)] space-y-2">
                    <p className="text-[10px] uppercase tracking-wider font-extrabold text-[#10b981]">Частые вопросы о бюджете:</p>
                    <div className="flex flex-col gap-1.5">
                      {INTRO_PROMPTS.map((item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => send(item.query)}
                          className="text-left text-xs text-[#cbd5e1] hover:text-[#10b981] bg-[#334155]/50 hover:bg-[#334155] border border-[rgba(148,163,184,0.15)] px-3 py-2.5 rounded-lg transition font-extrabold cursor-pointer select-none active:scale-95"
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
                          'w-7 h-7 rounded-lg shrink-0 flex items-center justify-center text-[12px] select-none shadow-sm',
                          isAI
                            ? 'bg-[#151f32] text-white border border-[rgba(148,163,184,0.2)]'
                            : 'bg-[#10b981]/15 text-[#10b981] border border-[#10b981]/30'
                        )}
                      >
                        {isAI ? <Bot size={14} /> : <User size={14} />}
                      </div>
                      <div className="space-y-0.5">
                        <div
                          className={cn(
                            'p-3.5 rounded-2xl text-sm font-medium leading-relaxed border shadow-[0_2px_10px_rgba(0,0,0,0.15)] break-words',
                            isAI
                              ? 'bg-[#151f32] text-[#f8fafc] border-[rgba(148,163,184,0.15)] rounded-tl-sm whitespace-pre-wrap animate-pop'
                              : 'bg-[#334155] text-[#f8fafc] border-[rgba(148,163,184,0.1)] rounded-tr-sm animate-pop'
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
                                    className="inline text-amber-400 hover:text-amber-300 font-extrabold hover:underline underline-offset-2 cursor-pointer transition-all duration-150 text-left active:scale-95 bg-transparent border-none p-0 mx-0.5 font-sans"
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
                        <span className="text-[8px] font-mono text-[#475569] block text-right pr-1">{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex gap-2.5 max-w-[85%] self-start animate-pulse">
                    <div className="w-7 h-7 rounded-lg bg-[#151f32] text-white flex items-center justify-center text-[12px] shrink-0 select-none border border-[rgba(148,163,184,0.2)] shadow-sm">
                      <Bot size={13} />
                    </div>
                    <div className="bg-[#151f32] text-[#f8fafc] border border-[rgba(148,163,184,0.15)] p-3.5 rounded-2xl rounded-tl-sm font-bold text-sm flex items-center gap-1.5 shadow-[0_2px_10px_rgba(0,0,0,0.15)]">
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-neutral-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              <div className="px-3 pb-0 pt-3 bg-[#151f32]/95 border-t border-[rgba(148,163,184,0.12)] shrink-0">
                <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-2 px-1">Частые вопросы:</div>
                <div className="flex flex-col gap-1.5 max-h-[160px] overflow-y-auto no-scrollbar pb-2">
                  {QUICK_PROMPTS.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => send(item.q)}
                      className="px-3 py-2 text-[11px] font-extrabold bg-[#334155]/60 hover:bg-[#CC1111] hover:text-[#f8fafc] border border-[rgba(148,163,184,0.15)] rounded-lg text-[#cbd5e1] text-left transition-all cursor-pointer select-none active:scale-95 leading-tight w-full hover:shadow-sm"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 border-t-0 bg-[#151f32]/95 pb-safe">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Напишите ваш вопрос..."
                    className="flex-1 text-base md:text-[13px] font-semibold px-4 py-3 bg-[#334155] border border-[rgba(148,163,184,0.2)] hover:border-[rgba(148,163,184,0.4)] focus:border-[#10b981] text-[#f8fafc] rounded-xl outline-none placeholder-[#94a3b8] min-w-0"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim()}
                    className={cn(
                      'px-4 w-12 rounded-xl shadow-xs transition duration-150 flex items-center justify-center cursor-pointer select-none shrink-0',
                      input.trim()
                        ? 'bg-[#ef4444] text-[#f8fafc] hover:bg-[#f87171] transform active:scale-95'
                        : 'bg-[#334155]/50 text-[#94a3b8] border border-[rgba(148,163,184,0.1)] pointer-events-none'
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
