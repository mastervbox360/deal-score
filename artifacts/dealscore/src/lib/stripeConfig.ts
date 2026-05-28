export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  prices: {
    pro_monthly: 'price_1Tbre2B5x9tIriIwuii0b8Op',
    pro_plus_monthly: 'price_1TbrfgB5x9tIriIwJU3Z0ibj',
  },
  products: {
    pro: 'prod_pro_id_here',
    pro_plus: 'prod_pro_plus_id_here',
  }
}
