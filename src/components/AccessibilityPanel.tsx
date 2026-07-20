import { useEffect, useRef } from 'react';
import { Eye, RotateCcw, X } from 'lucide-react';
import { cn, safeLocalStorage } from '../lib/utils';

export type AccessibilityFontSize = 'normal' | 'large' | 'extra-large';
export type AccessibilityContrast = 'black-on-white' | 'white-on-black' | 'yellow-on-blue';
export type AccessibilitySpacing = 'normal' | 'wide';

export interface AccessibilitySettings {
  enabled: boolean;
  fontSize: AccessibilityFontSize;
  contrast: AccessibilityContrast;
  spacing: AccessibilitySpacing;
  reduceMotion: boolean;
}

const STORAGE_KEY = 'mos_accessibility_v1';

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  enabled: false,
  fontSize: 'large',
  contrast: 'black-on-white',
  spacing: 'normal',
  reduceMotion: true,
};

const FONT_SIZES: AccessibilityFontSize[] = ['normal', 'large', 'extra-large'];
const CONTRASTS: AccessibilityContrast[] = ['black-on-white', 'white-on-black', 'yellow-on-blue'];
const SPACINGS: AccessibilitySpacing[] = ['normal', 'wide'];

export function readAccessibilitySettings(): AccessibilitySettings {
  const raw = safeLocalStorage.getItem(STORAGE_KEY);
  if (!raw) return DEFAULT_ACCESSIBILITY_SETTINGS;

  try {
    const saved = JSON.parse(raw) as Partial<AccessibilitySettings>;
    return {
      enabled: saved.enabled === true,
      fontSize: FONT_SIZES.includes(saved.fontSize as AccessibilityFontSize)
        ? saved.fontSize as AccessibilityFontSize
        : DEFAULT_ACCESSIBILITY_SETTINGS.fontSize,
      contrast: CONTRASTS.includes(saved.contrast as AccessibilityContrast)
        ? saved.contrast as AccessibilityContrast
        : DEFAULT_ACCESSIBILITY_SETTINGS.contrast,
      spacing: SPACINGS.includes(saved.spacing as AccessibilitySpacing)
        ? saved.spacing as AccessibilitySpacing
        : DEFAULT_ACCESSIBILITY_SETTINGS.spacing,
      reduceMotion: saved.reduceMotion !== false,
    };
  } catch {
    return DEFAULT_ACCESSIBILITY_SETTINGS;
  }
}

