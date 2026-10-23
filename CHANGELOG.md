# 0.1.0-rc.3

- MIT license approved and included for public SDK distribution.
- Standalone public source, Paidbeam author identity, and npm prerelease packaging.
- Merchant middleware and durable buyer recovery for Ethereum mainnet USDC.

# Changelog

## 0.1.0-rc.2 — unpublished mainnet candidate

- Ethereum mainnet USDC signing with explicit recipient, amount and official signing-domain checks.
- Added `ethereumUsdcPolicy` and `ETHEREUM_USDC` exports.
- Browser and Node examples target Ethereum mainnet; development networks require explicit configuration.
- Separate service activation, gas budget, payment cap and pause checks.

## 0.1.0-rc.1 — historical unpublished candidate

- Renamed the app and SDK to Paidbeam; updated package installation, imports and examples.
- Separate merchant and buyer exports, TypeScript declarations and explicit package file allowlist.
- Fetch middleware without Node database/server imports, plus UTF-8 browser-compatible payment headers.
- Buyer origin, resource, recipient, token-domain and price checks before signing.
- Required purchase persistence before submission and recovery without creating another order or signature.
- Merchant, Node buyer and browser-wallet integration examples.
- Clean-install, public-export, typecheck, browser-bundle and payment/recovery verification.

The product and SDK are now named Paidbeam; the package is `paidbeam`, with `/merchant` and `/buyer` entry points. This candidate has not been published. Public publication and license approval remain public launch gates. This historical candidate had mainnet disabled; rc.2 adds explicit mainnet support.
