# REPLIT PROMPT 14g — Sub-nav strip, sidebar sticky fix, Overview tab sticky

## What this does
Three targeted visual fixes:
1. Remove the white-background border strip from the Analysis sub-nav (Inputs / Results / Sensitivity / Workings) and replace it with a transparent/page-background style matching the Overview sub-tabs
2. Fix the inputs sidebar sticky top so the card header doesn't disappear behind the sub-nav strip when scrolling
3. Make the Overview page sub-tabs (Overview / Deal Status) sticky

**Dependency:** Prompts 14d, 14f, 15 merged and passing tsc.

## Standing rules
- Read `AnalysisHub.tsx` and any relevant component files in full before touching them
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14g: sub-nav transparency, sidebar sticky fix, overview sticky" && git push origin stage-6`

---

## FIX 1 — Remove white strip from Analysis sub-nav

### Current code (in `AnalysisHub.tsx`, the sticky wrapper div around `<SubNav>`)
```tsx
<div style={{ position: 'sticky', top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))', zIndex: 100, background: '#fff', borderTop: '.5px solid var(--ds-border)', borderBottom: '.5px solid var(--ds-border)', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 20px 0', marginBottom: 0 }}>
  <SubNav active={activeView} onChange={(v) => { setLocalView(v); onViewChange?.(v) }} />
</div>
```

### Change to
Remove the white background, borders, and the `marginBottom: 0`. Replace with a transparent wrapper that blends with the page background (`var(--bg-body, #f5f6f8)`). Also add a small bottom gap so the content doesn't start flush against the sub-nav.

```tsx
<div style={{ position: 'sticky', top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))', zIndex: 100, background: 'var(--bg-body, #f5f6f8)', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px 6px' }}>
  <SubNav active={activeView} onChange={(v) => { setLocalView(v); onViewChange?.(v) }} />
</div>
```

### Also update the `SubNav` component itself
The current `SubNav` container div has `borderRadius: '10px'` — update to `'20px'` (fully pill-shaped) and font size from `'11px'` to `'12px'`:

```tsx
function SubNav({ active, onChange }: { active: SubView; onChange: (v: SubView) => void }) {
  const items: { key: SubView; label: string; icon: string }[] = [
    { key: 'inputs',      label: 'Inputs',      icon: 'ti-adjustments-horizontal' },
    { key: 'results',     label: 'Results',     icon: 'ti-chart-line' },
    { key: 'sensitivity', label: 'Sensitivity', icon: 'ti-chart-bar' },
    { key: 'workings',    label: 'Workings',    icon: 'ti-list-search' },
  ]
  return (
    <div style={{ display: 'flex', gap: '4px', background: '#fff', border: `.5px solid var(--ds-border)`, borderRadius: '20px', padding: '4px', width: 'fit-content', boxShadow: '0 1px 3px rgba(0,0,0,.05)' }}>
      {items.map(({ key, label, icon }) => (
        <button key={key} onClick={() => onChange(key)} style={{ fontSize: '12px', fontWeight: 600, padding: '6px 16px', borderRadius: '16px', border: 'none', background: active === key ? 'var(--navy)' : 'transparent', color: active === key ? '#fff' : 'var(--text-2)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s', display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
          <i className={`ti ${icon}`} style={{ fontSize: '11px' }} />{label}
        </button>
      ))}
    </div>
  )
}
```

---

## FIX 2 — Fix inputs sidebar sticky top

The sidebar card was positioned at a `top` that didn't account for the sub-nav strip height (~40px), causing the sidebar header to sit partially behind the sub-nav when scrolling.

### In `src/index.css` (or whichever CSS file has the `.sbar-sticky` rule added by Prompt 15)

Find:
```css
.sbar-sticky {
  position: sticky;
  top: calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px) + 20px);
  height: fit-content;
}
```

Change to:
```css
.sbar-sticky {
  position: sticky;
  top: calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px) + 56px);
  height: fit-content;
}
```

> The extra 56px = 40px sub-nav strip height + 16px gap. This ensures the sidebar card header clears both the sticky tabs row and the sticky sub-nav strip.

---

## FIX 3 — Make Overview sub-tabs sticky

Find the component that renders the "Overview" and "Deal Status" sub-tabs (search for the string `"Deal Status"` — it will be a tab/button in a deal overview component).

Find the container div/element that wraps those two sub-tab buttons and make it sticky. It should stick below the deal chrome (main header + info strip + livebar + tabs row):

```tsx
// Find the wrapper around the Overview / Deal Status sub-tab buttons and add:
style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 99,
  background: 'var(--bg-body, #f5f6f8)',  // match page background
  padding: '10px 24px 6px',
}}
```

If the Overview sub-tabs currently render inside a card or section, extract them into a sticky row above the card instead.

---

## Summary checklist

- [ ] Sub-nav sticky wrapper: white background + borders removed → transparent `var(--bg-body)`
- [ ] `SubNav` component: `borderRadius` → `20px`, font size → `12px`
- [ ] `.sbar-sticky` top increased to clear sub-nav strip (56px extra vs old 20px)
- [ ] Overview sub-tab row (Overview / Deal Status) is sticky
- [ ] `npx tsc --noEmit` zero errors

## After completing
1. `npx tsc --noEmit` — zero errors
2. Screenshot showing: sub-nav blending with page background, sidebar header visible when scrolled down, Overview sub-tabs sticky
3. Commit and push
