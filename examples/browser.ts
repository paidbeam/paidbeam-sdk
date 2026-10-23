import { createWalletClient, custom, type Address, type EIP1193Provider } from 'viem';
import { mainnet } from 'viem/chains';
import { createPaymentClient, type SavedPurchase } from 'paidbeam/buyer';

// The application obtains provider/account through its normal wallet connection UI.
export function browserBuyer(options: {
  provider: EIP1193Provider; address: Address; merchantOrigin: string;
  recipient: Address; savePurchase: (purchase: SavedPurchase) => Promise<void>;
}) {
  const wallet = createWalletClient({ account: options.address, chain: mainnet, transport: custom(options.provider) });
  return createPaymentClient({
    merchantOrigin: options.merchantOrigin,
    signer: { address: options.address, signTypedData: data => wallet.signTypedData(data) },
    policy: { network: 'eip155:1', asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      payTo: options.recipient, tokenName: 'USD Coin', tokenVersion: '2', maxAmount: 1_000_000n },
    savePurchase: options.savePurchase,
  });
}
