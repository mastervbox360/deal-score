# REPLIT PROMPT 15c — Smart Capture Revamp
**File:** `artifacts/dealscore/src/components/AnalysisHub.tsx`  
**Branch:** stage-6  
**Depends on:** Prompt 14ar complete (commit 7f06c4e). Prompt 15b must be REVERTED before running this.

---

## ⚠️ STEP 0 — REVERT PROMPT 15b FIRST

Before making any changes, run this in the Replit Shell:

```bash
git reset --hard bbfe8da
```

This resets the branch back to the clean post-14ar state (the last verified good commit before 15b). Confirm zero TypeScript errors after the reset:

```bash
npx tsc --noEmit
```

Then proceed with the changes below.

---

## What this prompt builds

Smart Capture mode that feels **identical to manual mode** — same page layout, same section cards, same field components. The only differences are:

1. Step 2 gets a "Activate Smart Capture" Pro Plus feature card (below the strategy tiles)
2. When SC is active: Step 2 header changes, strategy tiles become display-only info cards
3. All strategy-specific income sections for the user's route appear below the existing sections (not instead of them — in addition)
4. The existing inputs sidebar transforms to show a per-strategy completion tracker
5. A subtle purple `SC` pill appears next to the "Inputs" sub-tab in the sticky band

**No wizard. No steps. No Continue/Back buttons. No progress bar. No page restructuring. The inputs page scrolls exactly as it does in manual mode — just with more content visible.**

---

## Part A — New state variables

Inside `ViewInputs`, add these two new state/derived variables. Add them near the top of the component alongside the existing state declarations:

```tsx
const [scMode, setScMode] = useState<'manual' | 'sc'>('manual')
const isProPlus = tier === 'proplus'
```

**Important:** `scMode` is purely a display preference. It must **never** clear, reset, or affect any form field values. Shared fields (`sharedInputs.*`) and strategy-specific fields (`btlInputs.*`, `hmoInputs.*`, etc.) must always persist regardless of mode switches.

Do **not** add `scStep`, `safeScStep`, `liveSteps`, `currentScKey`, or `scVisible` — those were from the reverted 15b wizard approach and are not used here.

---

## Part B — "Activate Smart Capture" feature card in Step 2

In the existing Step 2 section (the strategy tile picker — the section with "Select your strategy" heading and the strategy tiles), add this feature card **below the strategy tiles** and **above the section's closing `</div>`**.

The card only shows when `scMode === 'manual'`:

```tsx
{scMode === 'manual' && (
  <div style={{
    marginTop: 16,
    background: isProPlus ? '#f5f3ff' : '#fafafa',
    border: `.5px solid ${isProPlus ? '#7c3aed' : 'var(--ds-border)'}`,
    borderRadius: 10,
    padding: '14px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  }}>
    <div style={{
      width: 34, height: 34, borderRadius: 8,
      background: isProPlus ? '#ede9fe' : 'var(--bg-sec)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>
      <i className="ti ti-sparkles" style={{ fontSize: 15, color: isProPlus ? '#7c3aed' : '#9ca3af' }} />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: isProPlus ? '#4c1d95' : 'var(--text-1)', marginBottom: 2 }}>
        Smart Capture
        {!isProPlus && <span style={{ fontSize: 10, fontWeight: 600, background: '#f3f0ff', color: '#7c3aed', padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>Pro Plus</span>}
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', lineHeight: 1.5 }}>
        {isProPlus
          ? 'Fill in all strategies at once and get a ranked comparison across every investment approach.'
          : 'Upgrade to Pro Plus to score all strategies simultaneously and get a full ranked comparison.'}
      </div>
    </div>
    {isProPlus && (
      <button
        onClick={() => isEditing && setScMode('sc')}
        style={{
          background: '#7c3aed',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '8px 14px',
          fontSize: 11,
          fontWeight: 600,
          cursor: isEditing ? 'pointer' : 'not-allowed',
          opacity: isEditing ? 1 : 0.5,
          whiteSpace: 'nowrap',
          flexShrink: 0,
          fontFamily: 'inherit',
        }}
      >
        Activate →
      </button>
    )}
  </div>
)}
```

---

## Part C — Step 2 transformation when SC is active

The **existing Step 2 section header** (the one that currently says "Select your strategy" or similar) needs to change when `scMode === 'sc'`.

Find the Step 2 section heading text. Wrap it in a conditional:

