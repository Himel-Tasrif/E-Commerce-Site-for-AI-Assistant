/** Customer-friendly status labels */

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: 'Unpaid',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

export const FULFILLMENT_STATUS_LABELS: Record<string, string> = {
  unfulfilled: 'Unfulfilled',
  processing: 'Processing',
  packed: 'Packed',
  handed_to_courier: 'Handed to courier',
  in_transit: 'In transit',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  delivery_failed: 'Delivery failed',
  returned: 'Returned',
  cancelled: 'Cancelled',
};

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  active: 'Active',
  consumed: 'Consumed',
  released: 'Released',
  expired: 'Expired',
};

export const SESSION_STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  completed: 'Completed',
  expired: 'Expired',
  cancelled: 'Cancelled',
};

const FULFILLMENT_TRANSITIONS: Record<string, string[]> = {
  unfulfilled: ['processing', 'cancelled'],
  processing: ['packed', 'cancelled'],
  packed: ['handed_to_courier', 'cancelled'],
  handed_to_courier: ['in_transit', 'cancelled'],
  in_transit: ['out_for_delivery', 'delivery_failed', 'cancelled'],
  out_for_delivery: ['delivered', 'delivery_failed', 'cancelled'],
  delivery_failed: ['out_for_delivery', 'returned', 'cancelled'],
  delivered: ['returned'],
  returned: [],
  cancelled: [],
};

export function canTransitionFulfillment(from: string, to: string): boolean {
  if (from === to) return false;
  return (FULFILLMENT_TRANSITIONS[from] ?? []).includes(to);
}

export function allowedFulfillmentNext(from: string): string[] {
  return FULFILLMENT_TRANSITIONS[from] ?? [];
}

export function labelFulfillment(status: string): string {
  return FULFILLMENT_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}

export function labelPayment(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status.replace(/_/g, ' ');
}
