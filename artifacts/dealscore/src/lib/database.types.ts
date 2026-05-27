export type DealStatus = 'analysing' | 'reviewing' | 'presenting' | 'closed' | 'dead'
export type InvestorStatus = 'interested' | 'reviewing' | 'fee_paid' | 'not_interested' | 'pack_released'
export type UserTier = 'free' | 'pro' | 'pro_plus'
export type NotificationType =
  | 'cooling_off_expiring'
  | 'cooling_off_expired'
  | 'pack_released'
  | 'investor_logged'
  | 'offer_deadline'
  | 'fee_received'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  company_name: string | null
  phone: string | null
  tier: UserTier
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  brand_colour: string | null
  accent_colour: string | null
  logo_url: string | null
  ai_uses_count: number
  referral_code: string | null
  referred_by: string | null
  trial_ends_at: string | null
  created_at: string
  updated_at: string
}

export interface Deal {
  id: string
  user_id: string
  reference: string
  strategy: 'BTL' | 'HMO' | 'FLIP' | 'SA' | 'BRRR' | 'R2R' | 'SOCIAL'
  status: DealStatus
  address: string | null
  postcode: string | null
  purchase_price: number | null
  market_value: number | null
  inputs: Record<string, unknown>
  notes: string | null
  packs_generated: number
  deal_score: 'RECOMMENDED' | 'REVIEW' | 'AVOID' | null
  cash_flow: number | null
  coc_roi: number | null
  gross_yield: number | null
  cover_style: string | null
  offer_deadline: string | null
  address_protected: boolean
  created_at: string
  updated_at: string
}

export interface Investor {
  id: string
  user_id: string
  full_name: string
  email: string
  phone: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface DealInvestor {
  id: string
  deal_id: string
  investor_id: string
  status: InvestorStatus
  fee_received_at: string | null
  cooling_off_expires_at: string | null
  pack_released_at: string | null
  fee_amount: number | null
  outcome: 'refunded' | 'transferred' | 'retained' | null
  created_at: string
  updated_at: string
}

export interface ActivityLog {
  id: string
  deal_id: string
  user_id: string
  event: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface Notification {
  id: string
  user_id: string
  deal_id: string | null
  type: NotificationType
  title: string
  body: string
  read: boolean
  created_at: string
}
