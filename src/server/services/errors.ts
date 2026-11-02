/** Expected, user-facing failures (validation, capacity, permissions). Safe to show. */
export class DomainError extends Error {
  constructor(
    message: string,
    public code: "NOT_FOUND" | "FORBIDDEN" | "CONFLICT" | "INVALID" | "PAYMENT_FAILED" = "INVALID",
  ) {
    super(message);
    this.name = "DomainError";
  }
}
