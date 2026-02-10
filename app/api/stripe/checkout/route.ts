import Stripe from 'stripe'
import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { db } from '@/db'
import { userProfiles } from '@/db/schema'
import { eq } from 'drizzle-orm'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(request: Request) {
  const { userId } = await auth()
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { priceId } = await request.json()

  // Find or create user profile
  let profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.clerkUserId, userId),
  })

  if (!profile) {
    const [newProfile] = await db
      .insert(userProfiles)
      .values({ clerkUserId: userId })
      .returning()
    profile = newProfile
  }

  // Find or create Stripe customer
  let customerId = profile.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerkUserId: userId },
    })
    customerId = customer.id
    await db
      .update(userProfiles)
      .set({ stripeCustomerId: customerId })
      .where(eq(userProfiles.clerkUserId, userId))
  }

  const origin = request.headers.get('origin') || ''

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${origin}/`,
    cancel_url: `${origin}/`,
    metadata: { clerkUserId: userId },
  })

  return NextResponse.json({ url: session.url })
}
