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

  const profile = await db.query.userProfiles.findFirst({
    where: eq(userProfiles.clerkUserId, userId),
  })

  if (!profile?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No active subscription' },
      { status: 400 }
    )
  }

  const origin = request.headers.get('origin') || ''

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripeCustomerId,
    return_url: `${origin}/`,
  })

  return NextResponse.json({ url: session.url })
}
