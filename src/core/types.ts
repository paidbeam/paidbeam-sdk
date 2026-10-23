import type { Address, Hex } from 'viem';
import type { PaymentRequirements, PaymentRequired, PaymentPayload } from '@x402/core/types';

export type { PaymentRequirements, PaymentRequired, PaymentPayload };
export type PaymentState = 'quoted' | 'authorized' | 'settlement_pending' | 'settled' | 'settlement_failed' | 'recovery_required';
export type DeliveryState = 'not_started' | 'preparing' | 'ready' | 'delivered';
export interface NetworkConfig {
  chainId: number; asset: Address; tokenName: string; tokenVersion: string;
}
export const ETHEREUM_USDC: NetworkConfig = {
  chainId: 1, asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', tokenName: 'USD Coin', tokenVersion: '2',
};
export const SEPOLIA_USDC: NetworkConfig = {
  chainId: 11155111, asset: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', tokenName: 'USDC', tokenVersion: '2',
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
  settledAt?: number; deliveredAt?: number; mode: 'simulation' | 'ethereum';
  gasAccountedDay?: string;
}
export interface Quote { orderId: string; accessToken: string; paymentRequired: PaymentRequired }
export class PaymentError extends Error {
  constructor(public code: string, public status: number, message: string) { super(message); }
}
