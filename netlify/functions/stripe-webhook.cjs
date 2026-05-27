const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  const sig = event.headers['stripe-signature']
  let stripeEvent

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    )
  } catch (err) {
    console.error('Webhook signature error:', err)
    return { statusCode: 400, body: `Webhook error: ${err.message}` }
  }

  const { type, data } = stripeEvent

  try {
    switch (type) {
      case 'checkout.session.completed': {
        const session = data.object
        const userId = session.client_reference_id
        const tier = session.metadata?.tier

        if (userId && tier) {
          await supabase
            .from('profiles')
            .update({
              tier,
              stripe_customer_id: session.customer,
              stripe_subscription_id: session.subscription
            })
            .eq('id', userId)
        }
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = data.object
        await supabase
          .from('profiles')
          .update({ tier: 'free', stripe_subscription_id: null })
          .eq('stripe_subscription_id', subscription.id)
        break
      }

      case 'customer.subscription.updated': {
        const subscription = data.object
        const status = subscription.status
        if (status === 'past_due' || status === 'unpaid') {
          await supabase
            .from('profiles')
            .update({ tier: 'free' })
            .eq('stripe_subscription_id', subscription.id)
        }
        break
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err)
    return { statusCode: 500, body: 'Handler error' }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) }
}
