# Replit Agent Prompt — Standardise & Reorganise Input Form Accordions

**Branch: confirm you are on `production-candidate`.**

This does two things together, since they touch the same JSX: (1) standardises the visual/accessibility pattern across all accordion headers in the Inputs form, and (2) reorganises the sections into a clearer structure. No field content, tooltips, AI-generate buttons, autocomplete, or scoring functionality should change — only header styling and which accordion each section lives in.

Read the full current structure in `Home.tsx` before making any changes — specifically every accordion header pattern currently in use (`dealNotesOpen`, `strategyOpen`, `paymentTermsExpanded`, and any others in the Inputs form) and how each one's button/label/chevron is styled.

## Part 1 — Standardise the accordion header pattern

Confirmed inconsistencies to fix:
- **Payment terms & cooling off period** currently uses a different label style entirely (`text-sm font-medium text-slate-700`, sentence case, no navy accent colour, no top border) and is **missing `aria-expanded`** on its toggle button — a real accessibility gap, since the other accordions correctly announce open/closed state to screen readers and this one doesn't.
- The remaining accordions (`Deal Notes`, `Recommended Strategy`, `Show Workings`) mostly share a pattern but have inconsistent padding (`py-3` vs `py-4`) and inconsistent wrapper div spacing classes.

**Standardise every Inputs-form accordion header to one consistent pattern**, based on the majority existing style:
- Label: `text-xs font-semibold uppercase tracking-widest text-[#1B3A6B]`
- Button: `w-full flex items-center justify-between py-4 border-t border-border hover:bg-slate-50 focus:outline-none focus:ring-0 transition-colors`
- `ChevronDown` icon with the existing rotate-on-open animation pattern, coloured `#1B3A6B`
- `aria-expanded={<the relevant state>}` on every toggle button, including Payment terms (add this — it's currently missing)
- Consistent wrapper div spacing — pick one clean pattern and apply it uniformly rather than the current mix of `mt-6`/`pb-0`/`pb-2`/`mb-0` variations

Apply this to all five accordions from Part 2 below. Don't change anything about the `Show Workings`/`Sensitivity Analysis` accordions in the right-hand results panel — those are a different context (results display, not input), leave them as they are.

## Part 2 — Reorganise into five sections, in this order

**Current structure:**
1. Payment terms & cooling off period
2. Recommended Strategy — "Why This Strategy?"
3. Deal Notes (`dealNotesOpen`) — Executive Summary, Property Description, Vendor Situation, Refurb Scope, Area Average Yield, Investment Timeline, Comparable Properties, Listing Links, Property Photos

**Target structure:**
1. **Recommended Strategy** — unchanged content, moved to first position
2. **Market Evidence** (new accordion) — Comparable Properties, Listing Links, Area Average Yield, Investment Timeline (in that order)
3. **Investor Pack Narrative** (renamed from "Deal Notes") — Executive Summary, Property Description, Vendor Situation, Refurb Scope (in that order)
4. **Property Photos** (new, own accordion) — just Property Photos, on its own
5. **Payment terms & cooling off period** — unchanged content, moved to last position, now using the standardised header pattern from Part 1

## What to do

1. Replace the single `dealNotesOpen` boolean with three separate states (e.g. `marketEvidenceOpen`, `investorNarrativeOpen`, `propertyPhotosOpen`), each defaulting to `false`.
2. Move each section's JSX into its correct new accordion — preserve every field, label, tooltip, info icon, and piece of logic exactly as it currently exists. This is a reorganisation, not a rewrite of any field's behaviour.
3. Reorder the five accordions to match the target order above.
4. Apply the standardised header pattern from Part 1 to all five, including updating `paymentTermsExpanded`'s button to add `aria-expanded` and match the visual style.
5. Double-check nothing inside Comparable Properties (autocomplete, traffic-light scoring, factor breakdown, EPC auto-fill) is disturbed by the move — it should work identically inside "Market Evidence."
6. Double-check the Executive Summary and "Why This Strategy?" AI-generate buttons still function correctly in their new locations.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Test on the deploy preview: confirm all five accordions expand/collapse independently, share a consistent visual style, all fields still save/persist correctly, AI-generate buttons still work, and comparable rows still fully function inside "Market Evidence."
4. Confirm the PDF export is unaffected — this is purely an Inputs-form change.
5. Do not push automatically — report back what changed, the `tsc` result, and screenshots showing all five accordions in their new order and consistent style, and I'll verify before you push to `production-candidate`.
