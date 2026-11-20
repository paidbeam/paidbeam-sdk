import type { Address, Hex } from 'viem';
import type { PaymentRequirements, PaymentRequired, PaymentPayload } from '@x402/core/types';

export type { PaymentRequirements, PaymentRequired, PaymentPayload };
export type PaymentState = 'quoted' | 'authorized' | 'settlement_pending' | 'settled' | 'settlement_failed' | 'recovery_required';
export type DeliveryState = 'not_started' | 'preparing' | 'ready' | 'delivered';
export interface NetworkConfig {
  chainId: number; asset: Address; tokenName: string; tokenVersion: string;
}
export const ROBINHOOD_USDG: NetworkConfig = {
  chainId: 4663, asset: '0x5fc5360D0400a0Fd4f2af552ADD042D716F1d168', tokenName: 'Global Dollar', tokenVersion: '1',
};
export const ROBINHOOD_TESTNET_USDG: NetworkConfig = {
  chainId: 46630, asset: '0x7E955252E15c84f5768B83c41a71F9eba181802F', tokenName: 'Global Dollar', tokenVersion: '1',
};
export interface Merchant {
  id: string; apiKey: string; recipient: Address;
  endpoints: Record<string, { method: 'GET'; path: string; amount: string; description: string }>;
}
export interface Authorization {
  from: Address; to: Address; value: string; validAfter: string; validBefore: string; nonce: Hex;
}
export interface BoundPayload extends PaymentPayload {
  payload: { authorization: Authorization; signature: Hex };
}
export interface CachedResult { status: number; headers: Record<string, string>; body: string }
export interface PreparedTransaction {
  raw: Hex; hash: Hex; signer: Address; nonce: number; reservedGasWei: string;
}
export interface Order {
  id: string; merchantId: string; endpointId: string; requestHash: Hex;
  resource: string; method: string; requirements: PaymentRequirements;
  nonce: Hex; accessHash: string; createdAt: number; expiresAt: number;
  payment: PaymentState; delivery: DeliveryState;
  authorization?: BoundPayload; result?: CachedResult; prepared?: PreparedTransaction;
  transaction?: Hex; blockHash?: Hex; blockNumber?: string;
  lease?: { owner: string; until: number }; error?: string;
  settledAt?: number; deliveredAt?: number; mode: 'simulation' | 'robinhood';
  gasAccountedDay?: string;
}
export interface Quote { orderId: string; accessToken: string; paymentRequired: PaymentRequired }
export class PaymentError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}
