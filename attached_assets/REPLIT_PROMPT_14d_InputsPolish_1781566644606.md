# REPLIT PROMPT 14d — Inputs Polish & Structure Corrections

## What this does
Fixes 9 remaining issues in ViewInputs identified from screenshot review. Mix of CSS fixes, visual improvements, section renames, and one structural reorder (Purchase financing). All changes are in `AnalysisHub.tsx` unless stated otherwise.

**Dependency:** Prompt 14c merged and passing tsc.

## Standing rules
- Read the file in full before touching it
- npx tsc --noEmit must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14d: Inputs polish & structure corrections" && git push origin stage-6`

---

## FIX 1 — Sticky sub-tabs (Analysis + Overview)

The inner sub-tab row (Inputs | Results | Sensitivity | Workings) must remain sticky as the user scrolls through the long inputs page. Currently it scrolls away.

Find the sub-tab row in `AnalysisHub.tsx` (the row containing the Inputs/Results/Sensitivity/Workings tab buttons). Add sticky positioning:

```tsx
{/* Sub-tab row — must be sticky */}
<div style={{
  position: 'sticky',
  top: 178, // chrome height: header(50) + info strip(44) + livebar(44) + deal tabs(40) = 178px
  zIndex: 100,
  background: '#fff',
  borderBottom: '.5px solid var(--ds-border)',
  display: 'flex',
  // ... existing styles
}}>
  {/* Inputs | Results | Sensitivity | Workings tabs */}
</div>
```

**Calculate the correct `top` value:** Sum the heights of all sticky chrome layers above this row (DealChrome header + info strip + livebar + deal tabs). Use the existing CSS variable `--chrome-total` if it exists, or calculate manually. The sub-tab row must sit flush below the deal tabs layer.

Apply the same `position: sticky` treatment to the Overview page sub-tabs if they exist (any inner tab row in ViewOverview).

---

## FIX 2 — Section card title row: grey background

Every section card title (e.g. "Property information", "Property & purchase", "Ownership & tax", "Seller") must have a light grey header band at the top of the card, separated from the fields below by a thin border.

Find every `Sec` component call in ViewInputs. The `Sec` component renders the card title. Update it (or its inline equivalent) so the title row has:

```tsx
{/* Section card title row */}
<div style={{
  background: 'var(--bg-sec)', // #f5f6f8
  borderBottom: '.5px solid var(--ds-border)',
  padding: '10px 18px',
  borderRadius: '10px 10px 0 0', // top corners only
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 0, // remove any bottom margin — border-bottom handles separation
}}>
  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
    {title}
  </span>
  {complete && (
    <span style={{ fontSize: 11, fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '2px 9px', borderRadius: 20 }}>
      Complete
    </span>
  )}
</div>
{/* Fields area — white */}
<div style={{ padding: '16px 18px' }}>
  {children}
</div>
```

If `Sec` is a reusable component, update it there. If the titles are inline, update each one. The overall card structure becomes: grey header band (title + Complete chip) → white fields area below.

---

## FIX 3 — Property photos: remove icon, replace pill with plain text

Find the Property photos section card header. Two changes:

**3a — Remove the camera/image icon** from the left of the "Property photos" heading. The heading should read "Property photos" in plain text with no icon prefix, matching all other section headings.

**3b — Replace "Used in investor pack" pill** with small plain grey text:

```tsx
{/* Replace the pill with this */}
<span style={{ fontSize: 11, color: 'var(--text-2)', fontStyle: 'italic' }}>
  ★ Hero image = deal card
</span>
```

No bordered pill, no background — just the plain note text right-aligned in the header.

---

## FIX 4 — Strategy tiles: icons, remove "Live" badge, add Coming Soon tiles

### 4a — Add SVG icon to each strategy tile

Each strategy tile must have a small icon in the top-left. Use these Tabler icon classes (the project already loads the Tabler webfont):

| Strategy | Icon class |
|---|---|
| BTL | `ti-home` |
| HMO | `ti-users` |
| SA | `ti-calendar-event` |
| Social Housing | `ti-heart-handshake` |
| BRRR | `ti-refresh` |
| FLIP | `ti-tools` |
| R2R | `ti-file-text` |
| R2HMO | `ti-users` |
| R2SA | `ti-calendar-event` |
| R2Social | `ti-heart-handshake` |
| Lease option | `ti-file-certificate` |
| Assisted sale | `ti-handshake` |

Add the icon at the top of each tile:

