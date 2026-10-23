import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { privateKeyToAccount } from 'viem/accounts';
import { createPaymentClient, type SavedPurchase, type PaymentSigner } from 'paidbeam/buyer';

// The buyer's own Ethereum wallet key. This is never a merchant API key or settlement signer key.
export function nodeBuyer(options: { buyerPrivateKey: `0x${string}`; merchantOrigin: string; recipient: string; privateDirectory: string }) {
  const directory = resolve(options.privateDirectory);
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const signer: PaymentSigner = privateKeyToAccount(options.buyerPrivateKey);
  const client = createPaymentClient({ merchantOrigin: options.merchantOrigin, signer,
    policy: { network: 'eip155:1', asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      payTo: options.recipient, tokenName: 'USD Coin', tokenVersion: '2', maxAmount: 1_000_000n },
    savePurchase: purchase => {
      writeFileSync(resolve(directory, purchase.credentials.orderId + '.json'), JSON.stringify(purchase), { mode: 0o600, flag: 'wx' });
    },
  });
  return { client, recoverFile: (path: string) => client.recover(JSON.parse(readFileSync(path, 'utf8')) as SavedPurchase) };
}
