# REPLIT PROMPT 15f — Info Strip Seller CTA + Remove Seller from Inputs + Edit Row
**File:** `artifacts/dealscore/src/components/AnalysisHub.tsx`  
**Branch:** stage-6  
**Depends on:** Prompts 15c, 15d, 15e complete and committed.

---

## What this prompt builds

Three connected changes:

1. **Info strip** — remove "X inputs to confirm" warning + "Confirm inputs" button. Replace with a context-aware seller element: "Link seller" CTA when no seller is linked, seller name when one is.
2. **Seller section on Inputs page** — removed entirely. It has no calculation inputs and the info strip now handles the seller touchpoint across all tabs.
3. **Edit/lock row below sub-tabs** — add the missing editing indicator row directly below the sub-tab band, visible only on the Inputs sub-view.

---

## Read the file first

Read `artifacts/dealscore/src/components/AnalysisHub.tsx` in full before making any changes. Locate:
- The info strip where "Confirm inputs" / amber warning renders
- The Seller `Sec` section inside `ViewInputs`
- The sub-tab band and the `ViewInputs` render area

---

## Part A — Info strip: seller CTA replaces Confirm inputs

### Remove from the info strip:
- The amber "X inputs to confirm" warning badge/button
- The "✓ Confirm inputs" button and any `confirmInputs` handler/state associated with it

### Add in their place: a compact seller element

