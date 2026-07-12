/**
 * Payment gateway adapter — swap DummyGateway for Stripe/SSLCommerz later.
 * Checkout only depends on this interface.
 *
 * Interface:
 *   charge({ amount, currency, orderId, card }) → { success, transactionId, provider, raw }
 */
export class DummyGateway {
  constructor() {
    this.provider = 'dummy';
  }

  async charge({ amount, currency, orderId, card }) {
    // Simulate network latency
    await new Promise((r) => setTimeout(r, 900));

    const number = String(card?.number || '').replace(/\s/g, '');
    if (number.length < 12) {
      return {
        success: false,
        transactionId: null,
        provider: this.provider,
        error: 'Invalid card number',
        raw: null,
      };
    }

    // Demo decline: cards ending in 0000
    if (number.endsWith('0000')) {
      return {
        success: false,
        transactionId: null,
        provider: this.provider,
        error: 'Card declined (demo)',
        raw: { reason: 'declined' },
      };
    }

    const transactionId = `TXN-DUM-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    return {
      success: true,
      transactionId,
      provider: this.provider,
      raw: {
        amount,
        currency,
        orderId,
        brand: card?.brand || 'card',
        last4: number.slice(-4),
      },
    };
  }
}

/** Active gateway — change this one line when going live */
export const paymentGateway = new DummyGateway();
