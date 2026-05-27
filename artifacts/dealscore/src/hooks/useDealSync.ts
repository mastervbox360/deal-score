import { useEffect, useRef, useCallback } from 'react'
import { updateDeal } from '../lib/dealService'

export function useDealSync(
  dealId: string | null,
  inputs: Record<string, unknown>,
  enabled: boolean
) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSavedRef = useRef<string>('')

  const save = useCallback(async () => {
    if (!dealId || !enabled) return
    const serialised = JSON.stringify(inputs)
    if (serialised === lastSavedRef.current) return
    lastSavedRef.current = serialised
    await updateDeal(dealId, inputs)
  }, [dealId, inputs, enabled])

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
