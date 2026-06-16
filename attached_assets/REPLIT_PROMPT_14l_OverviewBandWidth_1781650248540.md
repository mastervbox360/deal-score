# REPLIT PROMPT 14l — Fix Overview sub-tab band width

## What this does
The Overview sticky sub-tab band is wider than the page content column because Prompt 14k added `marginLeft: -24, marginRight: -24` to break it out edge-to-edge. Remove those negative margins so the band stays naturally within the content column.

**Dependency:** Prompt 14k merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14l: fix overview band width" && git push origin stage-6`

---

## THE CHANGE

In `DealOverview.tsx` (or wherever the Overview sticky band lives), find the outer sticky div that has `marginLeft: -24` and `marginRight: -24`. Remove both of those properties entirely.

The inner div's `padding: '8px 24px'` should also be simplified — since we're no longer breaking out of the container, horizontal padding should match whatever the parent content area already uses (likely just `padding: '8px 0'` or remove horizontal padding entirely if the parent handles it).

Result: the sticky band stays within the content column and its width matches the page layout naturally.

Also remove the `<div style={{ paddingTop: 20 }} />` spacer that was inserted after the band if it's creating an excessive gap — the content's existing top padding is sufficient.

---

## Summary checklist
- [ ] `marginLeft: -24` removed from outer sticky div
- [ ] `marginRight: -24` removed from outer sticky div  
- [ ] Inner div horizontal padding adjusted so tabs align with content below
- [ ] `paddingTop: 20` spacer removed if it creates excess gap
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
