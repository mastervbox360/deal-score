# REPLIT PROMPT 15 — Inputs Sidebar: Completion Tracker

## What this does
Replaces the current "Quick summary" sidebar in `ViewInputs` with a dynamic completion tracker using the `.sbar-*` design system from the mockup. The sidebar shows which input sections are complete (teal), partial (amber), or untouched (grey), plus a progress bar and "View results" CTA.

**Dependency:** Prompts 14e and 14f merged and passing tsc.

## Standing rules
- Read `AnalysisHub.tsx` in full before touching it
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 15: Inputs sidebar completion tracker" && git push origin stage-6`

---

## STEP 1 — Add `.sbar-*` CSS to the project's global CSS file

Find the project's global CSS file (likely `src/index.css` or `src/App.css`) and append these rules at the bottom. Do not duplicate any rule that may already exist.

```css
/* ── Inputs sidebar (sbar) ─────────────────────────────────────────────────── */
.sbar-sticky {
  position: sticky;
  top: calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px) + 20px);
  height: fit-content;
}
.sbar-card {
  background: #fff;
  border-radius: 12px;
  border: .5px solid var(--ds-border, #e3e5e9);
  box-shadow: 0 1px 4px rgba(0,0,0,.07);
  overflow: hidden;
  margin-bottom: 10px;
}
.sbar-hdr {
  padding: 11px 14px;
  border-bottom: .5px solid var(--ds-border, #e3e5e9);
  background: var(--bg-sec, #f5f6f8);
  display: flex;
  align-items: center;
  gap: 9px;
}
.sbar-icon {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  background: #e8eef7;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: var(--navy, #1B3A6B);
  flex-shrink: 0;
}
.sbar-hdr-text { flex: 1; min-width: 0; }
.sbar-title { font-size: 12px; font-weight: 600; color: var(--text-1, #1a1a2e); }
.sbar-subtitle { font-size: 10px; color: var(--text-2, #6c757d); margin-top: 1px; }
.sbar-badge {
  font-size: 10px;
  font-weight: 700;
  background: #e8eef7;
  color: var(--navy, #1B3A6B);
  padding: 2px 8px;
  border-radius: 20px;
  flex-shrink: 0;
}
.sbar-badge.amber { background: #fef3c7; color: #92400e; }
.sbar-body { padding: 12px 14px; }
.sbar-progress {
  height: 6px;
  background: var(--bg-sec, #f5f6f8);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 12px;
}
.sbar-progress-fill {
  height: 100%;
  background: var(--teal, #1D9E75);
  border-radius: 3px;
  transition: width .3s ease;
}
.sbar-items { display: flex; flex-direction: column; }
.sbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 0;
  border-bottom: .5px solid #f3f4f6;
  cursor: pointer;
  background: none;
  border-left: none;
  border-right: none;
  border-top: none;
  text-align: left;
  width: 100%;
  font-family: inherit;
}
.sbar-item:last-child { border-bottom: none; }
.sbar-item:hover { background: var(--bg-sec, #f5f6f8); border-radius: 6px; padding-left: 4px; }
.sbar-item-lbl { font-size: 11px; color: var(--text-1, #1a1a2e); flex: 1; line-height: 1.4; }
.sbar-item-lbl.done { color: #9ca3af; }
.sbar-dot-sm {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #d1d5db;
  flex-shrink: 0;
}
.sbar-dot-sm.done { background: var(--teal, #1D9E75); }
.sbar-dot-sm.miss { background: #D97706; }
.sbar-cta {
  width: 100%;
  padding: 10px;
  background: var(--navy, #1B3A6B);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 11px;
}
.sbar-cta:disabled {
  background: var(--bg-sec, #f5f6f8);
  color: var(--text-2, #6c757d);
  border: .5px solid var(--ds-border, #e3e5e9);
  cursor: default;
}
.sbar-cta.outline {
  background: #fff;
  border: .5px solid var(--ds-border, #e3e5e9);
  color: var(--text-2, #6c757d);
}
```

---

## STEP 2 — Add `onViewChange` prop to `ViewInputs`

The ViewInputs function signature is currently:
```tsx
function ViewInputs({ p, isNewDeal, dealId, onSave, deal }: {
  p: ParsedInputs
  isNewDeal: boolean
  dealId: string
  onSave?: (updated: Deal) => void
  deal: Deal
})
```

