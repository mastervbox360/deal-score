# REPLIT PROMPT 15e — Step Labels Removal + Photos Section Fix
**File:** `artifacts/dealscore/src/components/AnalysisHub.tsx`  
**Branch:** stage-6  
**Depends on:** Prompt 15c complete and committed.

---

## What this prompt fixes

Two visual issues in the inputs page:

1. **Step 1 / Step 2 sections** have custom "STEP X OF 2" labels that make them look like wizard steps. They should be plain `Sec` section cards identical in style to every other section on the page — no step numbering, no custom header treatment.

2. **Photos section** has a collapse toggle (chevron) and a grey upload zone. It should always be fully expanded (no collapse) and the upload zone must have a white background with a dashed border — matching the confirmed mockup exactly.

**No functionality, layout order, or component structure changes — only visual/structural fixes.**

---

## Read the file first

Read `artifacts/dealscore/src/components/AnalysisHub.tsx` in full before making any changes. Locate:
- The "Step 1" section (route picker — Buy / Rent / Specialist tiles)
- The "Step 2" section (strategy tile picker)
- The photos section (upload zone, collapse state, and toggle)

---

## Part A — Step 1: "Your route into this deal"

**Find** the section that currently renders something like:

```tsx
<div>
  <span style={{...}}>STEP 1 OF 2</span>  {/* or similar step label */}
  <h3>Your route into this deal</h3>
  ...
</div>
```

**Replace** the entire section wrapper and custom header with the standard `Sec` component:

```tsx
<Sec title="Your route into this deal">
  {/* existing Buy / Rent / Specialist route tiles — unchanged */}
</Sec>
```

- Remove all "STEP 1 OF 2", "Step 1 of 2", or any step-number label entirely
- The section title is just: **"Your route into this deal"**
- Use the same `Sec` component used by every other section (grey header band, white card body, `1px solid #d1d5db` border)
- Do not add any step badge, prefix, or label inside the `Sec` title

---

## Part B — Step 2: "Strategy selection"

**Find** the section that currently renders something like:

```tsx
<div>
  <span style={{...}}>STEP 2 OF 2</span>  {/* or similar step label */}
  <h3>Select your strategy</h3>
  ...
</div>
```

**Replace** the wrapper and custom header with the standard `Sec` component:

```tsx
<Sec title="Strategy selection">
  {/* existing strategy tiles + SC activation card — unchanged */}
</Sec>
```

- Remove all "STEP 2 OF 2", "Step 2 of 2", or any step-number label
- When `scMode === 'sc'`, the Sec title should still change to "Strategies available to you" (this was built in 15c — preserve that logic, just ensure it renders inside the standard Sec header)
- The SC mode header change from 15c should still work: title = `scMode === 'sc' ? 'Strategies available to you' : 'Strategy selection'`
- Do not add any step badge, prefix, or label inside the `Sec` title

---

## Part C — Photos section: always expanded, white upload zone

### 1. Remove the collapse toggle entirely

Find the photos section. It likely has:
- A collapse state variable (e.g. `photosCollapsed`, `photosOpen`, or a chevron toggle)
- A chevron icon button that toggles visibility of the upload zone
- Conditional rendering of the upload zone based on collapse state

**Remove:**
- The collapse state variable (delete `useState` for photos collapse)
- The toggle button/chevron in the photos section header
- Any conditional `display: 'none'` or `if (!photosOpen)` wrapping the upload zone

The photos section body (upload zone) must always be visible. Never collapsed.

### 2. Photos section header

The section header should use the standard `Sec` component pattern:
- Title: **"Property photos"**
- Right side: `Optional` badge (keep as-is)
- Right side: `★ Hero image = deal card` note (keep as-is, if present)
- **No chevron/collapse button**

### 3. Upload zone: white background with dashed border

Find the upload zone div (the area with the drag-and-drop text and upload icon). Change its styling to match the mockup exactly:

```tsx
<div style={{
  background: '#fff',
  border: '1.5px dashed #d1d5db',
  borderRadius: 10,
  padding: '32px 20px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  cursor: 'pointer',
  minHeight: 120,
}}>
  {/* upload icon */}
  <i className="ti ti-upload" style={{ fontSize: 22, color: '#9ca3af' }} />
  {/* main text */}
  <div style={{ fontSize: 13, color: 'var(--text-1, #1a1a2e)', fontWeight: 500 }}>
    Drag photos here or click to <span style={{ color: 'var(--teal, #1D9E75)', cursor: 'pointer' }}>browse</span>
  </div>
  {/* sub text */}
  <div style={{ fontSize: 11, color: 'var(--text-2, #6c757d)' }}>
    JPG, PNG · up to 20MB · first uploaded photo is auto-set as deal card hero
  </div>
</div>
```

The key visual requirements:
- **White background** (`#fff`) — not grey, not `var(--bg-sec)`
- **Dashed border** (`1.5px dashed #d1d5db`)
- Upload icon in light grey
- "browse" text in teal
- Sub-text in muted grey

If photos have already been uploaded, the uploaded photo thumbnails still render normally inside this section. Only the empty-state upload zone styling changes.

---

## Part D — Checklist before committing

- [ ] `npx tsc --noEmit` → zero errors
- [ ] "STEP 1 OF 2" / "Step 1 of 2" label is gone — section uses standard Sec card with title "Your route into this deal"
- [ ] "STEP 2 OF 2" / "Step 2 of 2" label is gone — section uses standard Sec card with title "Strategy selection"
- [ ] In SC mode, Step 2 title still changes to "Strategies available to you" (15c behaviour preserved)
- [ ] Route tiles (Buy / Rent / Specialist) and strategy tiles are unchanged — only the wrapper/header changed
- [ ] Photos section has no collapse toggle or chevron
- [ ] Photos upload zone has white background and dashed border (not grey)
- [ ] Photos section is always fully expanded
- [ ] No other section layouts or section order changed

When all checklist items pass:

```bash
git add -A && git commit -m "Stage 10 — Prompt 15e: Drop step labels, fix photos section (always expanded, white upload zone)" && git push origin stage-6
```