```tsx
{/* Inside each strategy tile, at the top */}
<div style={{
  width: 32,
  height: 32,
  borderRadius: 7,
  background: isActive ? 'var(--navy)' : 'var(--bg-sec)',
  border: '.5px solid var(--ds-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: 8,
  transition: 'all .18s',
}}>
  <i className={`ti ${iconClass}`} style={{
    fontSize: 16,
    color: isActive ? '#fff' : 'var(--text-2)',
  }} />
</div>
```

### 4b — Remove "✓ Live" badge from all live strategy tiles

Delete any `✓ Live` or `stb-live` badge rendering from tiles that are currently live/active. Only show badges for non-live states:
- **Coming soon** tiles: keep the amber "Coming soon" badge
- **Selected** tile: the navy border + blue background already communicates selection
- **Live tiles**: no badge at all — silence is sufficient

### 4c — Add "Coming soon" tiles for missing strategies

Ensure all routes show their full strategy set, with unavailable ones greyed out as "Coming soon":

**When Buy route selected (Step 2):** BTL · HMO · SA · Social Housing · BRRR · FLIP (all live — no changes needed)

**When Rent route selected (Step 2):** R2R (live) · R2HMO (coming soon) · R2SA (coming soon) · R2Social (coming soon)

**When Specialist/Other route selected (Step 2):** Lease option (coming soon) · Assisted sale (coming soon)

Coming soon tile style:
```tsx
<div style={{
  opacity: 0.5,
  cursor: 'default',
  border: '.5px solid var(--ds-border)',
  borderRadius: 8,
  padding: 11,
  background: 'var(--bg-sec)',
}}>
  <div style={{ /* icon box */ }} />
  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)', marginBottom: 2 }}>{name}</div>
  <div style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 6 }}>{description}</div>
  <span style={{
    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 20,
    background: '#fef3c7', color: '#92400e', letterSpacing: '.03em',
  }}>
    Coming soon
  </span>
</div>
```

---

## FIX 5 — Step 1 heading: rename

Find Step 1's question text. Change:

**From:** `"How are you planning to control this property?"`  
**To:** `"Your route into this deal"`

The sub-label ("Step 1 of 2") stays as-is.

---

## FIX 6 — Purchase financing: rename + move to correct position

This is the most important structural fix in this prompt.

There is currently a section named **"FLIP — purchase financing"** (or similar strategy-prefixed name) that appears AFTER Ownership & Tax and the strategy-specific fields. This is wrong on two counts:
1. It's incorrectly named — this is the **purchase financing** section (mortgage/bridging/cash for buying the property), not a strategy-specific section
2. It's in the wrong position — it must appear **immediately after Property & Purchase**, not after Ownership & Tax

**Step 1 — Rename:** Find the section titled "FLIP — purchase financing" (or whichever strategy prefix it has). Rename it to simply **"Purchase financing"**. It should not have any strategy prefix — it applies to all strategies.

**Step 2 — Move:** Relocate this section so it renders directly after the Property & Purchase section card, before the Refurb section. The correct order is:

```
5. Property & Purchase
6. Purchase financing   ← this section moves here
7. Refurb
8. (Refurb financing — see FIX 7)
...
```

---

## FIX 7 — Refurb financing: absorb into Refurb section

"Refurb financing" is currently a standalone section card. It belongs inside the Refurb section, not as its own card.

**Step 1 — Remove** the standalone Refurb financing section card.

**Step 2 — Add** Refurb financing method tiles at the **bottom** of the Refurb section card, below the Refurb cost / Contingency / Post-refurb value fields. Add a sub-group label above it:

```tsx
{/* Inside Refurb section, after the main fields */}
<div style={{ height: .5, background: 'var(--ds-border)', margin: '12px 0 10px' }} />
<div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
  REFURB FINANCING
  <span style={{ flex: 1, height: .5, background: 'var(--ds-border)', display: 'block' }} />
</div>
{/* Cash | Bridging method tiles */}
```

The method tiles (Cash | Bridging loan) and any conditional bridging fields that were in the standalone section move here verbatim.

---

## FIX 8 — Strategy-specific section: rename dynamically

Find the section titled "FLIP — project details" (or similar). This section title should update dynamically to reflect whichever strategy is currently active:

