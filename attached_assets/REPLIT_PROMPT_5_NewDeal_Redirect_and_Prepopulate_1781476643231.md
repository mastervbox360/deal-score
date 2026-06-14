# REPLIT PROMPT 5 — New Deal: Auto-navigate to Inputs + Pre-populate Fields
> Run AFTER Prompt 4 is complete and tsc passes.

---

## Problem

Two bugs appear when a user creates a new deal via the quick capture form:

1. **Wrong landing tab** — after creation, the app lands on the Overview tab. It should land on the Inputs tab in editing mode (`?tab=analysis&view=inputs&editing=true`).

2. **Inputs not pre-populated** — the quick capture saves address, strategy, and purchase price to top-level deal columns (`address`, `strategy`, `purchase_price`). But `ViewInputs` initializes its `form` state from `deal.inputs` (the JSONB column), which is empty on a new deal. So `form.address` is `undefined` even though `deal.address` has the correct value. The fields appear blank.

---

## Files to read before touching anything

```
artifacts/dealscore/src/components/AnalysisHub.tsx
```

Then **search for the new deal creation / quick capture component**. Look for a component or function that:
- Shows a modal or form when the user clicks "+ New deal"
- Calls Supabase to insert a new row into `deals`
- Calls `navigate(...)` after creation to go to the deal page

Likely candidates (grep for these patterns):
```
navigate(`/deal/
supabase.from('deals').insert
New deal
quick.capture
```

Read whichever file(s) contain the new deal creation + navigation. Confirm the exact `navigate(...)` call before proceeding.

---

## FIX 1 — New deal creation: redirect to Inputs tab in editing mode

Find the `navigate(...)` call that runs after a new deal is successfully created. It currently looks something like:

```ts
navigate(`/deal/${newDeal.id}`)
// or
navigate(`/deal/${newDeal.id}?tab=overview`)
```

Change it to:

```ts
navigate(`/deal/${newDeal.id}?tab=analysis&view=inputs&editing=true`)
```

This means when a user completes the quick capture form, they land directly on the Inputs page in editing mode — ready to fill in the full details.

**Do not change any other navigate() calls in the file.**

---

## FIX 2 — ViewInputs: seed `form` state from top-level deal fields

**File:** `artifacts/dealscore/src/components/AnalysisHub.tsx`

**Location:** Inside `ViewInputs`, find where `form` state is initialized. After Prompt 1, it looks like:

```ts
const [form, setForm] = useState<Record<string, unknown>>(deal.inputs ?? {})
// or
const [form, setFormRaw] = useState<Record<string, unknown>>(
  (deal.inputs as Record<string, unknown> | null) ?? {}
)
```

**Replace** the initial value so that when `deal.inputs` doesn't have `address`, `strategy`, or `purchase_price`, it falls back to the top-level deal columns:

```ts
const rawInputs = (deal.inputs as Record<string, unknown> | null) ?? {}

const [form, setFormRaw] = useState<Record<string, unknown>>({
  // Seed top-level deal fields as fallbacks when inputs JSONB is missing them
  address:      rawInputs.address      ?? deal.address      ?? '',
  strategy:     rawInputs.strategy     ?? deal.strategy     ?? '',
  // Seed purchasePrice inside sharedInputs if missing
  sharedInputs: {
    purchasePrice: (rawInputs.sharedInputs as Record<string,unknown> | undefined)?.purchasePrice
      ?? deal.purchase_price
      ?? null,
    ...(rawInputs.sharedInputs as Record<string,unknown> | undefined ?? {}),
  },
  marketValue:  rawInputs.marketValue  ?? deal.market_value ?? null,
  // Spread all remaining saved inputs on top
  ...rawInputs,
  // Re-assert the fallbacks so they win over an empty-string rawInputs value
  address:      rawInputs.address      || deal.address      || '',
})
```

**Important:** The `...rawInputs` spread must come AFTER the seeded defaults, and the address re-assertion at the end ensures that if `rawInputs.address` is an empty string (not yet saved), the top-level `deal.address` is used instead.

If the existing `useState` call uses a different variable name (e.g. `p` instead of `deal`), match whatever name the component uses for the deal prop — just look at what the component receives as its prop.

---

## FIX 3 — Seed `activeTile` and `mode` from top-level `deal.strategy`

Also added in Prompt 2 are these state variables:

```ts
const initialMode = p.strategy === 'R2R' ? 'rent' : 'buy'
const [mode, setMode] = useState<...>(initialMode)
const [activeTile, setActiveTile] = useState<string>(p.strategy.toLowerCase())
```

These already read from `p.strategy` (the top-level column) so they should work correctly. **Confirm they are reading from the top-level strategy prop, not `form.strategy`.** If they are reading from `form.strategy`, change them to read from `p.strategy` / `deal.strategy` (the prop, not the form state). No other change needed here.

---

## After making all changes

1. Run `npx tsc --noEmit` — zero errors required
2. Test manually:
   - Click "+ New deal", complete the quick capture form
   - Confirm you land on the **Inputs tab in editing mode** (not Overview)
   - Confirm **Address field is pre-filled** from the quick capture
   - Confirm **Strategy tile is pre-selected** (e.g. Buy to Let → BTL tile active)
   - Confirm **Purchase price** (if captured in quick capture) appears in the Purchase price field
3. Commit: `git add -A && git commit -m "fix: new deal redirects to inputs tab; ViewInputs seeds form from top-level deal fields" && git push origin stage-6`
4. Report: confirm which files changed, what the navigate call was before and after, and that the manual test passed
