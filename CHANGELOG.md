# 0.2.0-rc.1 — Robinhood Chain

- Robinhood Chain mainnet USDG is the sole production network and asset; Robinhood testnet and isolated local testing remain available.
- Added `robinhoodUsdgPolicy`, `robinhoodTestnetUsdgPolicy`, `robinhoodChain`, `ROBINHOOD_USDG` and `ROBINHOOD_TESTNET_USDG` exports.
- Unsupported network policies and saved purchases are rejected before signing or submission.
- Updated browser-wallet example and USDG signing metadata. Merchant middleware and durable recovery interfaces are retained.
- Uses the existing repository and commit history; this is an incremental release, not a new repository.

# 0.1.0-rc.4 — security update

- Updated official x402 core and EVM dependencies to 2.31.0, using patched Zod 4.6.6 or newer.
- Removes the affected Zod 3 dependency chain without overrides or a protocol downgrade.
- Preserves merchant/buyer exports, order binding, Robinhood Chain mainnet USDG signing, and saved-purchase recovery.

# 0.1.0-rc.3

- MIT license approved and included for public SDK distribution.
- Standalone public source, Paidbeam author identity, and npm prerelease packaging.
- Merchant middleware and durable buyer recovery.

# Changelog

## 0.1.0-rc.2 — unpublished mainnet candidate

- Explicit recipient, amount and signing-domain checks.
- Added `robinhoodUsdgPolicy` and `ROBINHOOD_USDG` exports.
- Browser and Node examples with explicit development-network configuration.
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
