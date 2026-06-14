# REPLIT PROMPT 4 — Fees Tab: Supabase Persistence
> Run AFTER Prompt 3 is complete and tsc passes.

---

## Files to read in full before touching anything

```
artifacts/dealscore/src/components/FeesTab.tsx
artifacts/dealscore/src/components/DealChrome.tsx
artifacts/dealscore/src/lib/dealService.ts
```

---

## Context — read carefully before writing any code

**FeesTab.tsx is NOT a list of fee line items.** It manages a **single sourcing fee** per deal with these four fields:
- `feeAmountStr` — string like `"£2,500"` or `"5%"`
- `feeType` — `'fixed' | 'percent'`
- `feeDue` — `'completion' | 'reservation' | 'exchange'`
- `feeStatus` — `'outstanding' | 'received' | 'waived'`

It also has a `history` array of `HistEntry` objects (`{ date: string; evt: string; tag: 'pending' | 'received' | 'sent' | 'agreed' }`).

Everything is currently in local React state — when the user navigates away, all values reset to hardcoded defaults.

**The "Additional fees" section is a stub** — clicking it shows a toast "Add additional fee — coming soon". Do NOT touch this section. Leave it exactly as-is.

**No new Supabase table is needed.** We persist the fee data inside `deals.inputs.feeDetails` using the `updateDealInputs` function added in Prompt 1.

---

## STEP 1 — Confirm `FeesTab` receives a `deal` prop

Read `DealChrome.tsx` to see how FeesTab is rendered. If it is currently rendered as:
```tsx
<FeesTab />
```
or without a `deal` prop, you need to:
1. Pass `deal={deal}` from DealChrome to FeesTab
2. Add `deal: Deal` to FeesTab's props interface

If it already receives `deal` as a prop, skip to Step 2.

---

## STEP 2 — Add imports to `FeesTab.tsx`

Add `updateDealInputs` to the existing imports from dealService. Use the same import alias/path already used at the top of FeesTab.tsx (likely `@/lib/dealService` or a relative path — match what's already there). Also import `Deal` from the types file if not already present.

```ts
import { updateDealInputs } from '@/lib/dealService'   // adjust alias to match file
import { Deal } from '@/lib/database.types'              // adjust alias to match file
```

---

## STEP 3 — Initialize state from `deal.inputs.feeDetails` on mount

FeesTab currently has hardcoded defaults like:
```ts
const [feeAmountStr, setFeeAmountStr] = useState('£2,500')
const [feeType, setFeeType] = useState<FeeType>('fixed')
const [feeDue, setFeeDue] = useState<FeeDue>('completion')
const [feeStatus, setFeeStatus] = useState<FeeStatus>('outstanding')
const [history, setHistory] = useState<HistEntry[]>(SEED_HISTORY)
```

Replace each `useState` initializer to read from `deal.inputs` if a saved value exists, falling back to the current defaults:

```ts
// Assume deal.inputs is typed as Record<string,unknown> | null | undefined
const saved = (deal.inputs as Record<string, unknown> | null)?.feeDetails as Record<string, unknown> | undefined

const [feeAmountStr, setFeeAmountStr] = useState<string>(
  saved?.feeAmountStr != null ? String(saved.feeAmountStr) : '£2,500'
)
const [feeType, setFeeType] = useState<FeeType>(
  saved?.feeType != null ? (saved.feeType as FeeType) : 'fixed'
)
const [feeDue, setFeeDue] = useState<FeeDue>(
  saved?.feeDue != null ? (saved.feeDue as FeeDue) : 'completion'
)
const [feeStatus, setFeeStatus] = useState<FeeStatus>(
  saved?.feeStatus != null ? (saved.feeStatus as FeeStatus) : 'outstanding'
)
const [history, setHistory] = useState<HistEntry[]>(
  Array.isArray(saved?.history) ? (saved.history as HistEntry[]) : SEED_HISTORY
)
```

---

## STEP 4 — Add a `saveFee` helper function

Add this function inside FeesTab, after the state declarations:

```ts
const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

async function saveFee(overrides?: {
  feeAmountStr?: string
  feeType?: FeeType
  feeDue?: FeeDue
  feeStatus?: FeeStatus
  history?: HistEntry[]
}) {
  setSaveStatus('saving')
  const feeDetails = {
    feeAmountStr:  overrides?.feeAmountStr  ?? feeAmountStr,
    feeType:       overrides?.feeType       ?? feeType,
    feeDue:        overrides?.feeDue        ?? feeDue,
    feeStatus:     overrides?.feeStatus     ?? feeStatus,
    history:       overrides?.history       ?? history,
  }
  const currentInputs = (deal.inputs as Record<string, unknown> | null) ?? {}
  const updated = await updateDealInputs(
    deal.id,
    { ...currentInputs, feeDetails },
    {}  // no top-level deal fields to update here
  )
  setSaveStatus(updated ? 'saved' : 'error')
}
```

---

## STEP 5 — Wire `saveFee` into existing actions

### 5a. "Save" button (the existing `saveFeeDetails` function or similar)

The current `saveFeeDetails()` likely just calls `showToast('...')`. Replace it to also call `saveFee()`:

```ts
async function saveFeeDetails() {
  await saveFee()
  showToast(saveStatus === 'error' ? 'Save failed' : 'Fee details saved')
}
```

### 5b. `markReceived()` function

Find the existing `markReceived()` function. After it updates local state, persist:

```ts
function markReceived() {
  const newStatus: FeeStatus = 'received'
  const newEntry: HistEntry = { date: new Date().toLocaleDateString('en-GB'), evt: 'Payment received', tag: 'received' }
  const newHistory = [newEntry, ...history]
  setFeeStatus(newStatus)
  setHistory(newHistory)
  saveFee({ feeStatus: newStatus, history: newHistory })
}
```

(Preserve any other things `markReceived` already does — just add the `saveFee` call at the end with the new values passed in as overrides.)

### 5c. Add a subtle save status indicator near the Save button

Next to or below the existing "Save fee details" button, add:

```tsx
{saveStatus !== 'idle' && (
  <span style={{ fontSize: '11px', color: saveStatus === 'saved' ? '#065f46' : saveStatus === 'error' ? '#b91c1c' : '#9ca3af', marginLeft: '8px' }}>
    {saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save failed'}
  </span>
)}
```

---

## STEP 6 — Type safety checks

After making changes, ensure:
- `deal.inputs` is safely cast — use `(deal.inputs as Record<string, unknown> | null)` everywhere
- No TypeScript errors around the `saved?.feeDetails` access
- `updateDealInputs` is being called with the correct signature: `(dealId: string, inputs: Record<string, unknown>, topLevel: {...})`

---

## After making all changes

1. Run `npx tsc --noEmit` — zero errors required before committing
2. Test manually: change the fee amount and type, click Save, navigate away to Dashboard, come back — the values should still be there
3. Commit: `git add -A && git commit -m "feat: FeesTab persists sourcing fee to deals.inputs.feeDetails" && git push origin stage-6`
4. Report back: confirm what changed in each file and that the manual test passed