The seller name lives in `form['sellerName']` (check the exact field key used in the existing Seller section before it's deleted — use that same key).

**When no seller is linked** (`!form['sellerName']`):

```tsx
<button
  onClick={() => onViewChange?.('seller')}
  style={{
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'none',
    border: '.5px solid var(--ds-border, #e3e5e9)',
    borderRadius: 7,
    padding: '5px 11px',
    fontSize: 11, fontWeight: 600,
    color: 'var(--teal, #1D9E75)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
  }}
>
  <i className="ti ti-user-plus" style={{ fontSize: 11 }} />
  Link seller
</button>
```

**When a seller is linked** (`form['sellerName']` has a value):

```tsx
<button
  onClick={() => onViewChange?.('seller')}
  style={{
    display: 'flex', alignItems: 'center', gap: 5,
    background: 'none',
    border: 'none',
    borderRadius: 7,
    padding: '5px 4px',
    fontSize: 11, fontWeight: 500,
    color: 'var(--text-2, #6c757d)',
    cursor: 'pointer',
    fontFamily: 'inherit',
    whiteSpace: 'nowrap',
    maxWidth: 140,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }}
>
  <i className="ti ti-user" style={{ fontSize: 11, flexShrink: 0 }} />
  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
    {String(form['sellerName'])}
  </span>
</button>
```

Both states call `onViewChange?.('seller')` on click. Check how other views are navigated to (e.g. Results uses `onViewChange?.('results')`) and use that same pattern.

Keep "Notes" and "Optimise" buttons in the info strip completely unchanged.

---

## Part B — Remove the Seller section from Inputs entirely

Find the `Sec` section titled "Seller" inside `ViewInputs`. **Delete it completely** — the wrapper, the title, all content inside.

The Inputs page has no calculation inputs for seller data. The info strip now handles the seller touchpoint. Seller management lives on the Seller tab.

After deletion, confirm the section order is:
1. Property information
2. Property photos
3. Route & strategy (Step 1 — now plain Sec, from 15e)
4. Strategy selection (Step 2 — now plain Sec, from 15e)
5. Property & Purchase
6. Purchase financing
7. Leasehold details (if applicable)
8. Refurb
9. Ownership & Tax
10. Monthly costs
11. [Strategy] project details
12. Deal terms
13. Comparables
14. SC strategy income sections (SC mode only — from 15c)

---

## Part C — Edit/lock row below sub-tabs

This row is missing from the Replit build. Add it as the very first element inside `ViewInputs`, before any sections.

```tsx
{/* Editing indicator row — sits directly below sub-tabs */}
<div style={{
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  padding: '8px 0 12px',
  borderBottom: '.5px solid var(--ds-border, #e3e5e9)',
  marginBottom: 16,
}}>
  {/* Left: status text */}
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    {isEditing ? (
      <>
        <span style={{ fontSize: 11, color: 'var(--text-2, #6c757d)' }}>
          Editing — changes save automatically
        </span>
        <span style={{
          fontSize: 10, fontWeight: 600,
          background: '#dcfce7', color: '#166534',
          padding: '2px 7px', borderRadius: 20,
          display: 'inline-flex', alignItems: 'center', gap: 3,
        }}>
          <i className="ti ti-check" style={{ fontSize: 9 }} />
          {saveStatus === 'saving' ? 'Saving...' : 'Saved'}
        </span>
      </>
    ) : (
      <span style={{ fontSize: 11, color: 'var(--text-2, #6c757d)' }}>
        Locked by default to prevent accidental edits — tap Edit to make changes
      </span>
    )}
  </div>

  {/* Right: lock / edit button */}
  {isEditing ? (
    <button
      onClick={() => {
        // Use whatever mechanism the existing codebase uses to switch isEditing to false.
        // isEditing is derived from searchParams.get('editing') === 'true'.
        // Check how the existing "Lock inputs" or edit toggle works and replicate it.
        const params = new URLSearchParams(window.location.search)
        params.delete('editing')
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
        window.location.reload()
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'none',
        border: '.5px solid var(--ds-border, #e3e5e9)',
        borderRadius: 7,
        padding: '5px 11px',
        fontSize: 11, fontWeight: 600,
        color: 'var(--text-2, #6c757d)',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <i className="ti ti-lock" style={{ fontSize: 11 }} />
      Lock inputs
    </button>
  ) : (
    <button
      onClick={() => {
        const params = new URLSearchParams(window.location.search)
        params.set('editing', 'true')
        window.history.replaceState({}, '', `${window.location.pathname}?${params}`)
        window.location.reload()
      }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        background: 'var(--navy, #1B3A6B)',
        border: 'none',
        borderRadius: 7,
        padding: '5px 11px',
        fontSize: 11, fontWeight: 600,
        color: '#fff',
        cursor: 'pointer',
        fontFamily: 'inherit',
      }}
    >
      <i className="ti ti-edit" style={{ fontSize: 11 }} />
      Edit inputs
    </button>
  )}
</div>
```

**Important:** `isEditing` is already derived from URL params (`searchParams.get('editing') === 'true'`). Check how the existing code handles switching edit state — if there's already a `navigate`, `setSearchParams`, or similar mechanism, use that instead of `window.location.reload()`. The reload is a safe fallback only.

---

## Part D — Checklist before committing

- [ ] `npx tsc --noEmit` → zero errors
- [ ] Info strip: no "X inputs to confirm" warning, no "Confirm inputs" button
- [ ] Info strip: shows `ti ti-user-plus` + "Link seller" (teal) when no seller linked
- [ ] Info strip: shows `ti ti-user` icon + seller name (grey) when seller linked
- [ ] Both seller states click through to the Seller tab
- [ ] "Notes" and "Optimise" buttons in info strip unchanged
- [ ] Seller `Sec` section is fully removed from `ViewInputs`
- [ ] Section order after deletion matches the list in Part B (12 sections + SC block)
- [ ] Edit/lock row appears directly below sub-tabs in the Inputs view
- [ ] Edit row: shows "Editing — changes save automatically" + green Saved badge when `isEditing`
- [ ] Edit row: shows locked message + navy "Edit inputs" button when `!isEditing`
- [ ] Lock/Edit button correctly toggles `isEditing` state
- [ ] No other section layouts, section order, or functionality changed

When all checklist items pass:

```bash
git add -A && git commit -m "Stage 10 — Prompt 15f: Seller CTA in info strip, remove seller from inputs, add edit row" && git push origin stage-6
```
