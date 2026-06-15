/*
 * ══ DealScore Tier Feature Map ══
 *
 * FREE  (£0)
 *   - All 7 strategy analysis (results visible but not saved)
 *   - No deal saving
 *   - No Smart Capture
 *   - No PDF export
 *   - No risk flags
 *   - No investor pack
 *
 * PRO  (£29/mo)
 *   - Everything in Free
 *   - Save unlimited deals
 *   - Smart Capture (URL → auto-fill shared fields)
 *   - Risk flags panel (10 flags)
 *   - PDF export (portrait only)
 *   - Deal sharing (protected investor share link)
 *   - Results sidebar: DealScore Assistant (static suggestions)
 *   - Results sidebar: SC wizard (guided missing-field completion)
 *
 * PRO PLUS  (£59/mo)
 *   - Everything in Pro
 *   - Deal Optimiser (full slide-over with back-solve + negotiation tips)
 *   - Both PDF formats (portrait + landscape)
 *   - Custom investor branding (user logo/colours on share page + PDF)
 *   - AI suggestions (unlimited)
 *   - Recommendation engine (matched committed investors surfaced in Results)
 *   - Results sidebar SC wizard: Pro+ label shown
 *
 * ══ Gating rule ══
 * Use useTier() hook. Never hardcode tier checks — always go through context.
 * In dev: toggle overrides prod tier. In prod: comes from Supabase user_metadata.tier.
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export type Tier = 'free' | 'pro' | 'proplus'

interface TierContextValue {
  tier: Tier
  setDevTier: (t: Tier) => void
  isDevOverride: boolean
}

const TierContext = createContext<TierContextValue>({
  tier: 'pro',
  setDevTier: () => {},
  isDevOverride: false,
})

export function TierProvider({ children }: { children: ReactNode }) {
  const [prodTier, setProdTier] = useState<Tier>('pro')
  const [devTier, setDevTier] = useState<Tier | null>(null)

  useEffect(() => {
    const fetchTier = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const meta = user.user_metadata as { tier?: string }
        const t = meta?.tier
        if (t === 'free' || t === 'pro' || t === 'proplus') {
          setProdTier(t)
        } else {
          setProdTier('pro')
        }
      }
    }
    void fetchTier()
  }, [])

  const isDev = import.meta.env.DEV
  const tier: Tier = (isDev && devTier !== null) ? devTier : prodTier
  const isDevOverride = isDev && devTier !== null

  return (
    <TierContext.Provider value={{ tier, setDevTier: (t) => setDevTier(t), isDevOverride }}>
      {children}
    </TierContext.Provider>
  )
}

export function useTier(): TierContextValue {
  return useContext(TierContext)
}

export function useIsPro(): boolean {
  const { tier } = useTier()
  return tier === 'pro' || tier === 'proplus'
}

export function useIsProPlus(): boolean {
  const { tier } = useTier()
  return tier === 'proplus'
}
