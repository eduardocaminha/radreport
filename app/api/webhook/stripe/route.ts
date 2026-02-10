import Stripe from 'stripe'
import { db } from '@/db'
import { userProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

// Map Stripe price IDs to tiers
const PRICE_TO_TIER: Record<string, 'free' | 'pro' | 'enterprise'> = {
  [process.env.STRIPE_PRICE_PRO || '']: 'pro',
  [process.env.STRIPE_PRICE_ENTERPRISE || '']: 'enterprise',
}

function tierFromPriceId(priceId: string): 'free' | 'pro' | 'enterprise' {
  return PRICE_TO_TIER[priceId] || 'free'
}

export async function POST(request: Request) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return new Response('Missing signature', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const clerkUserId = session.metadata?.clerkUserId
      if (!clerkUserId) break

      const subscriptionId = session.subscription as string

      // Fetch subscription to get price ID
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      const priceId = subscription.items.data[0]?.price.id || ''
      const tier = tierFromPriceId(priceId)

      await db
        .update(userProfiles)
        .set({
          tier,
          stripeSubscriptionId: subscriptionId,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.clerkUserId, clerkUserId))
      break
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription
      const priceId = subscription.items.data[0]?.price.id || ''
      const tier = tierFromPriceId(priceId)

      await db
        .update(userProfiles)
        .set({ tier, updatedAt: new Date() })
        .where(eq(userProfiles.stripeSubscriptionId, subscription.id))
      break
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription

      await db
        .update(userProfiles)
        .set({
          tier: 'free',
          stripeSubscriptionId: null,
          updatedAt: new Date(),
        })
        .where(eq(userProfiles.stripeSubscriptionId, subscription.id))
      break
    }
  }

  return new Response('ok')
}
