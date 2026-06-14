# REPLIT PROMPT 1 — Inputs Save Flow
> Run this first. Do not run Prompt 2 until tsc passes and save is verified working.

---

## Files to read in full before touching anything

```
artifacts/dealscore/src/components/AnalysisHub.tsx
artifacts/dealscore/src/lib/dealService.ts
artifacts/dealscore/src/pages/DealPage.tsx
```

Confirmed paths (do not ask, do not deviate):
- `dealService.ts` already has `import { supabase } from './supabase'` at the top — **do not add another supabase import**
- `Deal` is already imported as `import { Deal } from './database.types'` in `dealService.ts` — **do not add another Deal import**
- For components, use `@/lib/dealService` if the file already uses `@/` aliased imports; otherwise match the existing relative import style

---

## Context

The Inputs sub-view (`ViewInputs` inside `AnalysisHub.tsx`) currently uses `defaultValue` + `readOnly` on every field. When `?editing=true` is in the URL, the fields become editable but **changes are lost on unmount** — there is no `onChange`, no state, no save. This is launch-blocking.

We need to:
1. Make ViewInputs hold controlled form state
2. Autosave to Supabase on every change (debounced 800ms)
3. Wire DealPage to receive and apply the updated deal after save

---

## STEP 1 — Add `updateDealInputs` to `dealService.ts`

Add this function using the same Supabase client pattern already in that file:

```ts
export async function updateDealInputs(
  dealId: string,
  inputs: Record<string, unknown>,
  topLevel: {
    address?: string
    purchase_price?: number | null
    market_value?: number | null
    strategy?: string
  }
): Promise<Deal | null> {
  const { data, error } = await supabase
    .from('deals')
    .update({
      inputs,
      ...topLevel,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dealId)
    .select()
    .single()
  if (error) { console.error('updateDealInputs error', error); return null }
  return data as Deal
}
```

`Deal` is already imported in `dealService.ts` — no change needed to imports. Just add the new function below the existing exports.

---

## STEP 2 — Changes to `AnalysisHub.tsx`

### 2a. Add `onSave` prop to the main `AnalysisHub` component

Change the props interface from:
```ts
export default function AnalysisHub({
  deal,
  activeView: externalView,
  onViewChange,
}: {
  deal: Deal
  activeView?: SubView
  onViewChange?: (v: SubView) => void
})
```

To:
```ts
export default function AnalysisHub({
  deal,
  activeView: externalView,
  onViewChange,
  onSave,
}: {
  deal: Deal
  activeView?: SubView
  onViewChange?: (v: SubView) => void
  onSave?: (updated: Deal) => void
})
```

### 2b. Pass `dealId` and `onSave` to ViewInputs in the render

Change:
```tsx
{activeView === 'inputs' && (
  <ViewInputs p={p} isNewDeal={isNewDeal} />
)}
```

To:
```tsx
{activeView === 'inputs' && (
  <ViewInputs p={p} isNewDeal={isNewDeal} dealId={deal.id} onSave={onSave} />
)}
```

### 2c. Add `updateDealInputs` import at top of AnalysisHub.tsx

```ts
import { updateDealInputs } from '@/lib/dealService'
```

(Use whatever import alias matches the rest of the file.)

### 2d. Update `ViewInputs` function signature

Change from:
```ts
function ViewInputs({ p, isNewDeal }: {
  p: ParsedInputs
  isNewDeal: boolean
})
```

To:
```ts
function ViewInputs({ p, isNewDeal, dealId, onSave }: {
  p: ParsedInputs
  isNewDeal: boolean
  dealId: string
  onSave?: (updated: Deal) => void
})
```

### 2e. Add form state and autosave inside `ViewInputs` — place this BEFORE the `return` statement

Add these at the top of the ViewInputs function body (before the existing `const [searchParams]` line):

