/**
 * Dates.
 *
 * All calendar dates are stored as plain 'YYYY-MM-DD' strings and parsed by
 * hand. Passing that string to `new Date()` would read it as UTC midnight and
 * can land on the previous day once rendered, which is exactly the kind of
 * off-by-one a client would notice on an invoice due date.
 */

const MONTHS_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const MONTHS_LONG = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseDate(iso: string): DateParts | null {
  const match = DATE_PATTERN.exec((iso ?? '').trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  // Rejects 2026-02-30 by round-tripping through a local Date.
  const probe = new Date(year, month - 1, day);
  if (probe.getFullYear() !== year || probe.getMonth() !== month - 1 || probe.getDate() !== day) {
    return null;
  }
  return { year, month, day };
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function todayIso(): string {
  return toIsoDate(new Date());
}

/** '2026-08-24' -> '24 Aug 2026'. Empty input gives an em dash. */
export function formatDate(iso: string): string {
  const parts = parseDate(iso);
  if (!parts) return '—';
  return `${parts.day} ${MONTHS_SHORT[parts.month - 1]} ${parts.year}`;
}

/** '2026-08-24' -> '24 August 2026', for agreement prose. */
export function formatDateLong(iso: string): string {
  const parts = parseDate(iso);
  if (!parts) return '—';
  return `${parts.day} ${MONTHS_LONG[parts.month - 1]} ${parts.year}`;
}

export function addDays(iso: string, days: number): string {
  const parts = parseDate(iso);
  if (!parts) return '';
  const date = new Date(parts.year, parts.month - 1, parts.day);
  date.setDate(date.getDate() + days);
  return toIsoDate(date);
}

/** Whole days from `iso` to today. Negative means `iso` is in the future. */
export function daysSince(iso: string): number | null {
  const parts = parseDate(iso);
  if (!parts) return null;
  const then = new Date(parts.year, parts.month - 1, parts.day).getTime();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((today - then) / 86400000);
}

export function isOverdue(iso: string): boolean {
  const diff = daysSince(iso);
  return diff !== null && diff > 0;
}

/**
 * 'Updated 3 min ago' style label for an ISO datetime. Falls back to a plain
 * date once it is more than a week old, which is more useful than '9 days ago'.
 */
export function relativeTime(isoDateTime: string): string {
  const then = new Date(isoDateTime).getTime();
  if (Number.isNaN(then)) return '—';
  const diffMs = Date.now() - then;
  if (diffMs < 45000) return 'just now';

  const minutes = Math.round(diffMs / 60000);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(diffMs / 3600000);
  if (hours < 24) return `${hours} hr ago`;

  const days = Math.round(diffMs / 86400000);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;

  return formatDate(toIsoDate(new Date(then)));
}
