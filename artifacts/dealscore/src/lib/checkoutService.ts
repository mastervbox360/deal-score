import { STRIPE_CONFIG } from './stripeConfig'

export async function startCheckout(
  tier: 'pro' | 'pro_plus',
  userId: string,
  userEmail: string
): Promise<void> {
  const priceId = tier === 'pro'
    ? STRIPE_CONFIG.prices.pro_monthly
    : STRIPE_CONFIG.prices.pro_plus_monthly

  const response = await fetch('/.netlify/functions/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, userId, userEmail, tier })
  })

  const { url, error } = await response.json() as { url?: string; error?: string }
  if (error) throw new Error(error)
  if (url) window.location.href = url
}
