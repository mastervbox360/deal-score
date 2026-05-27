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
  // All strategy-specific inputs stored as a flat map
  [key: string]: unknown
}

export function serializeInputs(state: Record<string, unknown>): SerializedInputs {
  return { ...state } as SerializedInputs
}

export function deserializeInputs(inputs: SerializedInputs): Record<string, unknown> {
  return { ...inputs }
}
