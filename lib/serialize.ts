import { Prisma } from "@prisma/client";

/**
 * Prisma returns `Decimal` objects and `Date`s, neither of which survive
 * `JSON.stringify` in a shape the client can use. Every API route and every
 * server->client prop passes through here so the browser only ever sees
 * numbers and ISO strings.
 */
export type Serialized<T> = T extends Prisma.Decimal
  ? number
  : T extends Date
    ? string
    : T extends (infer U)[]
      ? Serialized<U>[]
      : T extends object
        ? { [K in keyof T]: Serialized<T[K]> }
        : T;

export function serialize<T>(value: T): Serialized<T> {
  if (value === null || value === undefined) return value as Serialized<T>;

  if (Prisma.Decimal.isDecimal(value)) {
    return Number(value.toString()) as Serialized<T>;
  }

  if (value instanceof Date) {
    return value.toISOString() as Serialized<T>;
  }

  if (Array.isArray(value)) {
    return value.map((v) => serialize(v)) as Serialized<T>;
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = serialize(val);
    }
    return out as Serialized<T>;
  }

  return value as Serialized<T>;
}
