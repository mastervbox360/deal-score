# REPLIT PROMPT 14ae — Sticky band: segmented control on grey

## Why
All previous attempts failed because:
- Rounded sticky element → transparent corner triangles → content bleeds through
- White sticky background → merges visually with page cards
- Transparent outer → no way to mask corner triangles

The solution: set the sticky outer `background` to `var(--bg-sec, #f5f6f8)` — the **same grey** as the page background. The corner triangles are now filled with grey that matches the page behind them = invisible. The SubNav pill becomes a segmented control with a slightly darker grey container and white active state — it floats on the grey band naturally with no border or shadow needed on the outer container.

**Dependency:** Prompt 14ad merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ae: sticky band segmented-on-grey" && git push origin stage-6`

---

## FIX 1 — AnalysisHub.tsx: sticky container

Replace the current sticky outer div with:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: 'var(--bg-sec, #f5f6f8)',  // ← matches page background, corners invisible
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '8px 0',
  marginBottom: 8,
  // NO border, NO borderRadius, NO boxShadow, NO filter
}}>
  <SubNav active={activeView} onChange={(v) => { setLocalView(v); onViewChange?.(v) }} />
  {activeView === 'inputs' && (
    isEditing ? (
      <span style={{ fontSize: 11, fontWeight: 600, color: '#065f46', background: '#d1fae5', padding: '3px 10px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <path d="M2 10l2.5-.5L10 4a1.414 1.414 0 00-2-2L2.5 7.5 2 10z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Editing
      </span>
    ) : (
      <span style={{ fontSize: 11, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
          <rect x="1" y="5" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
          <path d="M4 5V3.5a2 2 0 014 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        Viewing — read-only
      </span>
    )
  )}
</div>
```

---

## FIX 2 — SubNav component: segmented control style

Find the SubNav component file (likely `SubNav.tsx` or similar). Replace the outer container div and button styles:

### Outer container div
```tsx
<div style={{
  display: 'inline-flex',
  gap: 0,
  background: '#e2e4e8',       // slightly darker grey — the "track"
  borderRadius: 8,
  padding: '3px',
  width: 'fit-content',
  // NO border, NO boxShadow
}}>
```

### Active button
```tsx
// active state:
{
  background: '#ffffff',
  borderRadius: 6,
  boxShadow: '0 1px 3px rgba(0,0,0,.12)',
  color: 'var(--navy, #1B3A6B)',
  fontWeight: 500,
  fontSize: 12,
  padding: '5px 14px',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}
```

### Inactive button
```tsx
// inactive state:
{
  background: 'transparent',
  borderRadius: 6,
  color: 'var(--text-2, #6c757d)',
  fontWeight: 400,
  fontSize: 12,
  padding: '5px 14px',
  border: 'none',
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}
```

---

## FIX 3 — DealOverview.tsx: same treatment

### Sticky container
Same as Fix 1 — `background: 'var(--bg-sec, #f5f6f8)'`, `padding: '8px 0'`, `marginBottom: 8`, no border/radius/shadow.

### Tab button group div (the div wrapping Overview / Deal Status buttons)
Apply the same segmented control pattern as Fix 2:

```tsx
<div style={{
  display: 'inline-flex',
  gap: 0,
  background: '#e2e4e8',
  borderRadius: 8,
  padding: '3px',
  width: 'fit-content',
}}>
  {/* Overview button */}
  <button
    onClick={() => setOverviewSubTab('overview')}
    style={{
      background: overviewSubTab === 'overview' ? '#ffffff' : 'transparent',
      borderRadius: 6,
      boxShadow: overviewSubTab === 'overview' ? '0 1px 3px rgba(0,0,0,.12)' : 'none',
      color: overviewSubTab === 'overview' ? 'var(--navy, #1B3A6B)' : 'var(--text-2, #6c757d)',
      fontWeight: overviewSubTab === 'overview' ? 500 : 400,
      fontSize: 12,
      padding: '5px 14px',
      border: 'none',
      cursor: 'pointer',
    }}
  >
    Overview
  </button>
  {/* Deal Status button — same pattern with overviewSubTab === 'deal-status' */}
</div>
```

---

## Why this works

| Problem | How this fixes it |
|---|---|
| Corner bleed | Outer has no `borderRadius`. Rectangular sticky = no transparent corner triangles. |
| Grey rectangle visible | `background: var(--bg-sec)` = same grey as page = invisible band |
| White block merged with cards | Not white — grey band separates from white section cards |
| Faint box line | No border, no boxShadow on outer |
| Shadow seam in gap | No shadow on outer — pill shadow is contained within the pill |

The segmented control pill sits on grey → looks natural and intentional. Active tab = white lift. Inactive = recessed. This is the exact pattern used by Linear, Vercel, and Apple's iOS/macOS.

---

## Summary checklist
- [ ] AnalysisHub sticky container: `background: 'var(--bg-sec, #f5f6f8)'`, `padding: '8px 0'`, `marginBottom: 8`, `alignItems: 'center'`, `justifyContent: 'space-between'`, NO border/radius/shadow
- [ ] SubNav container div: `background: '#e2e4e8'`, `borderRadius: 8`, `padding: '3px'`, `display: 'inline-flex'`
- [ ] SubNav active button: white bg, `borderRadius: 6`, shadow, navy text, `fontWeight: 500`, `padding: '5px 14px'`
- [ ] SubNav inactive button: transparent bg, muted text, `fontWeight: 400`, same padding
- [ ] DealOverview sticky container: same grey treatment
- [ ] DealOverview tab group: same segmented control div + button styles
- [ ] Right-side editing/viewing indicator: unchanged spans, vertically centred
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