Change it to:
```tsx
function ViewInputs({ p, isNewDeal, dealId, onSave, deal, onViewChange }: {
  p: ParsedInputs
  isNewDeal: boolean
  dealId: string
  onSave?: (updated: Deal) => void
  deal: Deal
  onViewChange?: (v: SubView) => void
})
```

---

## STEP 3 — Pass `onViewChange` at the ViewInputs call site

Find the line (around line 3916) where ViewInputs is rendered:
```tsx
<ViewInputs p={p} isNewDeal={isNewDeal} dealId={deal.id} onSave={onSave} deal={deal} />
```

Change to:
```tsx
<ViewInputs p={p} isNewDeal={isNewDeal} dealId={deal.id} onSave={onSave} deal={deal} onViewChange={setLocalView} />
```

---

## STEP 4 — Add helper functions above ViewInputs

Insert the following helper functions immediately before the `function ViewInputs(` declaration:

```tsx
// ── Sidebar helpers ────────────────────────────────────────────────────────────

/** Reads a value from the form by dot-notation path (e.g. 'sharedInputs.purchasePrice') */
function getFormVal(form: Record<string, unknown>, path: string): unknown {
  const [ns, key] = path.split('.')
  if (!key) return form[ns]
  const sub = form[ns] as Record<string, unknown> | undefined
  return sub?.[key]
}

/** Returns true if a form value is non-empty and non-zero for numeric fields */
function isFilled(v: unknown): boolean {
  if (v === undefined || v === null || v === '') return false
  if (typeof v === 'number') return v !== 0
  return true
}

/** Returns the finance method field key for a given strategy tile */
function getStrategyFinanceKey(tile: string): string {
  switch (tile) {
    case 'btl':    return 'btlPurchaseFinancingMethod'
    case 'hmo':    return 'hmoPurchaseFinancingMethod'
    case 'sa':     return 'saPurchaseFinancingMethod'
    case 'brrr':   return 'brrrPurchaseFinancingMethod'
    case 'social': return 'socialPurchaseFinancingMethod'
    case 'flip':   return 'flipPurchaseFinanceMethod'
    case 'r2r':    return '' // R2R doesn't purchase
    default:       return ''
  }
}

/** Returns dot-notation paths of the Tier 1 income fields for a strategy */
function getStrategyIncomeFields(tile: string): string[] {
  switch (tile) {
    case 'btl':    return ['btlInputs.monthlyRent']
    case 'hmo':    return ['hmoInputs.rooms', 'hmoInputs.rentPerRoom']
    case 'sa':     return ['saInputs.nightlyRate', 'saInputs.occupancyPercent']
    case 'brrr':   return ['brrrInputs.postRefurbValue', 'brrrInputs.monthlyRent']
    case 'flip':   return ['flipInputs.expectedSalePrice']
    case 'r2r':    return ['r2rInputs.monthlyRentPaid', 'r2rInputs.rooms', 'r2rInputs.rentPerRoom']
    case 'social': return ['socialInputs.leaseIncomePerMonth']
    default:       return []
  }
}

/** Returns the display label for a strategy tile */
function getStrategyLabel(tile: string): string {
  switch (tile) {
    case 'btl':    return 'BTL'
    case 'hmo':    return 'HMO'
    case 'sa':     return 'SA'
    case 'brrr':   return 'BRRR'
    case 'flip':   return 'FLIP'
    case 'r2r':    return 'R2R'
    case 'social': return 'Social Housing'
    default:       return 'Strategy'
  }
}
```

---

## STEP 5 — Add sidebar computation hooks inside ViewInputs

Insert the following `useMemo` hooks inside the `ViewInputs` function body, after the existing state declarations (`form`, `saveStatus`, `mode`, `activeTile`):