```ts
// ── Form state ─────────────────────────────────────────────────────────────
const [form, setForm] = useState<Record<string, unknown>>(() => ({
  address: p.address,
  marketValue: p.marketValue,
  taxRegion: p.taxCountry,
  buyerType: p.buyerType,
  propertyType: p.propertyType,
  bedrooms: p.bedrooms,
  bathrooms: p.bathrooms,
  tenure: p.tenure,
  managementFeePercent: p.managementFeePercent,
  voidAllowancePercent: p.voidAllowancePercent,
  maintenanceReserve: p.maintenanceReserve,
  buildingsInsurance: p.buildingsInsurance,
  serviceCharge: p.serviceCharge,
  groundRentAnnual: p.groundRentAnnual,
  btlPurchaseFinancingMethod: p.btlPurchaseFinancingMethod,
  hmoPurchaseFinancingMethod: p.hmoPurchaseFinancingMethod,
  saPurchaseFinancingMethod: p.saPurchaseFinancingMethod,
  brrrPurchaseFinancingMethod: p.brrrPurchaseFinancingMethod,
  socialPurchaseFinancingMethod: p.socialPurchaseFinancingMethod,
  r2rLandlordDepositMonths: p.r2rLandlordDepositMonths,
  sharedInputs: {
    purchasePrice: p.purchasePrice,
    refurbCost: p.refurbCost,
    otherCosts: p.otherCosts,
    depositPercent: p.depositPercent,
    mortgageRate: p.mortgageRate,
    mortgageTerm: p.mortgageTerm,
    mortgageType: p.mortgageType,
  },
  btlInputs:    { monthlyRent: p.btlMonthlyRent },
  hmoInputs:    { rooms: p.hmoRooms, rentPerRoom: p.hmoRentPerRoom, occupancyRate: p.hmoOccupancyRate, licenceCost: p.hmoLicenceCost, billsUtilities: p.hmoBillsUtilities },
  saInputs:     { nightlyRate: p.saNightlyRate, occupancyPercent: p.saOccupancyPercent, platformFeesPercent: p.saPlatformFeesPercent, cleaningCostPerStay: p.saCleaningCostPerStay, billsUtilities: p.saBillsUtilities },
  flipInputs:   { holdingCostsPerMonth: p.flipHoldingCostsPerMonth, projectLengthMonths: p.flipProjectLengthMonths, expectedSalePrice: p.flipExpectedSalePrice, sellingCostsPercent: p.flipSellingCostsPercent, contingencyPercent: p.flipContingencyPercent },
  brrrInputs:   { postRefurbValue: p.brrrPostRefurbValue, refinancePercent: p.brrrRefinancePercent, newMortgageRate: p.brrrNewMortgageRate, monthlyRent: p.brrrMonthlyRent },
  r2rInputs:    { monthlyRentPaid: p.r2rMonthlyRentPaid, rooms: p.r2rRooms, rentPerRoom: p.r2rRentPerRoom, occupancyRate: p.r2rOccupancyRate, managementFeesPercent: p.r2rManagementFeesPercent, monthlyRunningCosts: p.r2rMonthlyRunningCosts, setupCosts: p.r2rSetupCosts },
  socialInputs: { leaseIncomePerMonth: p.socialLeaseIncomePerMonth, leaseLengthYears: p.socialLeaseLengthYears },
}))

const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

function scheduleAutosave(nextForm: Record<string, unknown>) {
  if (saveTimer.current) clearTimeout(saveTimer.current)
  saveTimer.current = setTimeout(async () => {
    setSaveStatus('saving')
    const shared = nextForm.sharedInputs as Record<string, unknown> ?? {}
    const updated = await updateDealInputs(dealId, nextForm, {
      address: String(nextForm.address ?? ''),
      purchase_price: Number(shared.purchasePrice) || null,
      market_value: Number(nextForm.marketValue) || null,
    })
    if (updated) { setSaveStatus('saved'); onSave?.(updated) }
    else { setSaveStatus('error') }
  }, 800)
}

function setField(path: string, value: unknown) {
  setForm(prev => {
    const next = { ...prev }
    // Support nested paths like 'sharedInputs.purchasePrice'
    const parts = path.split('.')
    if (parts.length === 1) {
      next[path] = value
    } else {
      next[parts[0]] = { ...(prev[parts[0]] as Record<string, unknown>), [parts[1]]: value }
    }
    scheduleAutosave(next)
    return next
  })
}
```

### 2f. Update `IField` component to support controlled mode

Change the `IField` function to:

```ts
function IField({ label, value, fieldPath, required }: { label: string; value: string; fieldPath?: string; required?: boolean }) {
  const { isEditing, isNewDeal, onFieldChange } = useContext(InputsCtx)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#5a6270' }}>
        {label}{required && <span style={{ color: AMBER }}> *</span>}
      </label>
      <input
        readOnly={!isEditing || !fieldPath}
        value={isEditing && fieldPath ? String((onFieldChange as unknown as { getVal: (p: string) => unknown })?.getVal?.(fieldPath) ?? value) : (isNewDeal ? '' : (value === '—' ? '' : value))}
        onChange={isEditing && fieldPath ? (e) => onFieldChange?.(fieldPath, e.target.value) : undefined}
        style={{ border: `.5px solid #c8cbd2`, borderRadius: '8px', padding: '7px 10px', fontSize: '12px', color: TEXT_2, background: isEditing ? '#fff' : BG_SEC, minHeight: '33px', cursor: isEditing ? 'text' : 'default', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
    </div>
  )
}
```

**Wait** — the above approach is overly complex. Use a simpler pattern instead:

Replace the entire `IField` function with this simpler controlled version:

```ts
function IField({ label, value, onChange, required }: { label: string; value: string; onChange?: (v: string) => void; required?: boolean }) {
  const { isEditing, isNewDeal } = useContext(InputsCtx)
  const displayValue = isNewDeal ? '' : (value === '—' ? '' : value)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: '#5a6270' }}>
        {label}{required && <span style={{ color: AMBER }}> *</span>}
      </label>
      <input
        readOnly={!isEditing || !onChange}
        value={displayValue}
        onChange={isEditing && onChange ? (e) => onChange(e.target.value) : undefined}
        style={{ border: `.5px solid #c8cbd2`, borderRadius: '8px', padding: '7px 10px', fontSize: '12px', color: TEXT_2, background: isEditing ? '#fff' : BG_SEC, minHeight: '33px', cursor: isEditing ? 'text' : 'default', outline: 'none', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
      />
    </div>
  )
}
```

### 2g. Update `InputsCtx` to remove `isNewDeal` (it's now a prop)

The context stays the same — `{ isEditing, isNewDeal }` — no change needed.

### 2h. Wire `IField` calls in ViewInputs JSX to use `form` state and `setField`

Every `<IField>` call needs:
- `value` to come from `form` state (not from `p`)
- `onChange` to call `setField` with the correct path

Here are the key mappings for the most important fields. Apply the same pattern to ALL fields:

**Property info section:**
```tsx
<IField label="Address" value={String(form.address ?? '')} onChange={v => setField('address', v)} required />
<IField label="Property type" value={String(form.propertyType ?? '')} onChange={v => setField('propertyType', v)} />
<IField label="Bedrooms" value={String(form.bedrooms ?? '')} onChange={v => setField('bedrooms', v)} />
<IField label="Bathrooms" value={String(form.bathrooms ?? '')} onChange={v => setField('bathrooms', v)} />
<IField label="Tenure" value={String(form.tenure ?? '')} onChange={v => setField('tenure', v)} />
<IField label="Strategy" value={strategyLabel[p.strategy]} />
```

**Property & purchase section:**
```tsx
<IField label="Purchase price" value={(form.sharedInputs as Record<string,unknown>)?.purchasePrice ? fc(Number((form.sharedInputs as Record<string,unknown>).purchasePrice)) : '—'} onChange={v => setField('sharedInputs.purchasePrice', parseFloat(v.replace(/[£,]/g, '')) || 0)} required />
<IField label="Market value / GDV" value={Number(form.marketValue) > 0 ? fc(Number(form.marketValue)) : '—'} onChange={v => setField('marketValue', parseFloat(v.replace(/[£,]/g, '')) || 0)} />
```

**Financing section — Deposit %:**
```tsx
<IField label="Deposit %" value={fp(Number((form.sharedInputs as Record<string,unknown>)?.depositPercent ?? 25))} onChange={v => setField('sharedInputs.depositPercent', parseFloat(v) || 25)} />
```

Apply the same pattern for ALL remaining IField calls. For numeric fields strip `£` and `,` before parsing. For percentage fields strip `%`.

### 2i. Add a save status indicator in the sidebar

In the sidebar "Quick summary" card, add below the existing content:

```tsx
{isEditing && (
  <div style={{ paddingTop: '8px', borderTop: `.5px solid #f3f4f6`, marginTop: '4px', fontSize: '10px', color: saveStatus === 'saved' ? '#065f46' : saveStatus === 'error' ? '#b91c1c' : '#9ca3af', display: 'flex', alignItems: 'center', gap: '4px' }}>
    <i className={`ti ${saveStatus === 'saved' ? 'ti-check' : saveStatus === 'saving' ? 'ti-loader' : saveStatus === 'error' ? 'ti-alert-circle' : 'ti-cloud'}`} style={{ fontSize: '10px' }} />
    {saveStatus === 'saved' ? 'Autosaved' : saveStatus === 'saving' ? 'Saving…' : saveStatus === 'error' ? 'Save failed' : 'Ready'}
  </div>
)}
```

---

## STEP 3 — Changes to `DealPage.tsx`

Pass `onSave` to `AnalysisHub`:

Change:
```tsx
<AnalysisHub
  deal={deal}
  activeView={analysisView}
  onViewChange={setAnalysisView}
/>
```

To:
```tsx
<AnalysisHub
  deal={deal}
  activeView={analysisView}
  onViewChange={setAnalysisView}
  onSave={(updated) => setDeal(updated)}
/>
```

---

## After making all changes

1. Run `npx tsc --noEmit` — zero errors required before committing
2. If tsc errors, fix them. Do not leave errors.
3. Commit via Shell: `git add -A && git commit -m "feat: ViewInputs controlled state + autosave to Supabase" && git push origin stage-6`
4. Report back: list every file changed and what was changed in each
