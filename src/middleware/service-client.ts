import { PaymentError, type CachedResult, type Quote } from '../core/types.js';

export interface PurchaseState {
  orderId: string; payment: string; delivery: string; mode: string; network: string;
  transaction?: string; error?: string; preparationLease?: string; result?: CachedResult;
}
export interface RequestContext { endpointId: string; method: string; resource: string; body?: string }
export class PaymentServiceClient {
  constructor(readonly baseUrl: string, private readonly apiKey: string, private readonly fetcher: typeof fetch = fetch) {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('Payment service requires HTTPS outside loopback');
  }
  private async call<T>(path: string, method: string, token?: string, body?: unknown): Promise<T> {
    const response = await this.fetcher(this.baseUrl.replace(/\/$/, '') + path, { method, headers: {
      authorization: 'Bearer ' + this.apiKey, 'content-type': 'application/json', ...(token ? { 'x-payment-access-token': token } : {}),
    }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(20_000), redirect: 'error' });
    const data = await response.json() as any;
    if (!response.ok) throw new PaymentError(data.error || 'payment_service_error', response.status, data.message || 'Payment service request failed');
    return data as T;
  }
  quote(context: RequestContext) { return this.call<Quote>('/v1/orders', 'POST', undefined, context); }
  begin(id: string, token: string, context: RequestContext, paymentPayload?: unknown) { return this.call<PurchaseState>(`/v1/orders/${id}/begin`, 'POST', token, { context, paymentPayload }); }
  stage(id: string, token: string, lease: string, result: CachedResult) { return this.call<PurchaseState>(`/v1/orders/${id}/stage`, 'POST', token, { lease, result }); }
  fail(id: string, token: string, lease: string) { return this.call(`/v1/orders/${id}/fail`, 'POST', token, { lease }); }
  settle(id: string, token: string) { return this.call<PurchaseState>(`/v1/orders/${id}/settle`, 'POST', token, {}); }
  result(id: string, token: string) { return this.call<PurchaseState>(`/v1/orders/${id}/result`, 'GET', token); }
}
