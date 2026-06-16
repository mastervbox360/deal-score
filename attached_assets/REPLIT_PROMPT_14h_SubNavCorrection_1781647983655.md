# REPLIT PROMPT 14h — Sub-nav background removal & button shape revert

## What this does
Corrects the changes made in Prompt 14g:
1. Remove the background colour from the Analysis sub-nav wrapper entirely (fully transparent — just the buttons floating on the page)
2. Revert the SubNav button border-radius back to what it was before 14g (7px, not 16px pill)
3. Remove the background from the Overview sub-tabs wrapper using the same approach — but do NOT move or restructure where those tabs currently live in the component
4. The `.sbar-sticky` offset fix from 14g (20px → 56px) is correct — keep it

**Dependency:** Prompt 14g merged.

## Standing rules
- Read `AnalysisHub.tsx` and `DealOverview.tsx` (or wherever "Deal Status" lives) in full before touching them
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14h: sub-nav transparent, button shape reverted" && git push origin stage-6`

---

## FIX 1 — Analysis sub-nav: fully transparent wrapper, original button shape

### Sticky wrapper div
Find the sticky `div` that wraps `<SubNav>` (the one with `position: 'sticky'` and `background: 'var(--bg-body...)'` added in 14g).

Change `background` to `'transparent'` and remove any `borderTop` / `borderBottom` that may remain:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 20px 6px',
}}>
  <SubNav active={activeView} onChange={(v) => { setLocalView(v); onViewChange?.(v) }} />
</div>
```

### SubNav component — revert to original button shape
The 14g change made button `borderRadius` → `16px` and font → `12px`. Revert both. Also remove `boxShadow` from the container and keep the container's `background` and `border` — the container itself is fine as a visual grouping element for the buttons. Just revert what changed:

```tsx
function SubNav({ active, onChange }: { active: SubView; onChange: (v: SubView) => void }) {
  const items: { key: SubView; label: string; icon: string }[] = [
    { key: 'inputs',      label: 'Inputs',      icon: 'ti-adjustments-horizontal' },
    { key: 'results',     label: 'Results',     icon: 'ti-chart-line' },
    { key: 'sensitivity', label: 'Sensitivity', icon: 'ti-chart-bar' },
    { key: 'workings',    label: 'Workings',    icon: 'ti-list-search' },
  ]
  return (
    <div style={{
      display: 'flex',
      gap: '4px',
      background: '#fff',
      border: `.5px solid var(--ds-border)`,
      borderRadius: '10px',
      padding: '4px',
      width: 'fit-content',
    }}>
      {items.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            fontSize: '11px',
            fontWeight: 600,
            padding: '5px 14px',
            borderRadius: '7px',
            border: 'none',
            background: active === key ? 'var(--navy)' : 'transparent',
            color: active === key ? '#fff' : 'var(--text-2)',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all .15s',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            whiteSpace: 'nowrap',
          }}
        >
          <i className={`ti ${icon}`} style={{ fontSize: '11px' }} />{label}
        </button>
      ))}
    </div>
  )
}
```

---

## FIX 2 — Overview sub-tabs: transparent wrapper, no structural change

Find the Overview / Deal Status sub-tab row in `DealOverview.tsx` (search for `"Deal Status"`). 

**Do NOT move or restructure these tabs** — they should stay exactly where they currently live in the component. The only change is to remove any background colour that was added to their wrapper in Prompt 14g.

Find the wrapper div around the Overview / Deal Status buttons and set its background to `'transparent'`. Remove any `borderTop` / `borderBottom` / `background` that 14g added:

```tsx
// On the wrapper div that holds the Overview / Deal Status buttons — change only the background:
background: 'transparent'
// Remove any border-top, border-bottom added by 14g
```

Also revert any `borderRadius` changes made to those buttons in 14g — they should match the shape they had before 14g.

If 14g added a new sticky wrapper or extracted these tabs to a new row above the existing content, revert that entirely — put the tabs back exactly where they were before 14g.

---

## Summary checklist

- [ ] Analysis sub-nav sticky wrapper: `background: transparent`, no borders
- [ ] SubNav button radius: `7px` (reverted from 16px), font `11px`, padding `5px 14px`
- [ ] SubNav container: `borderRadius: 10px`, no `boxShadow`
- [ ] Overview sub-tabs wrapper: `background: transparent`, no structural changes
- [ ] Overview sub-tab buttons: same shape as before 14g
- [ ] `.sbar-sticky` offset remains at `+ 56px` (keep the fix from 14g)
- [ ] `npx tsc --noEmit` zero errors

## After completing
1. `npx tsc --noEmit` — zero errors
2. Screenshot: sub-tabs on Analysis page and Overview page — buttons visible, no background/strip behind them
3. Commit and push