```tsx
// ── Sidebar computation ────────────────────────────────────────────────────────

const sidebarSections = useMemo(() => {
  const financeKey = getStrategyFinanceKey(activeTile)
  const incomeFields = getStrategyIncomeFields(activeTile)

  const sections: Array<{
    id: string
    label: string
    fields: string[]       // dot-notation paths
    tier: 'core' | 'defaults' | 'tax' | 'risk' | 'crm'
  }> = [
    {
      id: 'property-info',
      label: 'Property information',
      fields: ['propertyType', 'bedrooms', 'epcRating', 'floodRisk'],
      tier: 'risk',
    },
    {
      id: 'property-purchase',
      label: 'Property & purchase',
      fields: ['sharedInputs.purchasePrice', 'marketValue', 'buyerType'],
      tier: 'core',
    },
    {
      id: 'purchase-financing',
      label: 'Purchase financing',
      fields: [
        ...(financeKey ? [financeKey] : []),
        'sharedInputs.depositPercent',
        'sharedInputs.mortgageRate',
        'sharedInputs.mortgageTerm',
      ],
      tier: 'core',
    },
    {
      id: 'refurb',
      label: 'Refurb',
      fields: ['sharedInputs.refurbCost'],
      tier: 'crm',
    },
    {
      id: 'monthly-costs',
      label: 'Monthly costs',
      fields: ['managementFeePercent', 'buildingsInsurance', 'maintenanceReserve', 'voidAllowancePercent'],
      tier: 'defaults',
    },
    {
      id: 'strategy-fields',
      label: `${getStrategyLabel(activeTile)} fields`,
      fields: incomeFields,
      tier: 'core',
    },
    {
      id: 'ownership-tax',
      label: 'Ownership & tax',
      fields: ['ownershipStructure', 'incomeTaxBand'],
      tier: 'tax',
    },
    {
      id: 'deal-terms',
      label: 'Deal terms',
      fields: ['sourcingFeePaid', 'coolingOffPeriodDays'],
      tier: 'crm',
    },
    {
      id: 'seller',
      label: 'Seller',
      fields: ['sellerName', 'sellerPhone', 'sellerEmail'],
      tier: 'crm',
    },
  ]

  return sections.map(sec => {
    const vals = sec.fields.map(f => getFormVal(form, f))
    const filledCount = vals.filter(isFilled).length
    const allFilled = filledCount === vals.length && vals.length > 0
    const noneFilled = filledCount === 0

    let dotClass: 'done' | 'miss' | '' = ''
    if (allFilled) dotClass = 'done'
    else if (!noneFilled) dotClass = 'miss'

    const estNote = sec.tier === 'defaults' && !allFilled

    return { ...sec, dotClass, filledCount, totalCount: vals.length, estNote }
  })
}, [form, activeTile])

// Count done sections (for badge) — exclude 'refurb' and 'crm' sections from mandatory count
const { doneSections, totalSections } = useMemo(() => {
  const mandatory = sidebarSections.filter(s => s.tier === 'core' || s.tier === 'defaults')
  return {
    doneSections: mandatory.filter(s => s.dotClass === 'done').length,
    totalSections: mandatory.length,
  }
}, [sidebarSections])

// Progress bar: Tier 1 + Tier 2 filled fields / total
const { filledMandatory, totalMandatory } = useMemo(() => {
  const mandatorySecs = sidebarSections.filter(s => s.tier === 'core' || s.tier === 'defaults')
  const filled = mandatorySecs.reduce((sum, s) => sum + s.filledCount, 0)
  const total = mandatorySecs.reduce((sum, s) => sum + s.totalCount, 0)
  return { filledMandatory: filled, totalMandatory: total }
}, [sidebarSections])

// "View results" CTA: enabled when Tier 1 core fields are all filled
const coreComplete = useMemo(() => {
  const financeKey = getStrategyFinanceKey(activeTile)
  const coreFields = [
    'sharedInputs.purchasePrice',
    ...(financeKey ? [financeKey] : []),
    ...getStrategyIncomeFields(activeTile),
  ]
  return coreFields.every(f => isFilled(getFormVal(form, f)))
}, [form, activeTile])

// "Finish [strategy] fields" shortcut: show when strategy income section is incomplete
const strategyComplete = useMemo(() => {
  return getStrategyIncomeFields(activeTile).every(f => isFilled(getFormVal(form, f)))
}, [form, activeTile])
```

---

## STEP 6 — Add `scrollToSection` helper inside ViewInputs

Insert this function inside `ViewInputs`, after the useMemo hooks:

```tsx
function scrollToSection(id: string) {
  const el = document.getElementById(`sec-${id}`)
  if (!el) return
  const stickyOffset = 56 + 48 + 44 + 42 + 20 // hdr + istrip + livebar + tabs + padding
  const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset
  window.scrollTo({ top, behavior: 'smooth' })
}
```

---

## STEP 7 — Add `id` attributes to section cards in ViewInputs