```tsx
{scMode === 'manual'
  ? 'Select your strategy'
  : (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      Strategies available to you
      <span style={{
        fontSize: 10, fontWeight: 700,
        background: '#7c3aed', color: '#fff',
        padding: '2px 8px', borderRadius: 10,
        letterSpacing: '.02em',
      }}>SC</span>
      <button
        onClick={() => setScMode('manual')}
        style={{
          fontSize: 10, color: '#7c3aed', background: 'none', border: 'none',
          cursor: 'pointer', fontFamily: 'inherit', padding: 0,
          textDecoration: 'underline', fontWeight: 500,
        }}
      >
        Exit Smart Capture
      </button>
    </span>
  )
}
```

The **strategy tiles themselves** must become non-interactive display cards when `scMode === 'sc'`. Find where the strategy tiles render (the clickable tiles that set `activeTile`). Wrap each tile's `onClick` and visual active state so they only work in manual mode:

- `onClick`: only fires when `scMode === 'manual'`
- Active state (highlighted/selected styling): only applied when `scMode === 'manual'`
- In SC mode: tiles are display-only, showing each strategy name and icon. Add a small subtext to each tile: "Will be scored" (or similar — small, grey, 10px)

Also, add a small explanatory note below the tiles when `scMode === 'sc'` (inside the section, below tiles):

```tsx
{scMode === 'sc' && (
  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 10, lineHeight: 1.6 }}>
    All strategies will be ranked once you fill in their income fields below. Scroll down to complete each strategy.
  </div>
)}
```

---

## Part D — Strategy income sections in SC mode

After all existing sections (after the last section currently rendered — Deal terms / Comparables), append a block that renders only when `scMode === 'sc'`. This block shows income/projection sections for all strategies relevant to the current route (`mode` variable: `'buy'` | `'rent'` | `'specialist'`).

Each section uses the **exact same `Sec` card component and `IField`/`ISelect` components** as the rest of the inputs page. No new styling. Same look and feel.

The sections to render per route:

**Buy route** (`mode === 'buy'`): BTL, HMO, SA, BRRR, FLIP  
**Rent route** (`mode === 'rent'`): R2R, Social Housing  
**Specialist route** (`mode === 'specialist'`): all 7

Render these as a group with a subtle section group label at the top:

