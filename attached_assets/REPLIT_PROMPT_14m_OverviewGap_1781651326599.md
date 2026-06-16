# REPLIT PROMPT 14m — Add gap between Overview sub-tab band and first section

## What this does
Adds spacing between the Overview/Deal Status sub-tab row and the dark navy deal card directly below it. They are currently touching with no breathing room.

**Dependency:** Prompt 14l merged and passing tsc.

## Standing rules
- `npx tsc --noEmit` must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14m: gap between overview band and deal card" && git push origin stage-6`

---

## THE CHANGE

In `DealOverview.tsx`, find the first section/card that renders immediately below the Overview/Deal Status sticky band (the dark navy deal hero card). Add `marginTop: 16` to that card's outer div, or add `paddingBottom: 16` to the sticky band's inner div — whichever is cleaner in context.

Prefer adding it to the content side (the first card below) so the sticky band itself remains clean.

---

## Summary checklist
- [ ] 16px gap between sub-tab band and first content section
- [ ] `npx tsc --noEmit` zero errors
- [ ] Commit and push
