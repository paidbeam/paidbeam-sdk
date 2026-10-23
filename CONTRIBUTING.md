# Contributing

Use Node.js 24.13 or newer. Run `npm ci`, `npm run build`, `npm run check` and `npm test` before opening a pull request. Examples import the package itself, so build before typechecking.

Tests use ephemeral signing keys, mocked HTTP responses and browser bundles. They never submit Ethereum transactions or require production secrets. Keep credentials and buyer recovery records out of source, test output and issues.

The first release targets Ethereum mainnet USDC, exact-price GET requests and EOA wallets. The order-binding extension is required. Do not describe this candidate as published, audited or a live hosted payment service.

Only this SDK is MIT-licensed and published from this repository. The separate settlement service, signer, database and operational deployment are not part of this package.
