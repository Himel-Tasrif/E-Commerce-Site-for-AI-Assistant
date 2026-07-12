/** Friendly labels for storefront */
export const PAYMENT_LABELS = {
  unpaid: 'Unpaid',
  processing: 'Processing',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
  partially_refunded: 'Partially refunded',
};

export const FULFILLMENT_LABELS = {
  unfulfilled: 'Preparing',
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

export function labelPayment(s) {
  return PAYMENT_LABELS[s] || String(s || '').replace(/_/g, ' ');
}

export function labelFulfillment(s) {
  return FULFILLMENT_LABELS[s] || String(s || '').replace(/_/g, ' ');
}

export function formatRemaining(ms) {
  if (ms <= 0) return '0:00';
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
