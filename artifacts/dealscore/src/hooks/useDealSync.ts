import { useEffect, useRef, useCallback } from 'react'
import { updateDeal } from '../lib/dealService'

type DealMetrics = {
  dealScore: 'RECOMMENDED' | 'REVIEW' | 'AVOID' | null
  cashFlow: number | null
  cocRoi: number | null
  grossYield: number | null
}

export type { DealMetrics }

export function useDealSync(
  dealId: string | null,
  address: string | null,
  postcode: string | null,
  purchasePrice: number | null,
  marketValue: number | null,
  inputs: Record<string, unknown>,
  enabled: boolean,
  metricsRef: { current: DealMetrics }
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  const save = useCallback(async () => {
    if (!dealId || !enabled) return
    const serialised = JSON.stringify(inputs)
    if (serialised === lastSavedRef.current) return
    lastSavedRef.current = serialised
    const m = metricsRef.current
    await updateDeal(dealId, address, postcode, purchasePrice, marketValue, inputs, m.dealScore, m.cashFlow, m.cocRoi, m.grossYield)
  }, [dealId, address, postcode, purchasePrice, marketValue, inputs, enabled, metricsRef])

  useEffect(() => {
    if (!dealId || !enabled) return
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(save, 1500)
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [inputs, dealId, enabled, save])

  // Save immediately on unmount
  useEffect(() => {
    return () => { save() }
  }, [save])
}
