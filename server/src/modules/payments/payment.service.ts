import { DomainError } from '../../lib/errors.js';

export type DummyPaymentInput = {
  success?: boolean;
  transaction_id?: string;
  provider?: string;
  /** Never accepted — card fields are rejected if present */
  card_number?: unknown;
  cvc?: unknown;
  cvv?: unknown;
};

export type DummyPaymentResult = {
  success: boolean;
  transaction_id: string;
  provider: string;
};

export class PaymentService {
  /**
   * Dummy gateway — validates shape only.
   * Never logs or persists card_number / CVC.
   */
  processDummy(input: DummyPaymentInput): DummyPaymentResult {
    if (input.card_number != null || input.cvc != null || input.cvv != null) {
      throw new DomainError(
        'CARD_DATA_FORBIDDEN',
        'Card number and CVC must never be sent to this API',
        400
      );
    }

    const success = input.success !== false;
    const transaction_id =
      (input.transaction_id && String(input.transaction_id).trim()) ||
      `TXN-DUMMY-${Date.now()}`;

    return {
      success,
      transaction_id,
      provider: input.provider?.trim() || 'dummy',
    };
  }
}
