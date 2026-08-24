/**
 * Form and layout primitives.
 *
 * Everything the screens use is here so spacing, borders and focus rings stay
 * identical across the app. Inputs are 16px (see index.css) because anything
 * smaller makes iOS Safari zoom the page on focus.
 */

import type { ChangeEvent, ReactNode } from 'react';
import { CloseIcon, SpinnerIcon } from './icons';

/* -------------------------------------------------------------------------- */
/* Buttons                                                                    */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-deep active:bg-accent-deep disabled:bg-accent/40',
  secondary:
    'bg-white text-ink border border-hairline hover:border-ink-faint active:bg-canvas disabled:text-ink-faint',
  ghost: 'bg-transparent text-ink-muted hover:text-ink hover:bg-black/[0.04] active:bg-black/[0.07]',
  danger:
    'bg-white text-red-600 border border-red-200 hover:border-red-400 hover:bg-red-50 active:bg-red-100',
};

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: ButtonVariant;
  type?: 'button' | 'submit';
  disabled?: boolean;
  busy?: boolean;
  full?: boolean;
  small?: boolean;
  title?: string;
}

export function Button({
  children,
  onClick,
  variant = 'secondary',
  type = 'button',
  disabled = false,
  busy = false,
  full = false,
  small = false,
  title,
}: ButtonProps) {
  const size = small ? 'h-9 px-3 text-[13px]' : 'h-11 px-4 text-sm';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || busy}
      title={title}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
        'transition-colors disabled:cursor-not-allowed',
        size,
        BUTTON_VARIANTS[variant],
        full ? 'w-full' : '',
      ].join(' ')}
    >
      {busy ? <SpinnerIcon size={16} /> : null}
      {children}
    </button>
  );
}

interface IconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  label: string;
  danger?: boolean;
}

export function IconButton({ children, onClick, label, danger = false }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
        danger
          ? 'text-ink-faint hover:bg-red-50 hover:text-red-600'
          : 'text-ink-muted hover:bg-black/[0.05] hover:text-ink',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Surfaces                                                                   */
/* -------------------------------------------------------------------------- */

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-hairline bg-white ${className}`}>{children}</div>
  );
}

interface SectionProps {
  title: string;
  hint?: string;
  children: ReactNode;
  /** Right-aligned control in the section header, e.g. an "Add row" button. */
  action?: ReactNode;
}

/** A titled block of fields. The form is a stack of these. */
export function FormSection({ title, hint, children, action }: SectionProps) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-hairline px-4 py-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight">{title}</h2>
          {hint ? <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{hint}</p> : null}
        </div>
        {action}
      </div>
      <div className="space-y-4 p-4">{children}</div>
    </Card>
  );
}

/* -------------------------------------------------------------------------- */
/* Fields                                                                     */
/* -------------------------------------------------------------------------- */

const FIELD_CLASS = [
  'w-full rounded-lg border border-hairline bg-white px-3 py-2.5',
  'text-ink placeholder:text-ink-faint',
  'transition-colors focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20',
].join(' ');

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
  /** Shown in place of the hint, in red. */
  error?: string;
}

export function Field({ label, hint, children, error }: FieldProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-muted">{label}</span>
      {children}
      {error ? (
        <span className="mt-1.5 block text-xs text-red-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-xs leading-relaxed text-ink-faint">{hint}</span>
      ) : null}
    </label>
  );
}

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'email' | 'tel' | 'url' | 'date';
  inputMode?: 'text' | 'email' | 'tel' | 'url' | 'numeric' | 'decimal';
  autoFocus?: boolean;
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  autoFocus = false,
}: TextInputProps) {
  return (
    <input
      type={type}
      inputMode={inputMode}
      value={value}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.value)}
      className={FIELD_CLASS}
    />
  );
}

interface TextAreaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

export function TextArea({ value, onChange, placeholder, rows = 4 }: TextAreaProps) {
  return (
    <textarea
      value={value}
      rows={rows}
      placeholder={placeholder}
      onChange={(event: ChangeEvent<HTMLTextAreaElement>) => onChange(event.target.value)}
      className={`${FIELD_CLASS} resize-y leading-relaxed`}
    />
  );
}

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  /** Small grey label inside the field, e.g. the rupee sign or a percent. */
  affix?: string;
  affixSide?: 'left' | 'right';
}

/**
 * Numeric field with an optional affix, clamped to `min`/`max` on every change
 * so an out-of-range value never reaches the saved record. Clearing the field
 * falls back to `min` rather than to zero.
 */
export function NumberInput({
  value,
  onChange,
  placeholder,
  min,
  max,
  step,
  affix,
  affixSide = 'left',
}: NumberInputProps) {
  const pad = affix ? (affixSide === 'left' ? 'pl-8' : 'pr-9') : '';
  return (
    <div className="relative">
      {affix ? (
        <span
          className={[
            'pointer-events-none absolute top-1/2 -translate-y-1/2 text-sm text-ink-faint',
            affixSide === 'left' ? 'left-3' : 'right-3',
          ].join(' ')}
        >
          {affix}
        </span>
      ) : null}
      <input
        type="number"
        inputMode="decimal"
        value={Number.isFinite(value) ? String(value) : ''}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          const raw = event.target.value;
          if (raw === '') {
            onChange(min ?? 0);
            return;
          }
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) return;
          // `min` and `max` as HTML attributes only govern the spinner buttons
          // and form validation — a typed 150 in a max=100 field still reaches
          // onChange. Clamping here keeps out-of-range values out of the saved
          // record, so no document can print a percentage it did not use.
          let next = parsed;
          if (min !== undefined) next = Math.max(next, min);
          if (max !== undefined) next = Math.min(next, max);
          onChange(next);
        }}
        className={`${FIELD_CLASS} num ${pad}`}
      />
    </div>
  );
}

interface SelectProps<T extends string> {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
}

export function Select<T extends string>({ value, options, onChange }: SelectProps<T>) {
  return (
    <select
      value={value}
      onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value as T)}
      className={`${FIELD_CLASS} appearance-none bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235A6172' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hint?: string;
}

