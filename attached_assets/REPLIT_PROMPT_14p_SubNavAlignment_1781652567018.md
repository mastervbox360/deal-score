# REPLIT PROMPT 14p — Match Analysis sub-tabs to Overview sub-tab style

## What this does
The Analysis sub-tabs (Inputs / Results / Sensitivity / Workings) are smaller and appear indented compared to the Overview sub-tabs (Overview / Deal Status). This prompt aligns them: same left-flush position, same button font size, same button padding.

**Dependency:** Prompt 14o merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14p: analysis sub-tabs match overview style" && git push origin stage-6`

---

## THE CHANGE

### Step 1 — Read the Overview sub-tab band

In `DealOverview.tsx`, find the sticky sub-tab band. Note the exact:
- Inner div `padding` value
- Button `fontSize`, `fontWeight`, `padding`, `borderRadius`
- Button background when active and inactive

### Step 2 — Update the Analysis sticky band inner div (`AnalysisHub.tsx`)

Find the inner div inside the sticky Analysis sub-nav wrapper. Ensure it uses:

```tsx
<div style={{
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 24px',   // match Overview inner div padding exactly
}}>
  <SubNav active={localView} onChange={...} />

  {/* right side: Editing / Viewing indicator */}
  {activeView === 'inputs' && ( ... )}
</div>
```

The `SubNav` component must be the first child (left-aligned), with `justifyContent: 'space-between'` pushing the lock/edit text to the right. If there is currently any `margin: 'auto'`, `justifyContent: 'center'`, or extra `paddingLeft` on the SubNav or its wrapper, remove it.

### Step 3 — Update the `SubNav` component button styles

Read the Overview sub-tab buttons' current style. Apply the same `fontSize`, `fontWeight`, and `padding` values to the `SubNav` buttons in `AnalysisHub.tsx`.

If the Overview buttons use, for example, `fontSize: '12px'`, `fontWeight: 600`, `padding: '6px 16px'`, then update the SubNav buttons to match exactly. Do not guess — read the Overview component first and copy the values.

Keep `borderRadius: '7px'` on SubNav buttons and `borderRadius: 10` on the SubNav container (these already match the Overview tab container shape).

---

## Summary checklist
- [ ] Read Overview sub-tab button styles before making changes
- [ ] Analysis inner div: `padding: '8px 24px'`, `justifyContent: 'space-between'`
- [ ] SubNav is left-aligned (first child in flex row)
- [ ] SubNav button `fontSize` and `padding` match Overview tab buttons
- [ ] No extra left margin/indent on SubNav or its container
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
