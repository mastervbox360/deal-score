export const STRIPE_CONFIG = {
  publishableKey: import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY,
  prices: {
    pro_monthly: 'price_pro_monthly_id_here',
    pro_plus_monthly: 'price_pro_plus_monthly_id_here',
  },
  products: {
    pro: 'prod_pro_id_here',
    pro_plus: 'prod_pro_plus_id_here',
  }
}
