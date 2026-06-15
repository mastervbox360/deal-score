# REPLIT PROMPT 13 — Tier Context + Dev Toggle

## What this does
Adds a `TierContext` at the React app root so every component can read the current user tier via `useTier()`. In production, tier comes from Supabase. In dev, a persistent toggle pill lets you switch between Free / Pro / Pro+ instantly to verify gating and UX across the whole app.

**This prompt is plumbing only — no individual component gating changes yet. Gating logic is added in subsequent prompts.**

---

## Target files
- `artifacts/dealscore/src/contexts/TierContext.tsx` — NEW file
- `artifacts/dealscore/src/App.tsx` (or main entry) — wrap with provider
- `artifacts/dealscore/src/components/DealChrome.tsx` — add dev toggle pill

## Standing rules
- Read every file in full before touching it
- npx tsc --noEmit must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 13: TierContext + dev tier toggle" && git push origin stage-6`

---

## STEP 1 — Create TierContext.tsx

Create `artifacts/dealscore/src/contexts/TierContext.tsx`:

```tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from '../lib/supabaseClient' // adjust path if needed

export type Tier = 'free' | 'pro' | 'proplus'

interface TierContextValue {
  tier: Tier
  setDevTier: (t: Tier) => void  // dev override only
  isDevOverride: boolean
}

const TierContext = createContext<TierContextValue>({
  tier: 'pro',
  setDevTier: () => {},
  isDevOverride: false,
})

export function TierProvider({ children }: { children: ReactNode }) {
  // Production tier — derived from Supabase user metadata / subscription
  const [prodTier, setProdTier] = useState<Tier>('pro')
  // Dev override — only active in development build
  const [devTier, setDevTier] = useState<Tier | null>(null)

  useEffect(() => {
    // Fetch tier from Supabase user metadata
    // Expected shape: user.user_metadata.tier = 'free' | 'pro' | 'proplus'
    // Falls back to 'pro' if not set (safe default for existing accounts)
    const fetchTier = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const meta = user.user_metadata as { tier?: string }
        const t = meta?.tier
        if (t === 'free' || t === 'pro' || t === 'proplus') {
          setProdTier(t)
        } else {
          setProdTier('pro') // default fallback
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

// Convenience helpers
export function useIsPro(): boolean {
  const { tier } = useTier()
  return tier === 'pro' || tier === 'proplus'
}

export function useIsProPlus(): boolean {
  const { tier } = useTier()
  return tier === 'proplus'
}
```

---

## STEP 2 — Wrap the app with TierProvider

Find the root component (likely `App.tsx` or `main.tsx`). Import `TierProvider` and wrap the top-level JSX:

```tsx
import { TierProvider } from './contexts/TierContext'

// Inside the root render:
<TierProvider>
  {/* existing app tree */}
</TierProvider>
```

Place it outside the router but inside any existing auth providers. Do NOT restructure the existing provider tree — just add TierProvider as an additional wrapper.

---

## STEP 3 — Add dev tier toggle to DealChrome

Read `artifacts/dealscore/src/components/DealChrome.tsx` in full before editing.

### 3a — Import useTier at the top of DealChrome.tsx
```tsx
import { useTier, type Tier } from '../contexts/TierContext'
```

### 3b — Inside the DealChrome component body (above return), add:
```tsx
const { tier, setDevTier, isDevOverride } = useTier()
const isDev = import.meta.env.DEV
```

### 3c — Add the dev toggle pill to the DealChrome header

Find the header row in DealChrome's return() — the row that contains the avatar/user menu on the right side. Add the dev toggle pill BEFORE the avatar, inside the same flex row.

The toggle should only render in development (`isDev`):

```tsx
{isDev && (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    border: '.5px solid rgba(255,255,255,.25)',
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 8,
    flexShrink: 0,
  }}>
    {(['free', 'pro', 'proplus'] as Tier[]).map((t) => (
      <button
        key={t}
        onClick={() => setDevTier(t)}
        title={`Switch to ${t} tier`}
        style={{
          padding: '3px 9px',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '.03em',
          textTransform: 'uppercase',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all .15s',
          background: tier === t ? 'rgba(255,255,255,.22)' : 'transparent',
          color: tier === t ? '#fff' : 'rgba(255,255,255,.45)',
          borderRight: t !== 'proplus' ? '.5px solid rgba(255,255,255,.15)' : 'none',
        }}
      >
        {t === 'proplus' ? 'Pro+' : t === 'pro' ? 'Pro' : 'Free'}
      </button>
    ))}
    {isDevOverride && (
      <span style={{
        fontSize: 8,
        fontWeight: 700,
        letterSpacing: '.06em',
        color: '#fbbf24',
        padding: '0 6px',
        borderLeft: '.5px solid rgba(255,255,255,.15)',
        textTransform: 'uppercase',
      }}>DEV</span>
    )}
  </div>
)}
```

This renders inline in the existing header — no layout changes needed. The amber "DEV" badge appears when the override is active so it's always obvious the app is in a non-production tier state.

---

## STEP 4 — Verify useTier is available everywhere

To confirm the context is wired correctly, add a temporary `console.log` in any one component (e.g. AnalysisHub.tsx):

```tsx
import { useTier } from '../contexts/TierContext'
// inside component:
const { tier } = useTier()
console.log('Current tier:', tier)
```

Check the browser console — switching the toggle should log 'free', 'pro', or 'proplus' immediately. Remove the console.log after confirming.

---

## STEP 5 — Document the tier feature map

After confirming the toggle works, add this comment block at the top of `TierContext.tsx` as permanent reference documentation:

```tsx
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
```

---

## TypeScript notes
- `import.meta.env.DEV` is typed by Vite — no additional type declaration needed
- `Tier` type is exported from TierContext.tsx — import it wherever needed
- `supabase` import path: adjust to match existing auth import in DealChrome.tsx
- If `user.user_metadata` shape is not typed, cast as `{ tier?: string }` to avoid any-type error

## After completing
1. Run `npx tsc --noEmit` — zero errors required
2. Open the app in browser, confirm toggle appears in header
3. Switch between Free / Pro / Pro+ — confirm `tier` value changes in console
4. Push: `git add -A && git commit -m "Stage 10 — Prompt 13: TierContext + dev tier toggle" && git push origin stage-6`

## Tell me
1. Where TierProvider was inserted in the tree (which file, which line)
2. Whether Supabase user_metadata already has a `tier` field or if it's missing (so we know if we need a migration)
3. Where the dev toggle renders in the header (confirm it's visible in the app screenshot)