```tsx
{scMode === 'sc' && (
  <div style={{ marginTop: 8 }}>
    <div style={{
      fontSize: 10, fontWeight: 700, color: '#7c3aed',
      textTransform: 'uppercase', letterSpacing: '.07em',
      marginBottom: 12, padding: '0 2px',
    }}>
      Smart Capture — Strategy income fields
    </div>

    {/* BTL — show for buy and specialist */}
    {(mode === 'buy' || mode === 'specialist') && (
      <Sec title="BTL — Monthly income" info="Fill in the BTL fields so DealScore can calculate yield, cash flow, and deal score for a Buy to Let strategy.">
        <IGrid>
          <IField label="Monthly rent" req
            info="The monthly rental income you expect from this property as a single let."
            value={String(form['btlInputs.monthlyRent'] ?? '')}
            onChange={v => setField('btlInputs.monthlyRent', v)}
            placeholder="e.g. £1,100" disabled={!isEditing} />
        </IGrid>
      </Sec>
    )}

    {/* HMO — show for buy and specialist */}
    {(mode === 'buy' || mode === 'specialist') && (
      <Sec title="HMO — Room income" info="Fill in the HMO fields so DealScore can calculate yield, cash flow, and deal score for a House in Multiple Occupation strategy.">
        <IGrid>
          <IField label="Number of rooms" req
            info="The total number of lettable rooms in this HMO."
            value={String(form['hmoInputs.rooms'] ?? '')}
            onChange={v => setField('hmoInputs.rooms', v)}
            placeholder="e.g. 5" disabled={!isEditing} />
          <IField label="Rent per room (£/mo)" req
            info="The monthly rent charged per room. Use the average if rooms are priced differently."
            value={String(form['hmoInputs.rentPerRoom'] ?? '')}
            onChange={v => setField('hmoInputs.rentPerRoom', v)}
            placeholder="e.g. £550" disabled={!isEditing} />
        </IGrid>
      </Sec>
    )}

    {/* SA — show for buy and specialist */}
    {(mode === 'buy' || mode === 'specialist') && (
      <Sec title="SA — Serviced accommodation income" info="Fill in the SA fields so DealScore can calculate yield, cash flow, and deal score for a Serviced Accommodation strategy.">
        <IGrid>
          <IField label="Nightly rate (£)" req
            info="The average nightly rate you expect to charge guests."
            value={String(form['saInputs.nightlyRate'] ?? '')}
            onChange={v => setField('saInputs.nightlyRate', v)}
            placeholder="e.g. £85" disabled={!isEditing} />
          <IField label="Target occupancy (%)"
            info="The percentage of nights you expect to be booked. 70–80% is typical for most SA markets."
            value={String(form['saInputs.occupancy'] ?? '')}
            onChange={v => setField('saInputs.occupancy', v)}
            placeholder="e.g. 75" disabled={!isEditing} />
        </IGrid>
      </Sec>
    )}

    {/* BRRR — show for buy and specialist */}
    {(mode === 'buy' || mode === 'specialist') && (
      <Sec title="BRRR — Post-refurb income & refinance" info="Fill in the BRRR fields so DealScore can calculate the refinance outcome and ongoing cash flow for a Buy, Refurb, Refinance, Rent strategy.">
        <IGrid>
          <IField label="Post-refurb value (GDV)" req
            info="The estimated market value of the property after refurbishment is complete. Get this from a local estate agent or RICS surveyor."
            value={String(form['brrrInputs.gdv'] ?? '')}
            onChange={v => setField('brrrInputs.gdv', v)}
            placeholder="e.g. £235,000" disabled={!isEditing} />
          <IField label="Rent post-refurb (£/mo)" req
            info="The monthly rent once the property is let after refurbishment."
            value={String(form['brrrInputs.rentPostRefurb'] ?? '')}
            onChange={v => setField('brrrInputs.rentPostRefurb', v)}
            placeholder="e.g. £1,150" disabled={!isEditing} />
          <IField label="Target refinance LTV (%)"
            info="The loan-to-value percentage your mortgage lender will offer against the post-refurb value. Most BTL lenders offer 75%."
            value={String(form['brrrInputs.refinanceLtv'] ?? '')}
            onChange={v => setField('brrrInputs.refinanceLtv', v)}
            placeholder="e.g. 75" disabled={!isEditing} />
        </IGrid>
      </Sec>
    )}

    {/* FLIP — show for buy and specialist */}
    {(mode === 'buy' || mode === 'specialist') && (
      <Sec title="FLIP — Sale & profit" info="Fill in the FLIP fields so DealScore can calculate net profit and ROI for a property flip strategy.">
        <IGrid>
          <IField label="GDV — expected sale price" req
            info="The price you expect to achieve when selling the refurbished property. Base this on comparable sold prices nearby."
            value={String(form['flipInputs.gdv'] ?? '')}
            onChange={v => setField('flipInputs.gdv', v)}
            placeholder="e.g. £240,000" disabled={!isEditing} />
          <IField label="Project length (months)"
            info="How many months from purchase to sale completion. Be realistic — most flips take longer than expected."
            value={String(form['flipInputs.projectLength'] ?? '')}
            onChange={v => setField('flipInputs.projectLength', v)}
            placeholder="e.g. 6" disabled={!isEditing} />
        </IGrid>
      </Sec>
    )}

    {/* R2R — show for rent and specialist */}
    {(mode === 'rent' || mode === 'specialist') && (
      <Sec title="R2R — Rent to rent income" info="Fill in the R2R fields so DealScore can calculate monthly profit and ROI for a Rent to Rent strategy.">
        <IGrid>
          <IField label="Monthly subletting income (£)" req
            info="The total income you earn from subletting the property — e.g. all SA bookings or all room rents combined."
            value={String(form['r2rInputs.subletIncome'] ?? '')}
            onChange={v => setField('r2rInputs.subletIncome', v)}
            placeholder="e.g. £2,400" disabled={!isEditing} />
          <IField label="Monthly lease cost (£)" req
            info="The monthly rent you pay to the property owner under your lease agreement."
            value={String(form['r2rInputs.leaseCost'] ?? '')}
            onChange={v => setField('r2rInputs.leaseCost', v)}
            placeholder="e.g. £1,200" disabled={!isEditing} />
        </IGrid>
      </Sec>
    )}

    {/* Social Housing — show for rent and specialist */}
    {(mode === 'rent' || mode === 'specialist') && (
      <Sec title="Social Housing — Guaranteed rent" info="Fill in the Social Housing fields so DealScore can calculate yield and cash flow for a Social / Supported Living strategy.">
        <IGrid>
          <IField label="Monthly guaranteed rent (£)" req
            info="The fixed monthly payment from the housing association, local authority, or care provider."
            value={String(form['socialInputs.guaranteedRent'] ?? '')}
            onChange={v => setField('socialInputs.guaranteedRent', v)}
            placeholder="e.g. £1,050" disabled={!isEditing} />
        </IGrid>
      </Sec>
    )}

  </div>
)}
```