export function Toggle({ checked, onChange, label, hint }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        {hint ? <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{hint}</p> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-accent' : 'bg-ink-faint/40',
        ].join(' ')}
      >
        <span
          className={[
            'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small display pieces                                                       */
/* -------------------------------------------------------------------------- */

export function Pill({
  children,
  tone = 'neutral',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'accent' | 'good' | 'warn';
}) {
  const tones = {
    neutral: 'bg-canvas text-ink-muted border-hairline',
    accent: 'bg-accent-soft text-accent-deep border-accent-rule',
    good: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warn: 'bg-amber-50 text-amber-700 border-amber-200',
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dashed border-hairline bg-white px-6 py-12 text-center">
      <p className="text-sm font-semibold">{title}</p>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-ink-muted">{body}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

/** Read-only label/value row, used on the detail screen. */
export function DataRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <span className="shrink-0 text-xs text-ink-muted">{label}</span>
      <span className="min-w-0 break-words text-right text-sm">{value}</span>
    </div>
  );
}

/**
 * Editable list of plain strings — scope bullets, tech stack, assets, extra
 * terms. One textarea per line would be heavy, so this is one input per item
 * with an add button and per-row delete.
 */
export function StringListEditor({
  items,
  onChange,
  placeholder,
  addLabel,
}: {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
}) {
  const update = (index: number, value: string) => {
    const next = items.slice();
    next[index] = value;
    onChange(next);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <input
            type="text"
            value={item}
            placeholder={placeholder}
            onChange={(event) => update(index, event.target.value)}
            className={FIELD_CLASS}
          />
          <IconButton
            label="Remove this line"
            danger
            onClick={() => onChange(items.filter((_, at) => at !== index))}
          >
            <CloseIcon size={16} />
          </IconButton>
        </div>
      ))}
      <Button small variant="ghost" onClick={() => onChange([...items, ''])}>
        {addLabel}
      </Button>
    </div>
  );
}

/** Confirmation used before anything destructive. */
export function ConfirmBar({
  message,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4">
      <p className="text-sm text-red-900">{message}</p>
      <div className="mt-3 flex gap-2">
        <Button small variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
        <Button small variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
