/**
 * Thin error-reporting seam. Sentry is opt-in: run `npx @sentry/wizard@latest -i nextjs`
 * and set SENTRY_DSN, then replace the body of `captureError` with
 * `Sentry.captureException`. Until then errors go to the server log with
 * structured context instead of vanishing.
 */
type Context = Record<string, unknown>;

const isProd = process.env.NODE_ENV === "production";

export function captureError(error: unknown, context: Context = {}) {
  const payload = {
    level: "error",
    message: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined,
    ...context,
    at: new Date().toISOString(),
  };

  if (isProd) {
    console.error(JSON.stringify(payload));
  } else {
    console.error(`[error] ${payload.message}`, context, payload.stack ?? "");
  }
}

export function captureMessage(message: string, context: Context = {}) {
  if (isProd) {
    console.warn(JSON.stringify({ level: "warn", message, ...context }));
  } else {
    console.warn(`[warn] ${message}`, context);
  }
}

/**
 * Retry helper for third-party calls (Stripe, Twilio, FCM, SMTP). Exponential
 * backoff with jitter; never retries more than `attempts` times.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  {
    attempts = 3,
    baseDelayMs = 250,
    label = "external-call",
  }: { attempts?: number; baseDelayMs?: number; label?: string } = {},
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt === attempts) break;
      const backoff = baseDelayMs * 2 ** (attempt - 1);
      const jitter = Math.random() * baseDelayMs;
      await new Promise((r) => setTimeout(r, backoff + jitter));
      captureMessage(`${label} failed, retrying`, { attempt, attempts });
    }
  }

  captureError(lastError, { scope: label, exhausted: true });
  throw lastError;
}