**Important field path note:** The field paths above (`btlInputs.monthlyRent`, `hmoInputs.rooms` etc.) must match exactly how those fields are stored and accessed in the existing strategy-specific sections in manual mode. Check the existing ViewInputs code for the exact `setField` calls used in the BTL, HMO, SA, BRRR, FLIP, R2R, and Social sections and use the same paths. Do not introduce new field paths — use the existing ones so SC mode reads and writes the same data as manual mode.

---

## Part E — Sidebar transformation in SC mode

The existing inputs sidebar card (the "Input completion" card with section dots and "View results" button) must be **replaced** with a Smart Capture panel when `scMode === 'sc'`.

Find the sidebar in `ViewInputs` (the `sbar-sticky` or equivalent sticky sidebar column). Replace its content with a conditional:

**When `scMode === 'manual'`:** render the existing "Input completion" card exactly as it is now. No changes.

**When `scMode === 'sc'`:** render a Smart Capture completion panel:

```tsx
{scMode === 'sc' ? (
  <div style={{
    position: 'sticky',
    top: 'calc(var(--hdr-h, 56px) + var(--strip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px) + 20px)',
  }}>
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '.5px solid var(--ds-border)',
      boxShadow: '0 1px 4px rgba(0,0,0,.07)',
      overflow: 'hidden',
      marginBottom: 10,
    }}>
      {/* Header */}
      <div style={{
        padding: '11px 14px',
        borderBottom: '.5px solid var(--ds-border)',
        background: '#2d1060',
        display: 'flex', alignItems: 'center', gap: 9,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 7,
          background: 'rgba(255,255,255,.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, color: '#fff', flexShrink: 0,
        }}>
          <i className="ti ti-sparkles" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>Smart Capture</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,.65)', marginTop: 1 }}>
            Fill in each strategy to get ranked results
          </div>
        </div>
      </div>

      {/* Strategy completion list */}
      <div style={{ padding: '12px 14px' }}>
        {scStrategies.map(s => (
          <div key={s.key} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 0',
            borderBottom: '.5px solid #f3f4f6',
          }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
              background: s.status === 'ready' ? 'var(--teal)' : s.status === 'partial' ? '#D97706' : '#d1d5db',
            }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: s.status === 'ready' ? '#9ca3af' : 'var(--text-1)', lineHeight: 1.4 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 10, color: '#9ca3af' }}>
                {s.status === 'ready' ? 'Ready to score' : s.status === 'partial' ? 'Some fields filled' : 'Not yet started'}
              </div>
            </div>
          </div>
        ))}

        {/* View results CTA */}
        <button
          onClick={() => onViewChange?.('results')}
          disabled={!scStrategies.some(s => s.status === 'ready')}
          style={{
            width: '100%', padding: 10, borderRadius: 8,
            fontSize: 12, fontWeight: 600, cursor: 'pointer',
            fontFamily: 'inherit', marginTop: 11,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            border: 'none',
            background: scStrategies.some(s => s.status === 'ready') ? 'var(--teal)' : '#e5e7eb',
            color: scStrategies.some(s => s.status === 'ready') ? '#fff' : '#9ca3af',
            transition: 'background .2s',
          }}
        >
          <i className="ti ti-trophy" style={{ fontSize: 12 }} />
          View ranked results
        </button>

        {/* Exit SC link */}
        <button
          onClick={() => setScMode('manual')}
          style={{
            width: '100%', marginTop: 6, padding: '8px 10px',
            background: 'none', border: '.5px solid var(--ds-border)',
            borderRadius: 8, fontSize: 11, color: 'var(--text-2)',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Exit Smart Capture
        </button>
      </div>
    </div>
  </div>
) : (
  /* existing sidebar content — no changes */
  <ExistingInputsSidebar />
)}
```

**Note on `scStrategies`:** Define this derived array inside ViewInputs, computed from `form` and `mode`. It lists each relevant strategy with a computed `status: 'ready' | 'partial' | 'none'` based on minimum required fields:

```tsx
const scStrategies = useMemo(() => {
  const all = [
    ...(mode === 'buy' || mode === 'specialist' ? [
      {
        key: 'btl', label: 'Buy to Let',
        status: form['btlInputs.monthlyRent'] ? 'ready' : 'none' as 'ready' | 'partial' | 'none',
      },
      {
        key: 'hmo', label: 'HMO',
        status: form['hmoInputs.rooms'] && form['hmoInputs.rentPerRoom'] ? 'ready'
          : form['hmoInputs.rooms'] || form['hmoInputs.rentPerRoom'] ? 'partial' : 'none' as 'ready' | 'partial' | 'none',
      },
      {
        key: 'sa', label: 'Serviced Accommodation',
        status: form['saInputs.nightlyRate'] ? 'ready'
          : 'none' as 'ready' | 'partial' | 'none',
      },
      {
        key: 'brrr', label: 'BRRR',
        status: form['brrrInputs.gdv'] && form['brrrInputs.rentPostRefurb'] ? 'ready'
          : form['brrrInputs.gdv'] || form['brrrInputs.rentPostRefurb'] ? 'partial' : 'none' as 'ready' | 'partial' | 'none',
      },
      {
        key: 'flip', label: 'FLIP',
        status: form['flipInputs.gdv'] ? 'ready' : 'none' as 'ready' | 'partial' | 'none',
      },
    ] : []),
    ...(mode === 'rent' || mode === 'specialist' ? [
      {
        key: 'r2r', label: 'Rent to Rent',
        status: form['r2rInputs.subletIncome'] && form['r2rInputs.leaseCost'] ? 'ready'
          : form['r2rInputs.subletIncome'] || form['r2rInputs.leaseCost'] ? 'partial' : 'none' as 'ready' | 'partial' | 'none',
      },
      {
        key: 'social', label: 'Social Housing',
        status: form['socialInputs.guaranteedRent'] ? 'ready' : 'none' as 'ready' | 'partial' | 'none',
      },
    ] : []),
  ]
  return all
}, [form, mode])
```

---

## Part F — "SC" pill in sticky sub-nav

Find the sticky sub-nav band where "Inputs / Results / Sensitivity / Workings" tabs render. Find specifically the "Inputs" tab button/label. After its text, render the SC pill only when `scMode === 'sc'` and the current sub-view is Inputs:

```tsx
{scMode === 'sc' && (
  <span style={{
    fontSize: 9, fontWeight: 700,
    background: '#7c3aed', color: '#fff',
    padding: '1px 5px', borderRadius: 8,
    marginLeft: 4, letterSpacing: '.02em',
    verticalAlign: 'middle',
  }}>
    SC
  </span>
)}
```

---

## Part G — Data persistence rules (non-negotiable)

Add this comment in the code near the `scMode` state declaration as a permanent reminder:

```tsx
// scMode is a display-only preference. It NEVER affects form field values.
// sharedInputs persist across all strategies (already handled by form state).
// Strategy-specific fields (btlInputs.*, hmoInputs.*, etc.) persist per-strategy (already handled).
// Switching scMode must never call setField, reset form, or clear any input.
```

---

## Part H — Checklist before committing

- [ ] `npx tsc --noEmit` → zero errors
- [ ] SC mode activates when "Activate →" is clicked (Pro Plus only)
- [ ] Step 2 header changes, tiles become non-interactive, explanatory note appears
- [ ] All strategy income sections appear below existing sections in SC mode (filtered by route)
- [ ] Strategy income sections use existing Sec/IField components — look identical to rest of inputs page
- [ ] Sidebar shows SC completion panel in SC mode, existing sidebar in manual mode
- [ ] Strategy dots show correct status: green = required fields filled, amber = partial, grey = empty
- [ ] "View ranked results" button activates (turns teal) when ≥1 strategy is 'ready'
- [ ] "Exit Smart Capture" link in sidebar resets scMode to 'manual' without clearing any data
- [ ] "Exit Smart Capture" link in Step 2 header works identically
- [ ] SC pill appears in sticky sub-nav when SC is active
- [ ] SC mode is disabled (opacity .5, cursor not-allowed) when `!isEditing`
- [ ] Entering/exiting SC mode never clears any form field
- [ ] Field paths in SC income sections match existing strategy-section field paths exactly
- [ ] Manual mode sidebar (Input completion) is completely unchanged

When all checklist items pass:

```bash
git add -A && git commit -m "Stage 10 — Prompt 15c: Smart Capture revamp (inline, non-wizard, sidebar tracker)" && git push origin stage-6
```
