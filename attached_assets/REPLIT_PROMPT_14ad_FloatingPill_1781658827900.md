# REPLIT PROMPT 14ad — Sticky band: floating pill approach

## The idea
Stop styling the full-width sticky CONTAINER as a card. The container goes transparent — the SubNav button-group pill itself becomes the floating visual element. The pill's own white background fills its rounded corners, so there are no transparent corner triangles and no corner bleed possible.

**Dependency:** Prompt 14ac merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ad: sticky band floating pill" && git push origin stage-6`

---

## FIX 1 — AnalysisHub.tsx: sticky container + SubNav pill

### Sticky container (outer div)
Replace current sticky div with a transparent container:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: 'transparent',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '10px 0',
  marginBottom: 12,
  // NO border, NO borderRadius, NO boxShadow, NO filter, NO paddingBottom
}}>
  <SubNav active={activeView} onChange={(v) => { setLocalView(v); onViewChange?.(v) }} />
  {/* right-side indicator */}
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

### SubNav pill (the button-group container div inside SubNav)
The SubNav component's container div currently has no border/shadow after 14x. Give it the card styling:

```tsx
// Inside SubNav component — the outer container div:
<div style={{
  display: 'flex',
  gap: '4px',
  background: '#fff',
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,.09)',
  padding: '4px',
  width: 'fit-content',
}}>
```

---

## FIX 2 — DealOverview.tsx: same treatment

### Sticky container
Same as above — transparent background, `padding: '10px 0'`, `marginBottom: 12`, flex row, no border/shadow/radius.

### Tab button group div
The div wrapping the Overview / Deal Status buttons gets the pill styling:

```tsx
<div style={{
  display: 'flex',
  gap: '4px',
  background: '#fff',
  borderRadius: 10,
  boxShadow: '0 1px 4px rgba(0,0,0,.09)',
  padding: '4px',
  width: 'fit-content',
}}>
  {/* Overview / Deal Status buttons — unchanged */}
</div>
```

---

## Why this works
- The pill's `background: '#fff'` fills its own rounded corner areas — no transparent triangles
- The sticky container is transparent — no colour mismatch with the page, no visible rectangle
- `boxShadow` on the pill is small and contained — doesn't bleed into any gap area
- `marginBottom: 12` creates the grey breathing room below in the document flow

---

## Summary checklist
- [ ] AnalysisHub sticky container: `background: transparent`, `padding: '10px 0'`, `marginBottom: 12`, flex row with space-between, NO border/radius/shadow
- [ ] SubNav pill container: `background: '#fff'`, `borderRadius: 10`, `boxShadow: '0 1px 4px rgba(0,0,0,.09)'`, `padding: '4px'`
- [ ] DealOverview sticky container: same transparent treatment
- [ ] DealOverview tab button group: same pill styling
- [ ] Right-side indicators: plain spans, vertically centred via parent flex `alignItems: 'center'`
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
