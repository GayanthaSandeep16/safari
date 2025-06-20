// app/api/stripe/webhook/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { api } from '../../../../../convex/_generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { Id } from '../../../../../convex/_generated/dataModel';

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-05-28.basil' });

export async function POST(request: Request) {
  const sig = request.headers.get('stripe-signature')!;
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const { shareToken, userId } = session.metadata!;

    if (!shareToken || !userId) {
        return NextResponse.json({ error: 'Missing shareToken or userId in metadata' }, { status: 400 });
    }

    const paymentId = await convex.mutation(api.mutations.updatePayment, {
      transactionId: session.id,
      status: 'completed',
    });

    if (paymentId) {
      await convex.mutation(api.mutations.joinGroup, {
        shareToken,
        userId: userId as Id<"users">,
        paymentId,
      });
    } else {
        console.error(`Could not find payment to update for transactionId: ${session.id}`);
        return NextResponse.json({ error: 'Payment record not found.' }, { status: 404 });
    }
  }

  return NextResponse.json({ received: true });
}