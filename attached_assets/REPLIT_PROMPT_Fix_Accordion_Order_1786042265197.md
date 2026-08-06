# Replit Agent Prompt — Correct Accordion Order & Section Grouping

**Branch: confirm you are on `production-candidate`, and confirm the previous accordion standardisation/reorganisation prompt has already landed.**

The previous reorganisation got the five accordions built and styled correctly, but the order and one section's grouping need correcting. This is a small, targeted fix — no new styling work needed, just reordering.

## What's wrong currently

1. **Accordion order is wrong.** Currently: Recommended Strategy → Market Evidence → Investor Pack Narrative → Property Photos → Payment terms. This has the strategy decision happening *before* the evidence that should justify it, which doesn't make sense workflow-wise.
2. **Investment Timeline is in the wrong accordion.** It's currently inside Market Evidence, but it's project-planning content (exchange/completion/refurb/tenant-in dates), not evidence — it belongs with the narrative content instead.
3. **Sub-order inside Market Evidence is wrong.** Currently: Area Average Yield, Investment Timeline, Comparable Properties, Listing Links. Comparable Properties should be first — it's the primary content of this section, not buried third.

## Corrected target structure

1. **Market Evidence** (now first) — in this order: **Comparable Properties**, Listing Links, Area Average Yield
2. **Recommended Strategy** — unchanged, now second
3. **Investor Pack Narrative** — in this order: Executive Summary, Property Description, Vendor Situation, Refurb Scope, **Investment Timeline** (moved here from Market Evidence)
4. **Property Photos** — unchanged
5. **Payment terms & cooling off period** — unchanged, still last

## What to do

1. Reorder the five accordions in the JSX to match the corrected order above (Market Evidence moves to first position).
2. Move the Investment Timeline section's JSX out of Market Evidence and into Investor Pack Narrative, positioned last within that accordion (after Refurb Scope).
3. Reorder the remaining Market Evidence content so Comparable Properties comes first, then Listing Links, then Area Average Yield.
4. Do not change any field content, logic, styling, or the header standardisation already done — this is purely reordering existing blocks, the same "cut and move, don't rewrite" approach as before.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Screenshot the collapsed accordion list to confirm the order reads: Market Evidence, Recommended Strategy, Investor Pack Narrative, Property Photos, Payment terms & cooling off period.
4. Expand Market Evidence and confirm the order reads: Comparable Properties, Listing Links, Area Average Yield.
5. Expand Investor Pack Narrative and confirm Investment Timeline now appears there, after Refurb Scope.
6. Confirm comparable rows (autocomplete, scoring, breakdown) still work correctly in their new position.
7. Do not push automatically — report back what changed, the `tsc` result, and the screenshots from steps 3–5, and I'll verify before you push to `production-candidate`.
