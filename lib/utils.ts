import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const DEFAULT_CURRENCY = "EUR";

/** Format a money amount for the given locale. Accepts Decimal-ish inputs. */
export function formatCurrency(
  amount: number | string | { toString(): string },
  locale: string = "en",
  currency: string = DEFAULT_CURRENCY,
) {
  const value = typeof amount === "number" ? amount : Number(amount.toString());
  return new Intl.NumberFormat(locale === "de" ? "de-DE" : "en-GB", {
    style: "currency",
    currency,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatDate(date: Date | string, locale: string = "en") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
  }).format(d);
}

export function formatDateTime(date: Date | string, locale: string = "en") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);
}

export function formatTime(date: Date | string, locale: string = "en") {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    timeStyle: "short",
  }).format(d);
}

/** Round to 2 decimals without floating point drift (12.345 -> 12.35). */
export function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const n = Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function initials(firstName?: string | null, lastName?: string | null) {
  return `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "?";
}

/** "HH:MM" -> minutes since midnight. Returns null for malformed input. */
export function timeToMinutes(time: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const hours = Number(m[1]);
  const minutes = Number(m[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** YYYY-MM-DD in the given date's local calendar (not UTC-shifted). */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
}

export const WEEKDAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export type Weekday = (typeof WEEKDAYS)[number];

export type OpeningHours = Partial<
  Record<Weekday, { open: string; close: string; closed?: boolean }>
>;

/** Is the restaurant open at `at`, according to its openingHours JSON? */
export function isOpenAt(hours: OpeningHours, at: Date = new Date()): boolean {
  const day = WEEKDAYS[at.getDay()];
  const today = hours?.[day];
  if (!today || today.closed) return false;
  const open = timeToMinutes(today.open);
  const close = timeToMinutes(today.close);
  if (open === null || close === null) return false;
  const now = at.getHours() * 60 + at.getMinutes();
  // Handle past-midnight closing times (e.g. 18:00 -> 02:00).
  return close <= open ? now >= open || now < close : now >= open && now < close;
}

export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  ms: number,
) {
  let timer: ReturnType<typeof setTimeout>;
  return (...args: A) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

export function truncate(text: string, max: number) {
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
