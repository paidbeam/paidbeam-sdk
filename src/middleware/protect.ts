import { decodeHeader, encodeHeader } from '../shared/wire.js';
import { PaymentError } from '../core/types.js';
import { errorResponse } from '../shared/errors.js';
import { ORDER_HEADER, ACCESS_HEADER } from '../shared/headers.js';
import { PaymentServiceClient } from './service-client.js';

export { ORDER_HEADER, ACCESS_HEADER } from '../shared/headers.js';
export interface ProtectOptions {
  client: PaymentServiceClient; endpointId: string;
  /** Fixed merchant origin; never infer it from untrusted forwarded headers. */
  publicOrigin: string;
  validate?: (request: Request) => void | Promise<void>;
}

/** Fetch-compatible middleware for bounded, read-only handlers returning JSON/text. */
export function protect(options: ProtectOptions, handler: (request: Request) => Promise<Response>) {
  return async (request: Request): Promise<Response> => {
    let orderId = request.headers.get(ORDER_HEADER); let token = request.headers.get(ACCESS_HEADER);
    const responseHeaders = () => ({ 'cache-control': 'no-store', ...(orderId && token ? { [ORDER_HEADER]: orderId, [ACCESS_HEADER]: token } : {}) });
    try {
      await options.validate?.(request);
      const url = new URL(request.url); const origin = new URL(options.publicOrigin);
      const context = { endpointId: options.endpointId, method: request.method, resource: origin.origin + url.pathname + url.search };
      if (!!orderId !== !!token) throw new PaymentError('missing_order_credentials', 400, 'Retain both order ID and access token');
      if (!orderId || !token) {
        if (request.headers.has('PAYMENT-SIGNATURE')) throw new PaymentError('order_required', 400, 'Obtain an order-bound challenge before signing');
        const quote = await options.client.quote(context); orderId = quote.orderId; token = quote.accessToken;
        return Response.json(quote.paymentRequired, { status: 402, headers: { ...responseHeaders(), 'PAYMENT-REQUIRED': encodeHeader(quote.paymentRequired) } });
      }
      const header = request.headers.get('PAYMENT-SIGNATURE');
      const state = await options.client.begin(orderId, token, context, header ? decodeHeader(header) : undefined);
      if (state.preparationLease) {
        try {
          const result = await handler(request);
          if (!result.ok) {
            await options.client.fail(orderId, token, state.preparationLease);
            return new Response(result.body, { status: result.status, headers: { ...Object.fromEntries(result.headers), ...responseHeaders() } });
          }
          // Read at most 1 MiB; do not buffer unbounded streams before settlement.
          const reader = result.body?.getReader(); const chunks: Uint8Array[] = []; let length = 0;
          if (reader) for (;;) {
            const chunk = await reader.read(); if (chunk.done) break;
            length += chunk.value.length;
            if (length > 1_000_000) { await reader.cancel(); throw new PaymentError('result_too_large', 502, 'Result exceeds the recoverable response limit'); }
            chunks.push(chunk.value);
          }
          const bytes = new Uint8Array(length); let offset = 0;
          for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
          const body = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
          const contentType = result.headers.get('content-type') || 'application/json';
          if (!/^(application\/json|text\/)/i.test(contentType)) throw new PaymentError('unsupported_response', 502, 'This version caches JSON and text responses only');
          await options.client.stage(orderId, token, state.preparationLease, { status: result.status, headers: { 'content-type': contentType }, body });
        } catch (e) { await options.client.fail(orderId, token, state.preparationLease).catch(() => {}); throw e; }
      }
      await options.client.settle(orderId, token);
      const ready = await options.client.result(orderId, token);
      if (!ready.result) return Response.json({ ...ready, message: 'Retain this order and access token; retry this same request without creating another payment.' }, { status: 202, headers: { ...responseHeaders(), 'retry-after': '2' } });
      return new Response(ready.result.body || null, { status: ready.result.status, headers: {
        ...ready.result.headers, ...responseHeaders(),
        'PAYMENT-RESPONSE': encodeHeader({ success: true, network: ready.network, transaction: ready.transaction, extensions: { mode: ready.mode, orderId } }),
      } });
    } catch (error) {
      const failure = errorResponse(error);
      return Response.json(failure.body, { status: failure.status, headers: responseHeaders() });
    }
  };
}
