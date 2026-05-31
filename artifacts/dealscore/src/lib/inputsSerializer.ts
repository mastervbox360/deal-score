// Serialises all Home.tsx state into a single JSON object for storage
// and deserialises it back on load. Add new fields here as the app grows.

export interface SerializedInputs {
  strategy: string
  // Universal inputs
  address?: string
  postcode?: string
  purchasePrice?: number
  marketValue?: number
  propertyType?: string
  bedrooms?: number
  bathrooms?: number
  tenure?: string
  taxRegion?: string
  // Financing method fields (all strategies)
  btlPurchaseFinancingMethod?: string
  btlRefurbFinancingMethod?: string
  hmoPurchaseFinancingMethod?: string
  hmoRefurbFinancingMethod?: string
  saPurchaseFinancingMethod?: string
  saRefurbFinancingMethod?: string
  socialPurchaseFinancingMethod?: string
  socialRefurbFinancingMethod?: string
  brrrPurchaseFinancingMethod?: string
  brrrRefurbFinancingMethod?: string
  // Auction fields
  isAuctionPurchase?: boolean
  auctionDate?: string
  auctionCompletionDate?: string
  buyersPremiumPct?: number
  buyersPremiumAmount?: number
  buyersPremiumMode?: string
  auctionReservationFee?: number
  // Tax and buyer fields
  buyerType?: string
  taxOverrideActive?: boolean
  manualTaxValue?: number
  // All other strategy-specific inputs stored as a flat map
  [key: string]: unknown
}

export function serializeInputs(state: Record<string, unknown>): SerializedInputs {
  return { ...state } as SerializedInputs
}

export function deserializeInputs(inputs: SerializedInputs): Record<string, unknown> {
  return { ...inputs }
}

export function deserializeIntoSetters(
  inputs: SerializedInputs,
  setters: Record<string, (value: unknown) => void>
) {
  Object.entries(inputs).forEach(([key, value]) => {
    if (key in setters && value !== undefined && value !== null) {
      setters[key](value)
    }
  })
}
