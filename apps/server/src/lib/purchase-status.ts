import prisma from "@viraltiktokslideshows/db";
import type { Purchase } from "@viraltiktokslideshows/db";

import { dodo } from "./dodo";

// A PENDING purchase only ever leaves that state via the Dodo webhook (see
// /api/webhooks/dodo) or the payment_id-based fallback /api/checkout/status
// polls with -- neither of which fires for a purchase nobody's actively
// watching: an abandoned checkout tab, a webhook that never reaches
// http://localhost in dev, or someone who paid and then closed the browser
// before the redirect back to /generate/success finished. Those rows just
// sit at PENDING ("Confirming payment...") on /dashboard forever with
// nothing to ever reconcile them.
//
// This looks the underlying Dodo checkout session up directly by the id
// already stored on the row (dodoCheckoutId) -- unlike the payment_id
// fallback, it needs nothing from the client, so it works for *any* stale
// PENDING row, not just the one purchase currently being polled from
// /generate/success. A session that's gone a long time without ever
// producing a payment (payment_id still null) is treated as abandoned
// rather than left pending indefinitely.
const ABANDONED_AFTER_MS = 1000 * 60 * 30;

export async function reconcilePendingPurchase<T extends Purchase>(purchase: T): Promise<T> {
  if (purchase.status !== "PENDING" || !purchase.dodoCheckoutId) {
    return purchase;
  }

  try {
    const session = await dodo.checkoutSessions.retrieve(purchase.dodoCheckoutId);

    if (session.payment_status === "succeeded" && session.payment_id) {
      return (await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "PAID", dodoPaymentId: session.payment_id },
      })) as T;
    }
    if (session.payment_status === "failed") {
      return (await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "FAILED" },
      })) as T;
    }
    if (session.payment_status === "cancelled") {
      return (await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "CANCELED" },
      })) as T;
    }

    // Still no payment attached to the session at all -- the customer
    // never got past Dodo's checkout page (or abandoned it partway
    // through). Give up waiting after a while so this doesn't stay
    // "Confirming payment" on /dashboard forever; they can always just
    // regenerate and try again.
    if (!session.payment_id && Date.now() - purchase.createdAt.getTime() > ABANDONED_AFTER_MS) {
      return (await prisma.purchase.update({
        where: { id: purchase.id },
        data: { status: "FAILED" },
      })) as T;
    }
  } catch (error) {
    // Lookup failing (bad/expired session id, transient Dodo error, etc.)
    // isn't fatal -- whatever's calling this just keeps showing PENDING
    // for now and can try reconciling again on the next request.
    console.error("Dodo checkout session reconciliation failed", error);
  }

  return purchase;
}

// Batch form for list endpoints (GET /api/purchases) -- reconciles every
// PENDING row in parallel rather than one at a time. Purchases that aren't
// PENDING (or have no checkout session yet) pass straight through, so it's
// safe to map this over an entire purchase list unconditionally.
export async function reconcilePendingPurchases<T extends Purchase>(purchases: T[]): Promise<T[]> {
  return Promise.all(purchases.map((purchase) => reconcilePendingPurchase(purchase)));
}
