import { useState } from 'react';
import { ArrowRight, CalendarCheck2, Coins, ExternalLink, Gift, Link2, ShieldCheck, X } from 'lucide-react';

interface CityRewardsHubProps {
  learningBalance: number;
  cityCandidatePoints: number;
  streak: number;
  todayPoints: number | null;
  onStartDailyQuiz: () => void;
}

export default function CityRewardsHub({
  learningBalance,
  cityCandidatePoints,
  streak,
  todayPoints,
  onStartDailyQuiz,
}: CityRewardsHubProps) {
  const [showIntegration, setShowIntegration] = useState(false);

  return (
    <>
      <section className="glass-surface relative overflow-hidden rounded-[28px] p-5 md:p-6">
        <div className="absolute -right-16 -top-20 h-52 w-52 rounded-full bg-[#3CD7C5]/15 blur-3xl pointer-events-none" />
        <div className="relative grid gap-5 lg:grid-cols-[1.35fr_0.65fr] lg:items-stretch">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#DDF7F1] px-3 py-1 text-[10px] font-black uppercase tracking-[0.17em] text-[#0B766E]">Городская петля вовлечения</span>
              <span className="rounded-full border border-[#0F9F91]/20 bg-[#F4F8F7] dark:bg-[#10232E] px-3 py-1 text-[10px] font-bold text-[#64748B]">городской маршрут</span>
            </div>
            <h2 className="mt-3 max-w-2xl text-xl md:text-2xl font-black leading-tight text-[#172033]">Изучайте город каждый день — превращайте знания в полезные действия</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#64748B]">
              Квиз дня даёт 5 городских баллов за каждый правильный ответ. Mos ID подтверждает участника, сервер исключает повторы, а результат передаётся в контуры «Миллиона призов» и «Активного гражданина».
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={onStartDailyQuiz}
                className="teal-action rounded-full px-5 py-3 text-sm font-black flex items-center justify-center gap-2"
              >
                {todayPoints === null ? 'Пройти задание дня' : 'Посмотреть задание дня'}
                <ArrowRight size={16} />
              </button>
              <button
                type="button"
                onClick={() => setShowIntegration(true)}
                className="rounded-full border border-[#0F9F91]/25 bg-[#F4F8F7] dark:bg-[#10232E] dark:border-[#35515F] px-5 py-3 text-sm font-black text-[#0B766E] transition hover:bg-[#F9FBFA] dark:hover:bg-[#173D42] flex items-center justify-center gap-2"
              >
                <Link2 size={16} /> Как подключается Mos ID
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="glass-panel rounded-[22px] p-4">
              <CalendarCheck2 size={18} className="text-[#0F9F91]" />
              <span className="mt-3 block text-[10px] font-black uppercase tracking-wider text-[#64748B]">серия дней</span>
              <strong className="mt-0.5 block text-2xl font-black text-[#172033]">{streak}</strong>
              <span className="text-[11px] font-semibold text-[#64748B]">возвращений подряд</span>
            </div>
            <div className="rounded-[22px] border border-[#0F9F91]/15 bg-[#0F9F91] p-4 text-white shadow-[0_12px_28px_rgba(15,159,145,0.2)]">
              <Coins size={18} />
              <span className="mt-3 block text-[10px] font-black uppercase tracking-wider text-white/70">городские баллы</span>
              <strong className="mt-0.5 block text-2xl font-black">{cityCandidatePoints}</strong>
              <span className="text-[11px] font-semibold text-white/80">в маршруте</span>
            </div>
            <div className="glass-inset col-span-2 rounded-[20px] px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider text-[#64748B]">сегодня</span>
                <span className="text-xs font-bold text-[#172033]">{todayPoints === null ? 'Задание ещё не выполнено' : `Зафиксировано: +${todayPoints} баллов`}</span>
              </div>
              <Gift size={20} className={todayPoints === null ? 'text-slate-300' : 'text-[#0F9F91]'} />
            </div>
          </div>
        </div>

        <div className="relative mt-5 flex flex-col md:flex-row md:items-center justify-between gap-3 border-t border-[#0F9F91]/10 pt-4 text-[11px] text-[#64748B]">
          <p><strong className="text-[#334155]">Ваши балансы:</strong> {learningBalance} Б — обучение; {cityCandidatePoints} — городские баллы маршрута.</p>
          <div className="flex items-center gap-3 shrink-0">
            <a href="https://ag.mos.ru/" target="_blank" rel="noopener noreferrer" className="font-bold text-[#0B766E] hover:underline">Активный гражданин ↗</a>
            <a href="https://ag-vmeste.ru/" target="_blank" rel="noopener noreferrer" className="font-bold text-[#0B766E] hover:underline">Миллион призов ↗</a>
          </div>
        </div>
      </section>

      {showIntegration && (
        <div className="fixed inset-0 z-[300] bg-[#0F172A]/30 p-4 backdrop-blur-sm flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="mos-id-title" onMouseDown={() => setShowIntegration(false)}>
          <div className="w-full max-w-2xl rounded-[30px] border border-white/90 dark:border-[#3A5665] bg-[#F7FAF9]/95 dark:bg-[#172B36]/95 p-5 md:p-7 shadow-[0_30px_90px_rgba(15,23,42,0.22)]" onMouseDown={event => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#0F9F91]">Бесшовное подключение</span>
                <h2 id="mos-id-title" className="mt-1 text-xl font-black text-[#172033]">Mos ID → городские баллы</h2>
              </div>
              <button type="button" onClick={() => setShowIntegration(false)} aria-label="Закрыть" className="rounded-full bg-slate-100 p-2 text-[#64748B] hover:bg-slate-200"><X size={18} /></button>
            </div>

            <div className="mt-6 grid gap-2.5 md:grid-cols-4">
              {[
                ['1', 'Mos ID', 'Редирект на login.mos.ru; проект не видит пароль.'],
                ['2', 'Результат', 'Сервер подписывает ID задания, ответы и время.'],
                ['3', 'Проверка', 'Антифрод и один зачёт на пользователя в сутки.'],
                ['4', 'Награда', 'Подтверждённая операция появляется в городском балансе и доступна в «Миллионе призов».'],
              ].map(([number, title, text]) => (
                <div key={number} className="glass-row rounded-[20px] p-4">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#DDF7F1] text-xs font-black text-[#0B766E]">{number}</span>
                  <strong className="mt-3 block text-sm text-[#172033]">{title}</strong>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#64748B]">{text}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-[20px] border border-[#BDEDE4] bg-[#EAF9F6] p-4 flex items-start gap-3">
              <ShieldCheck size={20} className="mt-0.5 shrink-0 text-[#0F9F91]" />
              <p className="text-xs leading-relaxed text-[#334155]"><strong>Как работает маршрут:</strong> ежедневный контент, входной/итоговый результат, защита от повторного начисления и прозрачный журнал операции.</p>
            </div>

            <a
              href="https://www.mos.ru/upload/documents/files/3684/GosydarstvennayaprogrammagorodaMoskviRazvitiecifrovoisrediiinnovacii.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center gap-2 text-xs font-black text-[#0B766E] hover:underline"
            >
              Официальное описание единого баланса городских проектов <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </>
  );
}
