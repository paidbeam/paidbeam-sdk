import { isAddress } from 'viem';
import { ETHEREUM_USDC } from '../core/types.js';

export function assertMainnetBuyerPolicy(policy: {
  network: string; asset: string; maxAmount: bigint; payTo?: string; tokenName?: string; tokenVersion?: string;
}) {
  if (policy.network !== 'eip155:1') return;
  if (policy.asset.toLowerCase() !== ETHEREUM_USDC.asset.toLowerCase() || policy.tokenName !== ETHEREUM_USDC.tokenName ||
      policy.tokenVersion !== ETHEREUM_USDC.tokenVersion || !policy.payTo || !isAddress(policy.payTo) || /^0x0{40}$/i.test(policy.payTo) ||
      policy.maxAmount <= 0n || policy.maxAmount >= 2n ** 256n) throw new Error('Mainnet requires official Ethereum USDC, its signing domain, an explicit recipient and a positive payment limit');
}
