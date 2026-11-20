import { isAddress } from 'viem';
import { ROBINHOOD_USDG, ROBINHOOD_TESTNET_USDG } from '../core/types.js';

export function assertMainnetBuyerPolicy(policy: {
  network: string; asset: string; maxAmount: bigint; payTo?: string; tokenName?: string; tokenVersion?: string;
}) {
  // The isolated development domain cannot authorize a production USDG transfer.
  if (policy.network === 'eip155:31337') return;
  const network = policy.network === 'eip155:4663' ? ROBINHOOD_USDG : policy.network === 'eip155:46630' ? ROBINHOOD_TESTNET_USDG : undefined;
  if (!network) throw new Error('Unsupported network: Paidbeam supports Robinhood Chain only');
  if (policy.asset?.toLowerCase() !== network.asset.toLowerCase() || policy.tokenName !== network.tokenName ||
      policy.tokenVersion !== network.tokenVersion || !policy.payTo || !isAddress(policy.payTo) || /^0x0{40}$/i.test(policy.payTo) ||
      policy.maxAmount <= 0n || policy.maxAmount >= 2n ** 256n) throw new Error('Mainnet and testnet require official Robinhood Chain USDG, its signing domain, an explicit recipient and a positive payment limit');
}
