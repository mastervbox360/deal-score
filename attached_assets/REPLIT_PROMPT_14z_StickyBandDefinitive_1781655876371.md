# REPLIT PROMPT 14z — Sticky band: definitive fix

## What this does
Resolves the "big white block" from 14y while preventing corner bleed and keeping a clean grey gap below. The fix: grey outer div (masks corners against grey page) + border on inner card (visually separates it from section cards so nothing merges) + no box-shadow (which caused the seam).

**Dependency:** Prompt 14y merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14z: sticky band definitive" && git push origin stage-6`

---

## THE FIX — Both bands (DealOverview.tsx + AnalysisHub.tsx)

```tsx
{/* OUTER div — sticky, grey (masks transparent corners), creates gap below */}
<div style={{
  position: 'sticky',
  top: 'calc(var(--hdr-h, 56px) + var(--istrip-h, 48px) + var(--livebar-h, 44px) + var(--tabs-h, 42px))',
  zIndex: 100,
  background: '#f5f6f8',   // grey = page background = fills corner triangles invisibly
  paddingBottom: 8,         // small grey gap below card before section content
}}>
  {/* INNER div — white card, defined by border (not shadow) */}
  <div style={{
    background: '#fff',
    borderRadius: 10,
    border: '.5px solid var(--ds-border)',  // border defines the card — NO boxShadow
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '8px 0',
    }}>
      {/* tab buttons and right-side indicator — unchanged */}
    </div>
  </div>
</div>
```

Key decisions:
- `background: '#f5f6f8'` on outer (NOT `#fff`) — matches the grey page background, fills corner triangles with grey so they're invisible against the page
- `border: '.5px solid var(--ds-border)'` on inner card — visually separates the card from section card backgrounds so they don't merge
- NO `boxShadow` on inner card — shadow bleeds into the `paddingBottom` gap causing a seam line
- `paddingBottom: 8` — small gap (8px not 10px) — creates grey breathing room without a thick visible grey strip

Apply to both `AnalysisHub.tsx` and `DealOverview.tsx`.

---

## Summary checklist
- [ ] Outer div: `background: '#f5f6f8'`, `paddingBottom: 8`, no border, no radius, no shadow, no `overflow: hidden`
- [ ] Inner div: `background: '#fff'`, `borderRadius: 10`, `border: '.5px solid var(--ds-border)'`, NO `boxShadow`
- [ ] Both bands updated
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