```tsx
const strategyLabel = activeTile === 'btl' ? 'BTL'
  : activeTile === 'hmo' ? 'HMO'
  : activeTile === 'sa' ? 'SA'
  : activeTile === 'social' ? 'Social Housing'
  : activeTile === 'brrr' ? 'BRRR'
  : activeTile === 'flip' ? 'FLIP'
  : activeTile === 'r2r' ? 'R2R'
  : 'Strategy'

// Section title:
`${strategyLabel} — project details`
```

So if FLIP is selected it reads "FLIP — project details". If BTL is selected it reads "BTL — project details". If no strategy is selected it reads "Strategy — project details".

---

## FIX 9 — Purchase costs breakdown: simplify

Inside the Property & Purchase section, the Purchase costs breakdown sub-group currently shows 6 fields all at once. Simplify to:

**Always visible (near-universal costs):**
- Solicitor / Conveyancing (£)
- Survey cost (£)

**Hidden in "More purchase costs ↓" mini-collapsible:**
- Broker fee (£)
- Mortgage arrangement fee (£)
- Other costs (£)

**Removed from here — moved to Deal terms:**
- Sourcing fee paid (£) — this is a deal/sourcing cost, not a purchase cost. Add it to the Deal terms section alongside Cooling-off period and Payment terms.

Implementation:

```tsx
{/* Always visible costs */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9 }}>
  {/* Solicitor / Conveyancing */}
  {/* Survey cost */}
  {/* SDLT/LBTT/LTT auto-calculated — already visible */}
</div>

{/* Mini-collapsible for optional costs */}
<button
  onClick={() => setShowMoreCosts(v => !v)}
  style={{
    display: 'flex', alignItems: 'center', gap: 6,
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: 'inherit', fontSize: 11, color: 'var(--text-2)',
    padding: '6px 0', marginTop: 6,
  }}
>
  {showMoreCosts ? '↑ Fewer costs' : '↓ More purchase costs'}
  <span style={{ fontSize: 10, color: '#bbb' }}>(broker fee, arrangement fee, other)</span>
</button>

{showMoreCosts && (
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 9, marginTop: 6 }}>
    {/* Broker fee */}
    {/* Mortgage arrangement fee */}
    {/* Other costs */}
  </div>
)}
```

Add `showMoreCosts` to the existing ViewInputs state (boolean, default false).

**In Deal terms section:** Add Sourcing fee (£) as the first field, before Cooling-off period. Update the Deal terms Complete chip mandatory field list to include `sourcingFee` (treat as optional — Complete can still trigger without it since many deals have no sourcing fee; use `sourcingFeeConfirmed` boolean or simply check if the user has touched the field).

---

## Summary checklist

- [ ] **1**: Analysis sub-tab row sticky (`position: sticky`, correct `top` offset, z-index, white bg)
- [ ] **1b**: Overview sub-tab row sticky (same treatment if applicable)
- [ ] **2**: All Sec card titles → grey `var(--bg-sec)` header band + border-bottom, white fields area below
- [ ] **3a**: Camera icon removed from Property photos heading
- [ ] **3b**: "Used in investor pack" pill → plain italic text `★ Hero image = deal card`
- [ ] **4a**: Tabler icon added to every strategy tile (icon class per table above)
- [ ] **4b**: "✓ Live" badge removed from all live strategy tiles
- [ ] **4c**: Coming soon tiles added for Rent route (R2HMO, R2SA, R2Social) and Specialist route (Assisted sale)
- [ ] **5**: Step 1 question text → "Your route into this deal"
- [ ] **6**: "FLIP — purchase financing" renamed to "Purchase financing" and moved to immediately after Property & Purchase
- [ ] **7**: Refurb financing standalone section removed; content absorbed into bottom of Refurb section with sub-group label
- [ ] **8**: Strategy-specific section title → dynamic `${strategyLabel} — project details`
- [ ] **9a**: Purchase costs visible fields reduced to Solicitor + Survey; rest in "More purchase costs ↓" collapsible
- [ ] **9b**: Sourcing fee moved from Purchase costs to Deal terms

## After completing
1. Run `npx tsc --noEmit` — zero errors required
2. Screenshot: full-scroll inputs page + zoomed Property & Purchase + zoomed Strategy tiles
3. Push: `git add -A && git commit -m "Stage 10 — Prompt 14d: Inputs polish & structure corrections" && git push origin stage-6`

## Tell me
1. The calculated `top` value used for the sticky sub-tabs
2. Whether `Sec` is a reusable component or inline — and which approach was used for FIX 2
3. Screenshot of strategy tiles after icon addition
4. Any TypeScript errors and resolution
