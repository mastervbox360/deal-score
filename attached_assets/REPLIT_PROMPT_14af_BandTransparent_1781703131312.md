# REPLIT PROMPT 14af — Sticky band: match exact page background colour

## Why
The sticky outer div has `background: 'var(--bg-sec, #f5f6f8)'` which resolves to a slightly different shade than the actual page background, making the band faintly visible. Transparent causes corner bleed (content scrolls behind the band). The fix: find the exact computed background colour of the page content wrapper and hardcode it on the sticky band so they are identical.

**Dependency:** Prompt 14ae merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14af: sticky band matches page bg" && git push origin stage-6`

---

## STEP 1 — Find the exact page background colour

In the browser dev tools (or by inspecting the source), find the background colour of the **scroll container** — the outermost div that wraps the tab content area in both `AnalysisHub.tsx` and `DealOverview.tsx`. This is the div that has the grey page background the section cards sit on.

Look for a CSS class or inline style like:
- `backgroundColor: '#f5f6f8'`
- `background: 'var(--bg-sec)'`
- or check `index.css` / `globals.css` for `--bg-sec` definition

The most likely values are `#f5f6f8` or `#f4f5f7`. Confirm the exact hex.

---

## STEP 2 — Set the sticky band to that exact colour

In `AnalysisHub.tsx` AND `DealOverview.tsx`, find the sticky outer div and set `background` to the exact hex found in Step 1. Do NOT use a CSS variable — use the literal hex so there is zero chance of a mismatch:

```tsx
// Example — replace #f5f6f8 with whatever exact value you found:
background: '#f5f6f8',
```

This makes the sticky band and the page background identical colours — the band becomes invisible while still covering the corner areas as content scrolls under it.

---

## Summary checklist
- [ ] Inspected actual page background colour (confirmed hex value)
- [ ] AnalysisHub.tsx sticky outer: `background` set to exact page background hex
- [ ] DealOverview.tsx sticky outer: `background` set to exact page background hex
- [ ] Scroll the page — band should be completely invisible, no bleed
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
