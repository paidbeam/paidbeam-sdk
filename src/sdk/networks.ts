import { ETHEREUM_USDC } from '../core/types.js';
import { assertMainnetBuyerPolicy } from '../shared/mainnet.js';
import type { SdkBuyerPolicy } from './client.js';

/** Mainnet preset; the caller must choose the recipient and maximum charge. */
export function ethereumUsdcPolicy(options: { payTo: string; maxAmount: bigint }): SdkBuyerPolicy {
  const policy = { network: 'eip155:1', asset: ETHEREUM_USDC.asset, tokenName: ETHEREUM_USDC.tokenName,
    tokenVersion: ETHEREUM_USDC.tokenVersion, payTo: options.payTo, maxAmount: options.maxAmount };
  assertMainnetBuyerPolicy(policy);
  return policy;
}
export { ETHEREUM_USDC } from '../core/types.js';
