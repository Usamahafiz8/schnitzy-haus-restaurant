import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type output } from "zod";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  ApiException,
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthorized,
} from "@/lib/errors";
import { serialize } from "@/lib/serialize";
import { captureError } from "@/lib/monitoring";
import { STAFF_ROLES } from "@/types";
import type { Role } from "@prisma/client";

// ---------------------------------------------------------------------------
// Responses
// ---------------------------------------------------------------------------

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data: serialize(data) }, { status: 200, ...init });
}

export function created<T>(data: T) {
  return NextResponse.json({ data: serialize(data) }, { status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(
  message: string,
  status = 400,
  extra?: { code?: string; details?: Record<string, string[]> },
) {
  return NextResponse.json({ error: message, ...extra }, { status });
}

// Domain errors live in lib/errors.ts so business logic can throw them without
// importing the server runtime. Re-exported here so route handlers have one
// import to reach for.
export { ApiException, badRequest, conflict, forbidden, notFound, unauthorized };

/**
 * Wraps a route handler so thrown errors become clean JSON instead of a stack
 * trace, and unexpected failures are reported once rather than at every layer.
 */
export function handler<A extends unknown[]>(
  fn: (...args: A) => Promise<Response>,
) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (error) {
      if (error instanceof ApiException) {
        return fail(error.message, error.status, { code: error.code });
      }
      if (error instanceof ZodError) {
        return fail("Validation failed", 422, {
          code: "VALIDATION_ERROR",
          details: error.flatten().fieldErrors as Record<string, string[]>,
        });
      }
      captureError(error, { scope: "api" });
      return fail("Something went wrong. Please try again.", 500, {
        code: "INTERNAL_ERROR",
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Input parsing
// ---------------------------------------------------------------------------

// Generic over the schema rather than its output type: schemas with defaults
// or coercion have a different input type, and `ZodSchema<T>` would collapse
// the two and hand back optionals the parser has already filled in.
export async function parseBody<S extends ZodTypeAny>(
  req: Request,
  schema: S,
): Promise<output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw badRequest("Request body must be valid JSON");
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ZodError(result.error.issues);
  }
  return result.data;
}

export function parseQuery<S extends ZodTypeAny>(req: Request, schema: S): output<S> {
  const url = new URL(req.url);
  const raw: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    if (value !== "") raw[key] = value;
  });
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new ZodError(result.error.issues);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Auth guards
// ---------------------------------------------------------------------------

export type SessionUser = {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
};

export async function currentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    email: session.user.email ?? "",
    role: (session.user.role ?? "CUSTOMER") as Role,
    firstName: session.user.firstName ?? "",
    lastName: session.user.lastName ?? "",
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await currentUser();
  if (!user) throw unauthorized();
  return user;
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw forbidden();
  return user;
}

/** Any dashboard role. Use `requireRole("ADMIN")` for destructive operations. */
export async function requireStaff(): Promise<SessionUser> {
  const user = await requireUser();
  if (!STAFF_ROLES.includes(user.role)) throw forbidden();
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole("ADMIN");
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export async function logActivity(
  userId: string | null,
  action: string,
  entity?: string,
  entityId?: string,
  meta?: Record<string, unknown>,
) {
  try {
    await prisma.activityLog.create({
      data: {
        userId,
        action,
        entity,
        entityId,
        meta: meta ? (meta as object) : undefined,
      },
    });
  } catch (error) {
    // An audit write must never take down the operation it is recording.
    captureError(error, { scope: "activity-log", action });
  }
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

export function paginate(page: number, pageSize: number) {
  return { skip: (page - 1) * pageSize, take: pageSize };
}

export function paginated<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