export function applyAccessibilitySettings(settings: AccessibilitySettings) {
  const root = document.documentElement;

  if (settings.enabled) {
    root.dataset.a11y = 'true';
    root.dataset.a11yFont = settings.fontSize;
    root.dataset.a11yContrast = settings.contrast;
    root.dataset.a11ySpacing = settings.spacing;
    root.dataset.a11yReduceMotion = settings.reduceMotion.toString();
  } else {
    delete root.dataset.a11y;
    delete root.dataset.a11yFont;
    delete root.dataset.a11yContrast;
    delete root.dataset.a11ySpacing;
    delete root.dataset.a11yReduceMotion;
  }

  safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface AccessibilityPanelProps {
  open: boolean;
  settings: AccessibilitySettings;
  onChange: (settings: AccessibilitySettings) => void;
  onClose: () => void;
}

const fontOptions: Array<{ value: AccessibilityFontSize; label: string; hint: string }> = [
  { value: 'normal', label: 'Обычный', hint: '100%' },
  { value: 'large', label: 'Крупный', hint: '125%' },
  { value: 'extra-large', label: 'Очень крупный', hint: '150%' },
];

const contrastOptions: Array<{ value: AccessibilityContrast; label: string; className: string }> = [
  { value: 'black-on-white', label: 'Чёрный на белом', className: 'bg-white text-black border-black' },
  { value: 'white-on-black', label: 'Белый на чёрном', className: 'bg-black text-white border-white' },
  { value: 'yellow-on-blue', label: 'Жёлтый на синем', className: 'bg-[#063B72] text-[#FFF500] border-[#FFF500]' },
];

export default function AccessibilityPanel({
  open,
  settings,
  onChange,
  onClose,
}: AccessibilityPanelProps) {
  const panelRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    const focusFrame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable: HTMLElement[] = panelRef.current
        ? Array.from(panelRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]',
          ))
        : [];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const update = (patch: Partial<AccessibilitySettings>) => {
    onChange({ ...settings, ...patch, enabled: true });
  };

  return (
    <div
      className="a11y-overlay fixed inset-0 z-[12000] flex items-start justify-center overflow-y-auto bg-slate-950/70 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accessibility-title"
        aria-describedby="accessibility-description"
        className="a11y-toolbar my-auto w-full max-w-3xl rounded-2xl border-2 border-slate-900 bg-white p-4 text-slate-950 shadow-2xl sm:p-6"
      >
        <div className="flex items-start justify-between gap-4 border-b-2 border-slate-900 pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
              <Eye aria-hidden="true" size={24} />
            </span>
            <div>
              <h2 id="accessibility-title" className="text-xl font-black sm:text-2xl">
                Версия для слабовидящих
              </h2>
              <p id="accessibility-description" className="mt-1 text-sm font-semibold leading-relaxed">
                Выберите удобный размер текста, контраст и интервалы. Настройки сохраняются на этом устройстве.
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Закрыть настройки версии для слабовидящих"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-slate-900 bg-white hover:bg-slate-100"
          >
            <X aria-hidden="true" size={22} />
          </button>
        </div>

        <div className="mt-5 grid gap-6">
          <fieldset>
            <legend className="mb-3 text-base font-black">Размер текста</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {fontOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={settings.fontSize === option.value}
                  onClick={() => update({ fontSize: option.value })}
                  className={cn(
                    'min-h-14 rounded-xl border-2 px-3 py-2 text-left transition-colors',
                    settings.fontSize === option.value
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-300 bg-white text-slate-950 hover:border-slate-700',
                  )}
                >
                  <span className="block text-base font-black">{option.label}</span>
                  <span className="block text-sm font-bold">{option.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-base font-black">Цветовая схема</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {contrastOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={settings.contrast === option.value}
                  onClick={() => update({ contrast: option.value })}
                  className={cn(
                    'min-h-14 rounded-xl border-2 px-3 py-3 text-left text-sm font-black',
                    option.className,
                    settings.contrast === option.value && 'ring-4 ring-[#CC1111] ring-offset-2',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-3 text-base font-black">Интервал между буквами</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {([
                ['normal', 'Обычный'],
                ['wide', 'Увеличенный'],
              ] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={settings.spacing === value}
                  onClick={() => update({ spacing: value })}
                  className={cn(
                    'min-h-12 rounded-xl border-2 px-4 py-2 text-left font-black',
                    settings.spacing === value
                      ? 'border-slate-950 bg-slate-950 text-white'
                      : 'border-slate-300 bg-white text-slate-950 hover:border-slate-700',
                    value === 'wide' && 'tracking-[0.12em]',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-slate-300 p-4 hover:border-slate-700">
            <input
              type="checkbox"
              checked={settings.reduceMotion}
              onChange={(event) => update({ reduceMotion: event.target.checked })}
              className="mt-0.5 h-5 w-5 shrink-0 accent-slate-950"
            />
            <span>
              <span className="block font-black">Уменьшить анимацию и декоративные эффекты</span>
              <span className="mt-1 block text-sm font-semibold">
                Отключает движение, плавную прокрутку и тяжёлые фоновые эффекты.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 border-t-2 border-slate-900 pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => {
              onChange({ ...settings, enabled: false });
              onClose();
            }}
            className="flex min-h-12 items-center justify-center gap-2 rounded-xl border-2 border-slate-900 bg-white px-4 py-2 font-black text-slate-950 hover:bg-slate-100"
          >
            <RotateCcw aria-hidden="true" size={18} />
            Обычная версия
          </button>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl border-2 border-slate-950 bg-slate-950 px-5 py-2 font-black text-white hover:bg-slate-800"
          >
            Готово
          </button>
        </div>
      </section>
    </div>
  );
}
