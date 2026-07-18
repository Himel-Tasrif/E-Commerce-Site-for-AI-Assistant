export class DomainError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(code: string, message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export function mapRpcError(err: unknown): DomainError {
  const parts: string[] = [];
  if (err instanceof Error) parts.push(err.message);
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    for (const key of ['message', 'details', 'hint', 'code']) {
      if (o[key] != null) parts.push(String(o[key]));
    }
  } else if (!(err instanceof Error)) {
    parts.push(String(err));
  }
  const message = parts.filter(Boolean).join(' | ');
  const upper = message.toUpperCase();

  if (upper.includes('STOCK_UNAVAILABLE')) {
    return new DomainError('STOCK_UNAVAILABLE', 'Insufficient stock for one or more variants', 409, message);
  }
  if (upper.includes('SESSION_EXPIRED')) {
    return new DomainError('SESSION_EXPIRED', 'Checkout session has expired', 410);
  }
  if (upper.includes('SESSION_NOT_FOUND')) {
    return new DomainError('SESSION_NOT_FOUND', 'Checkout session not found', 404);
  }
  if (upper.includes('SESSION_NOT_OPEN')) {
    return new DomainError('SESSION_NOT_OPEN', 'Checkout session is not open', 409, message);
  }
  if (upper.includes('VARIANT_NOT_FOUND')) {
    return new DomainError('VARIANT_NOT_FOUND', 'Product variant not found', 404);
  }
  if (upper.includes('TENANT_MISMATCH')) {
    return new DomainError('TENANT_MISMATCH', 'Resource does not belong to tenant', 403);
  }
  if (upper.includes('PAYMENT_FAILED')) {
    return new DomainError('PAYMENT_FAILED', 'Payment was not successful', 402);
  }
  if (upper.includes('EMPTY_ITEMS')) {
    return new DomainError('EMPTY_ITEMS', 'Checkout requires at least one item', 400);
  }
  if (upper.includes('RESERVATION_INVALID')) {
    return new DomainError('RESERVATION_INVALID', 'Stock reservation is no longer valid', 409);
  }

  return new DomainError('RPC_ERROR', message || 'Database operation failed', 500, err);
}
