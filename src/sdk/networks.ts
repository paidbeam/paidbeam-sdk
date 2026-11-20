import { defineChain, type Chain } from 'viem';
import { ROBINHOOD_USDG, ROBINHOOD_TESTNET_USDG } from '../core/types.js';
import { assertMainnetBuyerPolicy } from '../shared/mainnet.js';
import type { SdkBuyerPolicy } from './client.js';

/** Mainnet preset; the caller must choose the recipient and maximum charge. */
export function robinhoodUsdgPolicy(options: { payTo: string; maxAmount: bigint }): SdkBuyerPolicy {
  const policy = { network: 'eip155:4663', asset: ROBINHOOD_USDG.asset, tokenName: ROBINHOOD_USDG.tokenName,
    tokenVersion: ROBINHOOD_USDG.tokenVersion, payTo: options.payTo, maxAmount: options.maxAmount };
  assertMainnetBuyerPolicy(policy);
  return policy;
}
export { ROBINHOOD_USDG } from '../core/types.js';

export function robinhoodTestnetUsdgPolicy(options: { payTo: string; maxAmount: bigint }): SdkBuyerPolicy {
  const policy = { network: 'eip155:46630', asset: ROBINHOOD_TESTNET_USDG.asset, tokenName: ROBINHOOD_TESTNET_USDG.tokenName,
    tokenVersion: ROBINHOOD_TESTNET_USDG.tokenVersion, payTo: options.payTo, maxAmount: options.maxAmount };
  assertMainnetBuyerPolicy(policy);
  return policy;
}
export const robinhoodChain: Chain = defineChain({
  id: 4663, name: 'Robinhood Chain', nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
  rpcUrls: { default: { http: ['https://rpc.mainnet.chain.robinhood.com'] } },
  blockExplorers: { default: { name: 'Blockscout', url: 'https://robinhoodchain.blockscout.com' } },
});
export { ROBINHOOD_TESTNET_USDG } from '../core/types.js';
