import { authorizationTypes } from '@x402/evm';
import { PaymentError, type BoundPayload, type NetworkConfig } from '../core/types.js';

/** UTF-8 header encoding shared by Node and browser consumers. */
export function encodeHeader(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}
export function decodeHeader(value: string): unknown {
  if (value.length > 24_000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new PaymentError('invalid_payment_header', 400, 'Invalid payment header');
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(atob(value), c => c.charCodeAt(0)))); }
  catch { throw new PaymentError('invalid_payment_header', 400, 'Invalid payment header'); }
}
export function typedAuthorization(network: NetworkConfig, auth: BoundPayload['payload']['authorization']) {
  return {
    domain: { name: network.tokenName, version: network.tokenVersion, chainId: network.chainId, verifyingContract: network.asset },
    types: authorizationTypes, primaryType: 'TransferWithAuthorization' as const,
    message: { ...auth, value: BigInt(auth.value), validAfter: BigInt(auth.validAfter), validBefore: BigInt(auth.validBefore) },
  };
}
