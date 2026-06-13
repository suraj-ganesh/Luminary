import express, { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_dummy', {
  apiVersion: '2026-04-22.dahlia' as any,
});

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// POST /api/stripe/create-checkout-session
router.post('/create-checkout-session', async (req: Request, res: Response) => {
  try {
    let { priceId, productId, userId, userEmail } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // If only productId is provided, fetch the first active price
    if (!priceId && productId) {
      const prices = await stripe.prices.list({
        product: productId,
        active: true,
        limit: 1,
      });
      
      if (prices.data.length === 0 || !prices.data[0]) {
        return res.status(404).json({ error: 'No active prices found for this product' });
      }
      priceId = prices.data[0].id;
    }

    if (!priceId) {
      return res.status(400).json({ error: 'Missing priceId or productId' });
    }

    // Get or create customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail,
        metadata: { userId },
      });
      customerId = customer.id;

      await supabase
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.FRONTEND_URL || 'http://ai-luminary.vercel.app'}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'http://ai-luminary.vercel.app'}/pricing`,
      metadata: { userId },
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Checkout error:', error);
    return res.status(500).json({ error: error.message });
  }
});

// POST /api/stripe/webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: any;

  try {
    console.log('🔔 Incoming Stripe webhook:', { url: req.originalUrl });
    console.log('Headers keys:', Object.keys(req.headers));
    console.log('Stripe signature header present:', !!sig);

    // req.body is a Buffer because we're using express.raw
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    console.log(`Raw body length: ${rawBody.length}`);
    const preview = rawBody.toString('utf8').slice(0, 1000);
    console.log('Payload preview (first 1000 chars):', preview);

    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook Error while constructing event:', err?.message || err);
    try {
      // Attempt to log raw string body for debugging (truncate)
      const s = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : JSON.stringify(req.body);
      console.error('Raw body (truncated):', s.slice(0, 2000));
    } catch (e) {
      console.error('Failed to stringify raw body for debug:', e);
    }
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  console.log(`🔔 Received event: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        console.log('Checkout session object preview:', JSON.stringify(session).slice(0, 1000));
        const userId = session.metadata?.userId;
        console.log(`📦 Checkout session completed. Metadata userId: ${userId}`);

        if (userId) {
          console.log(`🔄 Attempting to upgrade user ${userId} to PRO...`);

          const { data, error } = await supabase
            .from('profiles')
            .update({
              plan: 'pro',
              subscription_status: 'active',
              updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select();

          if (error) {
            console.error(`❌ Database update failed for user ${userId}:`, error);
          } else if (!data || data.length === 0) {
            console.warn(`⚠️ No profile found for user ${userId}. Creating one...`);
            const upsertRes = await supabase
              .from('profiles')
              .upsert({
                id: userId,
                plan: 'pro',
                subscription_status: 'active',
                updated_at: new Date().toISOString()
              });
            console.log('Upsert result:', upsertRes.error || 'ok');
          } else {
            console.log(`✅ Profile updated for user ${userId}`, data);
          }
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        console.log(`🔄 Subscription updated for customer ${customerId}. Status: ${status}`);

        // Update status in DB
        const { error } = await supabase
          .from('profiles')
          .update({
            subscription_status: status,
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);

        if (error) console.error('Error updating subscription status:', error);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        // Downgrade profile to FREE
        const { error } = await supabase
          .from('profiles')
          .update({
            plan: 'free',
            subscription_status: 'canceled',
            updated_at: new Date().toISOString()
          })
          .eq('stripe_customer_id', customerId);

        if (error) console.error('Error downgrading profile:', error);
        console.log(`Customer ${customerId} subscription deleted - downgraded to FREE`);
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }
  } catch (e) {
    console.error('Error handling webhook event:', e);
    return res.status(500).json({ error: 'Internal handler error' });
  }

  return res.status(200).json({ received: true });
});

// POST /api/stripe/create-portal-session
router.post('/create-portal-session', async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }

    // Get customer ID from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (!profile?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found for this user' });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${process.env.FRONTEND_URL || 'http://ai-luminary.vercel.app:3000'}/profile`,
    });

    return res.status(200).json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe Portal error:', error);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
