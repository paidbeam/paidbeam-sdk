import { createWalletClient, custom, type Address, type EIP1193Provider } from 'viem';
import { createPaymentClient, robinhoodChain, robinhoodUsdgPolicy, type SavedPurchase } from 'paidbeam/buyer';

// The application obtains provider/account through its normal wallet connection UI.
export function browserBuyer(options: {
  provider: EIP1193Provider; address: Address; merchantOrigin: string;
  recipient: Address; savePurchase: (purchase: SavedPurchase) => Promise<void>;
}) {
  const wallet = createWalletClient({ account: options.address, chain: robinhoodChain, transport: custom(options.provider) });
  return createPaymentClient({
    merchantOrigin: options.merchantOrigin,
    signer: { address: options.address, signTypedData: async data => {
      const chainId = await options.provider.request({ method: 'eth_chainId' });
      if (BigInt(String(chainId)) !== 4663n) throw new Error('Connect your wallet to Robinhood Chain');
      return wallet.signTypedData(data);
    } },
    policy: robinhoodUsdgPolicy({ payTo: options.recipient, maxAmount: 1_000_000n }),
    savePurchase: options.savePurchase,
  });
}