Each section's outer container `<div>` needs an `id` so `scrollToSection` can find it. In the JSX, find the outer div of each section card and add:

| Section | Add `id=` |
|---------|-----------|
| Property information section | `id="sec-property-info"` |
| Property & purchase section | `id="sec-property-purchase"` |
| Purchase financing section | `id="sec-purchase-financing"` |
| Refurb section | `id="sec-refurb"` |
| Monthly costs section | `id="sec-monthly-costs"` |
| Strategy-specific section (BTL/HMO/SA etc.) | `id="sec-strategy-fields"` |
| Ownership & tax section | `id="sec-ownership-tax"` |
| Deal terms section | `id="sec-deal-terms"` |
| Seller section | `id="sec-seller"` |

---

## STEP 8 — Replace the sidebar JSX

Find the `{/* Sidebar */}` comment block (around line 3093) and replace the entire `<div>` from `{/* Sidebar */}` to the matching closing `</div>` with:

```tsx
{/* Sidebar — Input completion tracker */}
<div className="sbar-sticky">
  <div className="sbar-card">

    {/* Header */}
    <div className="sbar-hdr">
      <div className="sbar-icon">
        <i className="ti ti-checklist" />
      </div>
      <div className="sbar-hdr-text">
        <div className="sbar-title">Input completion</div>
        <div className="sbar-subtitle">{doneSections} of {totalSections} sections done</div>
      </div>
      <span className={`sbar-badge${doneSections < totalSections ? ' amber' : ''}`}>
        {doneSections}/{totalSections}
      </span>
    </div>

    {/* Body */}
    <div className="sbar-body">

      {/* Progress bar */}
      <div className="sbar-progress">
        <div
          className="sbar-progress-fill"
          style={{ width: `${totalMandatory > 0 ? Math.round((filledMandatory / totalMandatory) * 100) : 0}%` }}
        />
      </div>

      {/* Section rows */}
      <div className="sbar-items">
        {sidebarSections.map(sec => (
          <button
            key={sec.id}
            className="sbar-item"
            onClick={() => scrollToSection(sec.id)}
          >
            <span className={`sbar-dot-sm${sec.dotClass ? ` ${sec.dotClass}` : ''}`} />
            <span className={`sbar-item-lbl${sec.dotClass === 'done' ? ' done' : ''}`}>
              {sec.label}
              {sec.estNote && (
                <span style={{ color: '#D97706', fontSize: 10, marginLeft: 4, fontStyle: 'italic' }}>est.</span>
              )}
            </span>
          </button>
        ))}
      </div>

      {/* View results CTA */}
      <button
        className="sbar-cta"
        disabled={!coreComplete}
        onClick={() => onViewChange?.('results')}
      >
        <i className="ti ti-trophy" style={{ fontSize: 12 }} />
        {coreComplete ? 'View results' : 'Complete core inputs first'}
      </button>

      {/* Finish strategy fields shortcut */}
      {!strategyComplete && activeTile && (
        <button
          className="sbar-cta outline"
          style={{ marginTop: 6 }}
          onClick={() => scrollToSection('strategy-fields')}
        >
          Finish {getStrategyLabel(activeTile)} fields
        </button>
      )}

    </div>
  </div>
</div>
```

---

## Summary checklist

- [ ] `.sbar-*` CSS added to global CSS file
- [ ] `onViewChange?: (v: SubView) => void` added to ViewInputs props
- [ ] `onViewChange={setLocalView}` passed at the ViewInputs call site
- [ ] Helper functions (`getFormVal`, `isFilled`, `getStrategyFinanceKey`, `getStrategyIncomeFields`, `getStrategyLabel`) added above ViewInputs
- [ ] `useMemo` hooks for `sidebarSections`, `doneSections`, `filledMandatory`, `coreComplete`, `strategyComplete` added inside ViewInputs
- [ ] `scrollToSection` helper added inside ViewInputs
- [ ] `id="sec-*"` attributes added to section card outer divs
- [ ] Old "Quick summary" sidebar replaced with new tracker JSX
- [ ] `npx tsc --noEmit` — zero errors

## After completing
1. `npx tsc --noEmit` — zero errors
2. Screenshot: sidebar in partial state (amber/grey dots) + sidebar when core complete (navy "View results" CTA enabled)
3. Commit and push
4. Report any field key mismatches found during implementation
