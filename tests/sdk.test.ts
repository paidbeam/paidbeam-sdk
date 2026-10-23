import { test } from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto, randomUUID } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { build } from 'esbuild';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { recoverTypedDataAddress } from 'viem';
import { createPaymentClient, PaymentAttemptError, ethereumUsdcPolicy, ETHEREUM_USDC } from '../src/sdk/buyer.js';
import { protect, PaymentServiceClient } from '../src/sdk/merchant.js';
import { encodeHeader, decodeHeader, typedAuthorization } from '../src/shared/wire.js';
import type { BoundPayload, PaymentRequired } from '../src/core/types.js';

const recipient = '0x000000000000000000000000000000000000bEEF';
const origin = 'https://api.merchant.example';
const endpoint = origin + '/report';
function quote(): PaymentRequired {
  return { x402Version: 2, resource: { url: endpoint }, accepts: [{ scheme: 'exact', network: 'eip155:1', asset: ETHEREUM_USDC.asset,
    amount: '1000000', payTo: recipient, maxTimeoutSeconds: 300, extra: { name: 'USD Coin', version: '2' } }],
    extensions: { 'order-binding': { info: { version: 1, orderId: randomUUID(), accessToken: 'test-only-recovery-token',
      nonce: ('0x' + '11'.repeat(32)), expiresAt: Date.now() + 300_000, mode: 'ethereum' } } } };
}
function paymentResponse() {
  // Mocked receipt; no blockchain transaction is submitted by any test.
  return Response.json({ report: 'recoverable response' }, { headers: { 'PAYMENT-RESPONSE': encodeHeader({ success: true, network: 'eip155:1', transaction: '0x' + '22'.repeat(32) }) } });
}

test('mainnet purchase persists before submission, verifies the signature and recovers without signing again', async () => {
  const account = privateKeyToAccount(generatePrivateKey()); let signatures = 0; let calls = 0; let saved: any;
  const client = createPaymentClient({ merchantOrigin: origin,
    signer: { address: account.address, signTypedData: async data => { signatures++; return account.signTypedData(data); } },
    policy: ethereumUsdcPolicy({ payTo: recipient, maxAmount: 1_000_000n }), savePurchase: p => { saved = p; },
    fetch: async (_url, init) => {
      if (++calls === 1) return Response.json(quote(), { status: 402 });
      assert.ok(saved); assert.equal(init?.redirect, 'error'); assert.equal(init?.credentials, 'omit');
      const payload = decodeHeader(new Headers(init?.headers).get('PAYMENT-SIGNATURE')!) as BoundPayload;
      assert.equal(await recoverTypedDataAddress({ ...typedAuthorization(ETHEREUM_USDC, payload.payload.authorization), signature: payload.payload.signature }), account.address);
      if (calls === 2) throw new Error('Mock lost response');
      return paymentResponse();
    } });
  await assert.rejects(client.purchase(endpoint), error => {
    assert.ok(error instanceof PaymentAttemptError); assert.equal(error.purchase, saved);
    assert.equal(JSON.stringify(error).includes(saved.credentials.accessToken), false); return true;
  });
  const response = await client.recover(saved); assert.equal(response.response.status, 200);
  assert.equal((await response.response.json() as any).report, 'recoverable response');
  assert.equal(signatures, 1); assert.equal(calls, 3);
});

test('wrong price, recipient, domain, resource or network never reaches the wallet', async () => {
  for (const mutate of [
    (q: PaymentRequired) => { q.accepts[0]!.amount = '1000001'; },
    (q: PaymentRequired) => { q.accepts[0]!.payTo = '0x0000000000000000000000000000000000000001'; },
    (q: PaymentRequired) => { q.accepts[0]!.extra = { name: 'Wrong token', version: '2' }; },
    (q: PaymentRequired) => { q.resource = { url: origin + '/other' }; },
    (q: PaymentRequired) => { q.accepts[0]!.network = 'eip155:11155111'; },
  ]) {
    const account = privateKeyToAccount(generatePrivateKey()); let signed = false;
    const q = quote(); mutate(q);
    const client = createPaymentClient({ merchantOrigin: origin, signer: { address: account.address, signTypedData: async data => { signed = true; return account.signTypedData(data); } },
      policy: ethereumUsdcPolicy({ payTo: recipient, maxAmount: 1_000_000n }), savePurchase: () => {}, fetch: async () => Response.json(q, { status: 402 }) });
    await assert.rejects(client.purchase(endpoint)); assert.equal(signed, false);
  }
});

test('failed durable storage prevents submission of the authorization', async () => {
  let calls = 0;
  const client = createPaymentClient({ merchantOrigin: origin, signer: privateKeyToAccount(generatePrivateKey()),
    policy: ethereumUsdcPolicy({ payTo: recipient, maxAmount: 1_000_000n }),
    savePurchase: () => { throw new Error('Storage unavailable'); },
    fetch: async () => { calls++; return Response.json(quote(), { status: 402 }); } });
  await assert.rejects(client.purchase(endpoint), /Storage unavailable/); assert.equal(calls, 1);
});

test('merchant entry produces an order-bound challenge using only the server credential', async () => {
  const q = quote(); const info = (q.extensions!['order-binding'] as any).info;
  const client = new PaymentServiceClient('https://service.merchant.example', 'test-only-merchant-credential', async (_url, init) => {
    assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer test-only-merchant-credential');
    return Response.json({ orderId: info.orderId, accessToken: info.accessToken, paymentRequired: q }, { status: 201 });
  });
  const handler = protect({ client, endpointId: 'report', publicOrigin: origin }, async () => { throw new Error('Unpaid handler must not execute'); });
  const response = await handler(new Request(endpoint)); assert.equal(response.status, 402);
  assert.equal(response.headers.get('PAYMENT-ORDER-ID'), info.orderId);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await response.json() as PaymentRequired).accepts[0]!.network, 'eip155:1');
});

test('buyer bundle executes without Node globals and signs no new authorization during recovery', async () => {
  const bundle = await build({ entryPoints: ['src/sdk/buyer.ts'], bundle: true, platform: 'browser', format: 'iife', globalName: 'PaidbeamSDK', target: 'es2022', write: false });
  const sandbox: Record<string, any> = { TextEncoder, TextDecoder, btoa, atob, URL, Headers, Request, Response, AbortSignal, crypto: webcrypto, setTimeout, clearTimeout };
  runInNewContext(bundle.outputFiles[0]!.text, sandbox, { timeout: 10_000 });
  assert.equal(sandbox.Buffer, undefined); assert.equal(sandbox.process, undefined); assert.equal(sandbox.require, undefined);
  let saved: any; let requests = 0;
  const client = sandbox.PaidbeamSDK.createPaymentClient({ merchantOrigin: origin, signer: privateKeyToAccount(generatePrivateKey()),
    policy: ethereumUsdcPolicy({ payTo: recipient, maxAmount: 1_000_000n }), savePurchase: (p: any) => { saved = p; },
    fetch: async () => ++requests === 1 ? Response.json(quote(), { status: 402 }) : paymentResponse() });
  const first = await client.purchase(endpoint); const original = await first.response.text();
  assert.equal(await (await client.recover(saved)).response.text(), original); assert.equal(requests, 3);
});
