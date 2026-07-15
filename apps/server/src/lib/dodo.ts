import { env } from "@viraltiktokslideshows/env/server";
import DodoPayments from "dodopayments";

export const dodo = new DodoPayments({
  bearerToken: env.DODO_PAYMENTS_API_KEY,
  environment: env.DODO_PAYMENTS_ENVIRONMENT,
});

// Loosely typed on purpose: the SDK's checkout-session response shape isn't
// pinned down anywhere we could verify against a live Dodo account from
// here, so this only asserts the one field every call-site actually needs.
export type DodoCheckoutSession = {
  checkout_url: string;
  session_id?: string;
  id?: string;
};

export async function createUnlockCheckoutSession(options: {
  purchaseId: string;
  customerEmail: string;
  customerName: string;
  returnUrl: string;
}) {
  const session = (await dodo.checkoutSessions.create({
    product_cart: [{ product_id: env.DODO_UNLOCK_PRODUCT_ID, quantity: 1 }],
    customer: { email: options.customerEmail, name: options.customerName },
    return_url: options.returnUrl,
    metadata: { purchaseId: options.purchaseId },
  })) as DodoCheckoutSession;

  return session;
}

// Dodo's hosted Customer Portal — lets a customer manage payment methods
// and view invoice/payment history themselves, so Settings > Plan & Billing
// doesn't need to build any of that UI (or store card details) itself.
// Requires a Dodo customer id, which only exists once someone has actually
// paid at least once — see the dodoCustomerId capture in the
// /api/webhooks/dodo handler in index.ts.
export type DodoPortalSession = { link: string };

export async function createBillingPortalSession(
  customerId: string,
  returnUrl?: string,
): Promise<DodoPortalSession> {
  const session = (await dodo.customers.customerPortal.create(
    customerId,
    returnUrl ? { return_url: returnUrl } : undefined,
  )) as DodoPortalSession;

  return session;
}
