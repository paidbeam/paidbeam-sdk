# Paidbeam SDK

**Paidbeam SDK, package `paidbeam`, MIT licensed.** This candidate targets **Ethereum mainnet (chain 1)** and official Circle USDC. Signing a mainnet authorization can move real USDC after it is submitted. Sepolia and isolated local testing remain available through explicit policies for development.

One ESM TypeScript SDK provides a merchant entry point and a buyer entry point. Both use Fetch APIs. The buyer bundle runs without Node built-ins or a private key in its source; a wallet supplies `signTypedData`. Node 24.13+ is the tested server runtime. Existing generic x402 clients need our required `order-binding` extension.

## Install

```sh
npm install paidbeam@0.1.0-rc.3
```

This release candidate is distributed under the `next` tag:

```sh
npm install paidbeam@next
```

## Build from source

Use Node.js 24.13 or newer:

```sh
npm ci
npm run build
npm run check
npm test
npm pack
```

The generated tarball can also be installed in a separate application. Package availability does not imply that a public Paidbeam settlement-service endpoint is live.

## Accept a payment

Register your merchant wallet and GET endpoint/price on the payment service first. Keep your merchant credential on your server.

```ts
import { PaymentServiceClient, protect } from 'paidbeam/merchant';

const client = new PaymentServiceClient(
  process.env.PAYMENT_SERVICE_URL!,
  process.env.MERCHANT_API_KEY!,
);

export const GET = protect({
  client,
  endpointId: 'transaction-report',
  publicOrigin: 'https://api.your-domain.example',
}, async request => {
  const report = await generateReport(new URL(request.url).searchParams);
  return Response.json(report);
});
```

`generateReport` is your application code. The registered endpoint must match the path and method. `publicOrigin` is fixed configuration, never an untrusted forwarded header. This first release supports read-only GET handlers, UTF-8 JSON/text responses up to 1,000,000 bytes, and exact-price payments. A successful result is staged durably before settlement and released only after the configured confirmation policy. Handlers may be recomputed after a preparation lease expires and must not perform irreversible writes.

The SDK does not operate the payment service for you. The service operator manages mainnet activation, funding, payment limits and settlement pause controls separately. Onboarding currently uses our configured merchant registry; self-service registration and a public service URL are launch work.

## Make a recoverable mainnet purchase

```ts
import { createPaymentClient } from 'paidbeam/buyer';

const payments = createPaymentClient({
  merchantOrigin: 'https://api.your-domain.example',
  signer, // { address, signTypedData }; see examples/browser.ts
  policy: {
    network: 'eip155:1',
    asset: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    payTo: expectedMerchantWallet,
    tokenName: 'USD Coin',
    tokenVersion: '2',
    maxAmount: 1_000_000n, // Maximum 1 USDC for this purchase
  },
  savePurchase: async purchase => {
    await privatePurchaseStore.save(purchase);
  },
});

const attempt = await payments.purchase('/api/transaction-report?hash=' + hash);
if (attempt.response.status === 202) {
  // Wait according to Retry-After, then reuse attempt.purchase.
  const later = await payments.recover(attempt.purchase!);
}
```

`signer`, `expectedMerchantWallet`, `privatePurchaseStore` and `hash` are application inputs. The SDK verifies the configured origin, exact resource, recipient, token signing domain, network and maximum price before asking the wallet to sign. It awaits `savePurchase` before submitting the authorization. **Storage failure means no authorization submission.**

Recovery records contain bearer credentials and a signed payment authorization. Save them privately and durably; never put them in public URLs, source control or analytics. The SDK deliberately has no default localStorage store. See `examples/node.ts` for protected local files. Production storage should use your application's access controls and encryption.

Each `purchase()` invocation can create a new payable order. If its result is pending, failed or ambiguous, use `recover(savedPurchase)`; do not call `purchase()` again for that order. Recovery reuses the exact endpoint, credentials and authorization, makes no new quote, and requests no new signature. It also works after quote expiry for already accepted/settled orders. It cannot revive an authorization that expired before the service accepted it.

## Results and failures

| Result | Action |
|---|---|
| 2xx except 202 with payment receipt | Read the paid response; retain the recovery record |
| 202 | Still pending; respect Retry-After and recover the same record |
| 503 after submission | Dependency unavailable; retain/recover the same record |
| 409 | Inspect the existing order with the merchant/operator; do not pay again |
| 402 during recovery | Existing order not accepted or authorization invalid/expired; inspect before attempting a new purchase |
| `PaymentAttemptError` | Response is uncertain; recover the already saved record |
| Initial response is not 402 | Returned unchanged, without signing or a purchase record; it is not SDK proof of payment |

The SDK checks the shape/network of a successful merchant payment receipt. Independent blockchain receipt verification is performed by the settlement service, not the browser helper. HTTP redirects are refused. Requests omit browser cookies; session-dependent responses are outside this version's request binding. Cross-origin browser integrations must configure CORS on their own merchant API, including payment headers. Same-origin use needs no extra CORS setup.

Only EOA buyers are supported. Contract wallets, delegated accounts, POST handlers, streaming, subscriptions, variable charges and generic facilitator compatibility are not supported yet. Mainnet signing requires the official Ethereum USDC asset/domain plus an explicit recipient and maximum amount. The service separately requires mainnet activation and gas/payment limits.

## Public entry points

- `paidbeam/merchant`: `protect`, `PaymentServiceClient`, payment header names, merchant types and `PaymentError`.
- `paidbeam/buyer`: `createPaymentClient`, `PaymentAttemptError`, `signQuote`, `recoveryHeaders`, buyer policy and recovery types, plus `ethereumUsdcPolicy` and `ETHEREUM_USDC`.
- `paidbeam`: combined exports for Node/server applications.

No settlement private keys, database implementation, workers or deployment configuration are included. See [CHANGELOG.md](CHANGELOG.md) for changes and [CONTRIBUTING.md](CONTRIBUTING.md) for local verification. Source, examples and support issues live in this repository.

## License

MIT. See [LICENSE](LICENSE). The private Paidbeam settlement service is distributed separately.
