/**
 * Domain errors, deliberately free of any Next.js or auth imports.
 *
 * Business logic (pricing, order transitions, booking rules) throws these;
 * `lib/api.ts` is the only place that knows how to turn them into HTTP. Keeping
 * them here means a module like `lib/orders.ts` stays importable from a unit
 * test without pulling in the server runtime.
 */
export class ApiException extends Error {
  constructor(
    message: string,
    readonly status = 400,
    readonly code?: string,
  ) {
    super(message);
    this.name = "ApiException";
  }
}

export const badRequest = (message = "Bad request") => new ApiException(message, 400);

export const unauthorized = (message = "You must be signed in") =>
  new ApiException(message, 401);

export const forbidden = (message = "You do not have access to this resource") =>
  new ApiException(message, 403);

export const notFound = (message = "Not found") => new ApiException(message, 404);

export const conflict = (message = "Conflict") => new ApiException(message, 409);
