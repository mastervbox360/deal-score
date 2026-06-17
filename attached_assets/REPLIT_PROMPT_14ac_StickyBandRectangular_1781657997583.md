# REPLIT PROMPT 14ac — Sticky band: rectangular (no radius) + alignment fix

## Why
Rounded corners on a sticky element have transparent corner triangles — content scrolling underneath always bleeds through. There is no pure CSS solution that simultaneously has rounded corners, no corner bleed, no visible border box, and no colour mismatch. The industry solution is a rectangular sticky band with a bottom border. The tab buttons inside remain rounded pills — only the band container itself goes rectangular.

**Dependency:** Prompt 14ab merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14ac: sticky band rectangular, alignment fix" && git push origin stage-6`

---

## FIX 1 — Both bands: rectangular sticky band

**Spacing reference — Linear pattern:**
- Band total height ~44px: achieved with `padding: '10px 0'` on the inner flex div + tab buttons at `padding: '6px 14px'`
- Bottom border only — no gap below. The border IS the separator; content starts immediately underneath
- No rounded corners, no shadow, no extra spacing below

In `AnalysisHub.tsx` AND `DealOverview.tsx`, replace the current sticky band div with:

```tsx
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: '#fff',
  borderBottom: '1px solid var(--ds-border)',
  // NO borderRadius, NO boxShadow, NO filter, NO marginBottom, NO paddingBottom
}}>
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 0',   // ~44px total band height, matches Linear
  }}>
    {/* SubNav + right-side indicator — unchanged */}
  </div>
</div>
```

Also update the tab buttons inside SubNav to `padding: '6px 14px'` (slightly more generous than current `5px 14px`).

The `borderBottom: '1px solid'` (1px not .5px) gives a clean, visible separator — standard sticky-tab pattern (Linear, Notion, GitHub). No corner transparency possible. White background covers everything cleanly.

---

## FIX 2 — Analysis band: "Viewing — read-only" alignment

The lock text is rendering lower than the tab buttons. Ensure the right-side span has `display: 'flex'` and `alignItems: 'center'`:

```tsx
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
```

---

## Summary checklist
- [ ] Both bands: `borderRadius` removed, `borderBottom: '1px solid var(--ds-border)'` added, `background: '#fff'`
- [ ] Both bands: `filter`, `boxShadow`, `paddingBottom`, `marginBottom` all removed
- [ ] Inner content div: `display: 'flex'`, `alignItems: 'center'`, `justifyContent: 'space-between'`, `padding: '10px 0'`
- [ ] SubNav tab buttons: `padding: '6px 14px'`
- [ ] Right-side spans: `display: 'flex'`, `alignItems: 'center'`, `gap: 4`
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
