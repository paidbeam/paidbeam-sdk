import type { Address, Hex } from 'viem';
import type { PaymentRequired } from '@x402/core/types';
import { encodeHeader, typedAuthorization } from '../shared/wire.js';
import { ACCESS_HEADER, ORDER_HEADER } from '../shared/headers.js';
import type { BoundPayload } from '../core/types.js';
import { assertMainnetBuyerPolicy } from '../shared/mainnet.js';

export interface PurchaseCredentials { orderId: string; accessToken: string }
export interface BuyerPolicy {
  network: string; asset: string; maxAmount: bigint; allowSimulation?: boolean;
  payTo?: string; tokenName?: string; tokenVersion?: string;
}
export interface PaymentSigner {
  address: Address;
  signTypedData: (data: ReturnType<typeof typedAuthorization>) => Promise<Hex>;
}
/** Extension-aware signing: one EIP-712 signature, no transaction submission by the buyer. */
export async function signQuote(quote: PaymentRequired, signer: PaymentSigner, policy: BuyerPolicy): Promise<{ credentials: PurchaseCredentials; paymentHeader: string }> {
  const requirement = quote.accepts[0];
  assertMainnetBuyerPolicy(policy);
  const extension = quote.extensions?.['order-binding'] as { info?: unknown } | undefined;
  const info = extension?.info as { version: number; orderId: string; accessToken: string; nonce: Hex; expiresAt: number; mode: string } | undefined;
  if (!requirement || !info || info.version !== 1 || !/^0x[\da-fA-F]{64}$/.test(info.nonce)) throw new Error('Supported order-binding extension required');
  if (quote.x402Version !== 2 || requirement.scheme !== 'exact' || requirement.network !== policy.network || requirement.asset.toLowerCase() !== policy.asset.toLowerCase() || BigInt(requirement.amount) > policy.maxAmount || BigInt(requirement.amount) <= 0n || !signer.signTypedData) throw new Error('Quote violates buyer policy');
  if ((policy.payTo && requirement.payTo.toLowerCase() !== policy.payTo.toLowerCase()) ||
      (policy.tokenName && requirement.extra?.name !== policy.tokenName) ||
      (policy.tokenVersion && requirement.extra?.version !== policy.tokenVersion)) throw new Error('Quote recipient or token domain violates buyer policy');
  if (info.mode === 'simulation' && !policy.allowSimulation) throw new Error('Simulation requires an explicit opt-in');
  if (requirement.network === 'eip155:1' && info.mode !== 'ethereum') throw new Error('Mainnet quotes must use Ethereum settlement, never simulation');
  if (info.expiresAt <= Date.now()) throw new Error('Quote expired');
  const authorization = { from: signer.address, to: requirement.payTo as Hex, value: requirement.amount, validAfter: '0', validBefore: Math.floor(info.expiresAt / 1000).toString(), nonce: info.nonce };
  const signature = await signer.signTypedData(typedAuthorization({ chainId: Number(requirement.network.split(':')[1]), asset: requirement.asset as Hex, tokenName: String(requirement.extra?.name), tokenVersion: String(requirement.extra?.version) }, authorization));
  const payload: BoundPayload = { x402Version: 2, accepted: requirement, resource: quote.resource, payload: { authorization, signature } };
  return { credentials: { orderId: info.orderId, accessToken: info.accessToken }, paymentHeader: encodeHeader(payload) };
}
export function recoveryHeaders(credentials: PurchaseCredentials): Record<string, string> {
  return { [ORDER_HEADER]: credentials.orderId, [ACCESS_HEADER]: credentials.accessToken };
}
