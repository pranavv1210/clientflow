/**
 * Money maths and Indian-format currency rendering.
 *
 * Every amount shown anywhere in the app or in a PDF comes from these
 * functions, so the Proposal, Agreement and Invoice can never disagree about
 * what the project costs.
 */

import type { LineItem, PricingTerms, ClientWorkspace } from '../types/client';
import { CURRENCY } from '../config/identity';

/** Rounds to paise, nudging away from binary float error (0.145 -> 0.15). */
export function roundMoney(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const nudge = value >= 0 ? 1e-9 : -1e-9;
  return Math.round(value * 100 + nudge) / 100;
}

export function lineTotal(item: LineItem): number {
  return roundMoney(toNumber(item.quantity) * toNumber(item.unitPrice));
}

export function subtotal(items: LineItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + lineTotal(item), 0));
}

/**
 * The discount actually applied: never negative, never more than the subtotal.
 *
 * Display this rather than `pricing.discount`, or the totals column can print
 * Subtotal 1,00,000 / Discount -2,00,000 / Total 0 and not add up.
 */
export function discountApplied(pricing: PricingTerms): number {
  return roundMoney(clamp(toNumber(pricing.discount), 0, subtotal(pricing.lineItems)));
}

/** Subtotal less the discount that was actually applied. Never negative. */
export function projectTotal(pricing: PricingTerms): number {
  return roundMoney(subtotal(pricing.lineItems) - discountApplied(pricing));
}

/**
 * The advance percentage actually used in the maths.
 *
 * Display this rather than `pricing.advancePercent`. A stray 150 in the field
 * would otherwise print "INR 1,00,000 (150%) up front, remaining INR 0" — a
 * clause that contradicts itself inside a signed agreement.
 */
export function advancePercentUsed(pricing: PricingTerms): number {
  return clamp(toNumber(pricing.advancePercent), 0, 100);
}

export function advanceAmount(pricing: PricingTerms): number {
  return roundMoney((projectTotal(pricing) * advancePercentUsed(pricing)) / 100);
}

/** What is left after the advance — the on-delivery instalment. */
export function balanceAfterAdvance(pricing: PricingTerms): number {
  return roundMoney(projectTotal(pricing) - advanceAmount(pricing));
}

/**
 * Money already received, clamped to what could plausibly have been paid.
 * Both the Invoice PDF and the client screen read this, so they cannot disagree
 * about what "Received" means.
 */
export function receivedAmount(workspace: ClientWorkspace): number {
  const total = projectTotal(workspace.pricing);
  return roundMoney(clamp(toNumber(workspace.invoice.amountReceived), 0, total));
}

/** What the invoice actually asks for, given money already received. */
export function balanceDue(workspace: ClientWorkspace): number {
  return roundMoney(projectTotal(workspace.pricing) - receivedAmount(workspace));
}

/** Coerces form input (which arrives as strings) without producing NaN. */
export function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value.replace(/,/g, '').trim());
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Indian digit grouping: 120000 -> '1,20,000'. Hand-rolled rather than using
 * Intl, so it produces identical output in every browser and in Node tests.
 * Paise are shown only when they are not zero.
 */
export function groupIndian(value: number): string {
  const rounded = roundMoney(value);
  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  const whole = Math.floor(abs);
  const paise = Math.round((abs - whole) * 100);

  let digits = String(whole);
  if (digits.length > 3) {
    const last3 = digits.slice(-3);
    let rest = digits.slice(0, -3);
    const groups: string[] = [];
    while (rest.length > 2) {
      groups.unshift(rest.slice(-2));
      rest = rest.slice(0, -2);
    }
    if (rest.length > 0) groups.unshift(rest);
    digits = `${groups.join(',')},${last3}`;
  }

  const fraction = paise > 0 ? `.${String(paise).padStart(2, '0')}` : '';
  return `${negative ? '-' : ''}${digits}${fraction}`;
}

/** For the app UI, where the browser font has a rupee glyph. */
export function formatMoney(value: number): string {
  return `${CURRENCY.uiSymbol}${groupIndian(value)}`;
}

/** For PDFs, where the built-in Helvetica has no rupee glyph. */
export function formatMoneyPdf(value: number): string {
  return `${CURRENCY.pdfPrefix} ${groupIndian(value)}`;
}

/** Compact form for the client list: 120000 -> '₹1.2L'. */
export function formatMoneyCompact(value: number): string {
  const abs = Math.abs(roundMoney(value));
  const sign = value < 0 ? '-' : '';
  if (abs >= 10000000) return `${sign}${CURRENCY.uiSymbol}${trimZero(abs / 10000000)}Cr`;
  if (abs >= 100000) return `${sign}${CURRENCY.uiSymbol}${trimZero(abs / 100000)}L`;
  if (abs >= 1000) return `${sign}${CURRENCY.uiSymbol}${trimZero(abs / 1000)}K`;
  return `${sign}${CURRENCY.uiSymbol}${groupIndian(abs)}`;
}

function trimZero(value: number): string {
  return value.toFixed(1).replace(/\.0$/, '');
}

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
];

function underHundred(value: number): string {
  if (value < 20) return ONES[value];
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return ones > 0 ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens];
}

function underThousand(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest > 0) parts.push(underHundred(rest));
  return parts.join(' ');
}

/** Whole number to words on the Indian scale: crore, lakh, thousand. */
export function indianWords(value: number): string {
  const n = Math.floor(Math.abs(value));
  if (n === 0) return 'Zero';

  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;

  const parts: string[] = [];
  // Recurses for absurd amounts so 'One Thousand Crore' still reads correctly.
  if (crore > 0) {
    parts.push(`${crore > 999 ? indianWords(crore) : underThousand(crore)} Crore`);
  }
  if (lakh > 0) parts.push(`${underHundred(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${underHundred(thousand)} Thousand`);
  if (rest > 0) parts.push(underThousand(rest));
  return parts.join(' ');
}

/** Invoice courtesy line: 'Rupees One Lakh Twenty Thousand only'. */
export function rupeesInWords(value: number): string {
  const rounded = roundMoney(Math.abs(value));
  const whole = Math.floor(rounded);
  const paise = Math.round((rounded - whole) * 100);
  let words = `Rupees ${indianWords(whole)}`;
  if (paise > 0) words += ` and ${underHundred(paise)} Paise`;
  return `${words} only`;
}
