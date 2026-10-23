import { PaymentServiceClient, protect } from 'paidbeam/merchant';

// Register the 'report' GET endpoint and its price on the payment service first.
export function paidReport(options: { paymentServiceUrl: string; merchantApiKey: string; publicOrigin: string }) {
  return protect({
    client: new PaymentServiceClient(options.paymentServiceUrl, options.merchantApiKey),
    endpointId: 'report', publicOrigin: options.publicOrigin,
  }, async () => Response.json({ report: 'Replace this with your read-only application handler.' }));
}
