import { PaymentError } from '../core/types.js';

export function errorResponse(error: unknown) {
  if (error instanceof PaymentError) return { status: error.status, body: { error: error.code, message: error.message } };
  if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') return { status: 400, body: { error: 'invalid_input', message: 'Invalid request body' } };
  return { status: 503, body: { error: 'service_unavailable', message: 'Payment service unavailable; retain the order and retry it' } };
}
