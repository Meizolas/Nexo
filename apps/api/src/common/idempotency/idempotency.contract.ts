export const IDEMPOTENCY_KEY_HEADER = 'idempotency-key';

export type IdempotencyStatus = 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';

export interface IdempotencyContext {
  key: string;
  operation: string;
  organizationId: string;
  requestHash: string;
}

export interface IdempotencyRecord<
  TResult = unknown,
> extends IdempotencyContext {
  status: IdempotencyStatus;
  result?: TResult;
  expiresAt: Date;
}

export interface IdempotencyStore {
  claim(context: IdempotencyContext): Promise<IdempotencyRecord>;
  complete<TResult>(
    context: IdempotencyContext,
    result: TResult,
  ): Promise<IdempotencyRecord<TResult>>;
  fail(context: IdempotencyContext): Promise<void>;
  find<TResult>(
    context: IdempotencyContext,
  ): Promise<IdempotencyRecord<TResult> | null>;
}

export const IDEMPOTENCY_STORE = Symbol('IDEMPOTENCY_STORE');

export function isValidIdempotencyKey(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{15,127}$/.test(value);
}
