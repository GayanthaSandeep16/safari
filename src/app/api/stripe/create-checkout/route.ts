
// app/api/stripe/create-checkout/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { v } from 'convex/values';
import { api } from '../../../../../convex/_generated/api';
import { mutation } from '../../../../../convex/_generated/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion:'2025-05-28.basil' });

export async function POST(request: Request) {
  const { shareToken, userId } = await request.json();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: 'Group Join Fee' },
          unit_amount: 100, // $1 in cents
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_URL}/groups?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/groups?cancelled=true`,
    metadata: { shareToken, userId },
  });



  return NextResponse.json({ sessionId: session.id });
}

// Add to mutations.ts
export const createPayment = mutation({
  args: {
    userId: v.id('users'),
    amount: v.number(),
    currency: v.string(),
    method: v.string(),
    status: v.union(v.literal('pending'), v.literal('completed'), v.literal('failed'), v.literal('refunded')),
    transactionId: v.string(),
    timestamp: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('payments', args);
  },
});