import { isAddress } from 'viem';
import { signQuote, recoveryHeaders, type BuyerPolicy, type PaymentSigner, type PurchaseCredentials } from '../middleware/buyer.js';
import { decodeHeader } from '../shared/wire.js';
import type { BoundPayload, PaymentRequired } from '../core/types.js';
import { assertMainnetBuyerPolicy } from '../shared/mainnet.js';

export interface SdkBuyerPolicy extends BuyerPolicy { payTo: string; tokenName: string; tokenVersion: string }
/** Contains a bearer recovery token and signed authorization. Store privately. */
export interface SavedPurchase {
  readonly version: 1; readonly endpoint: string;
  readonly credentials: Readonly<PurchaseCredentials>; readonly paymentHeader: string;
}
export interface PaymentClientOptions {
  merchantOrigin: string; signer: PaymentSigner; policy: SdkBuyerPolicy;
  /** Must finish durable storage before the SDK submits the authorization. */
  savePurchase: (purchase: SavedPurchase) => void | Promise<void>;
  fetch?: typeof fetch;
}
export interface PaymentAttempt { response: Response; purchase?: SavedPurchase }
export class PaymentAttemptError extends Error {
  readonly #purchase: SavedPurchase;
  constructor(purchase: SavedPurchase) {
    super('Payment response unavailable; recover the saved purchase instead of starting another payment');
    this.name = 'PaymentAttemptError';
    this.#purchase = purchase;
  }
  get purchase() { return this.#purchase; }
}

/** One explicitly requested purchase. Recovery never obtains a new quote or signs again. */
export function createPaymentClient(options: PaymentClientOptions) {
  const origin = new URL(options.merchantOrigin);
  const policy = Object.freeze({ ...options.policy });
  const signer = options.signer; const fetcher = options.fetch || fetch;
  if (origin.username || origin.password || origin.pathname !== '/' || origin.search || origin.hash ||
      !['http:', 'https:'].includes(origin.protocol) ||
      (origin.protocol !== 'https:' && !['127.0.0.1', 'localhost', '[::1]'].includes(origin.hostname))) throw new Error('Use a fixed HTTPS merchant origin, or HTTP loopback for local development');
  assertMainnetBuyerPolicy(policy);
  if (!/^eip155:[1-9]\d*$/.test(policy.network) || !isAddress(policy.asset) || !isAddress(policy.payTo) ||
      /^0x0{40}$/i.test(policy.payTo) || policy.maxAmount <= 0n || !policy.tokenName || !policy.tokenVersion ||
      typeof options.savePurchase !== 'function' || !signer.signTypedData) throw new Error('A signer, explicit buyer policy and durable purchase storage callback are required');
  function endpointUrl(input: string) {
    const endpoint = new URL(input, origin);
    if (endpoint.origin !== origin.origin || endpoint.username || endpoint.password || endpoint.hash) throw new Error('Payment endpoint must match the configured merchant origin without credentials or fragments');
    return endpoint.href;
  }
  function validateRecord(purchase: SavedPurchase) {
    if (purchase.version !== 1 || endpointUrl(purchase.endpoint) !== purchase.endpoint ||
        !purchase.credentials?.orderId || !purchase.credentials.accessToken) throw new Error('Invalid saved purchase');
    const payload = decodeHeader(purchase.paymentHeader) as BoundPayload;
    const r = payload.accepted; const a = payload.payload?.authorization;
    if (payload.x402Version !== 2 || r?.scheme !== 'exact' || r.network !== policy.network ||
        r.asset.toLowerCase() !== policy.asset.toLowerCase() || r.payTo.toLowerCase() !== policy.payTo.toLowerCase() ||
        r.extra?.name !== policy.tokenName || r.extra?.version !== policy.tokenVersion ||
        BigInt(r.amount) <= 0n || BigInt(r.amount) > policy.maxAmount || payload.resource?.url !== purchase.endpoint ||
        a?.from.toLowerCase() !== signer.address.toLowerCase() || a.to.toLowerCase() !== policy.payTo.toLowerCase() || a.value !== r.amount) throw new Error('Saved purchase violates buyer policy');
  }
  async function submit(purchase: SavedPurchase, signal?: AbortSignal): Promise<PaymentAttempt> {
    validateRecord(purchase);
    try {
      const response = await fetcher(purchase.endpoint, { method: 'GET', headers: {
        ...recoveryHeaders(purchase.credentials), 'PAYMENT-SIGNATURE': purchase.paymentHeader,
      }, redirect: 'error', credentials: 'omit', cache: 'no-store', signal: signal || AbortSignal.timeout(20_000) });
      if (response.ok && response.status !== 202) {
        const receipt = decodeHeader(response.headers.get('PAYMENT-RESPONSE') || '') as { success?: boolean; network?: string; transaction?: string };
        if (receipt.success !== true || receipt.network !== policy.network || !/^0x[\da-fA-F]{64}$/.test(receipt.transaction || '')) throw new Error('Invalid settlement response');
      }
      return { response, purchase };
    } catch { throw new PaymentAttemptError(purchase); }
  }
  return {
    async purchase(input: string, request: { signal?: AbortSignal } = {}): Promise<PaymentAttempt> {
      const endpoint = endpointUrl(input);
      const challenge = await fetcher(endpoint, { method: 'GET', redirect: 'error', credentials: 'omit', cache: 'no-store', signal: request.signal || AbortSignal.timeout(20_000) });
      if (challenge.status !== 402) return { response: challenge };
      const quote = await challenge.json() as PaymentRequired;
      if (quote.resource?.url !== endpoint) throw new Error('Quote resource differs from the requested API URL');
      const signed = await signQuote(quote, signer, policy);
      const purchase: SavedPurchase = Object.freeze({ version: 1, endpoint, credentials: Object.freeze(signed.credentials), paymentHeader: signed.paymentHeader });
      validateRecord(purchase);
      await options.savePurchase(purchase);
      return submit(purchase, request.signal);
    },
    recover(purchase: SavedPurchase, request: { signal?: AbortSignal } = {}) { return submit(purchase, request.signal); },
  };
}
