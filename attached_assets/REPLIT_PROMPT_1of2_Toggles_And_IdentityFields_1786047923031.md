# Replit Agent Prompt 1 of 2 — Fix Appendix Toggle, Add Glossary Toggle, Add Identity Fields

**Branch: confirm you are on `production-candidate`.**

## Part 1 — Fix the broken "Include full calculation workings" toggle

The existing `includeWorkingsInPDF` state is passed into `pdfProps.includeWorkings`, but neither `DealScorePDF.tsx` nor `DealScorePDFProPlus.tsx` actually reads this prop anywhere — the Formulas & Calculations page renders unconditionally regardless of the checkbox. Confirm this yourself by searching both files for `props.includeWorkings` before fixing (there should be zero results, confirming the toggle is currently non-functional).

Fix: wrap the entire "Formulas & Calculations" `<Page>` block in both PDF components in a conditional on `props.includeWorkings` — when `false`, that page should not render at all in the output.

## Part 2 — Add a Glossary toggle, following the exact same pattern

1. Add a new state variable, e.g. `includeGlossaryInPDF`, defaulting to `false` — same pattern as `includeWorkingsInPDF`.
2. Add a new checkbox in the Inputs form, positioned directly next to/below the existing "Include full calculation workings as a PDF appendix" checkbox, labelled "Include glossary as a PDF appendix" — same visual style.
3. Pass it into `pdfProps` as `includeGlossary`.
4. Wrap the entire "Glossary" `<Page>` block in both PDF components in a conditional on `props.includeGlossary`.
5. Both toggles should behave identically and independently — a sourcer can include neither, either, or both.

## Part 3 — Add WhatsApp, PRS number, ICO number, and Company Number fields

These are real, previously-requested fields that were never built. Read the existing "Prepared By" section in `Home.tsx` (around where `preparedBy.name`/`preparedBy.email`/`preparedBy.phone` and `companyName` are defined and rendered) before adding to it.

1. Add four new state variables: `whatsappNumber`, `prsNumber` (Property Redress Scheme), `icoNumber` (ICO registration), `companyRegNumber` (Companies House number) — all plain string state, following the exact same pattern as the existing `preparedBy`/`companyName` fields.
2. Add four new input fields in the same "Prepared By" section of the Inputs form, positioned sensibly alongside the existing name/email/phone/company fields — labelled "WhatsApp Number," "Property Redress Scheme Number," "ICO Registration Number," and "Company Registration Number." All optional, no validation required beyond basic text input.
3. Pass all four into `pdfProps` so they're available for the Legal & Disclosure page and the new contact page being built in Prompt 2 (don't build the contact page in this prompt — just get the fields captured and threaded through to `pdfProps`).

## Part 4 — Persist identity/branding fields via localStorage

Currently `preparedBy`, `companyName`, and (once added) the four new fields above are plain React state, requiring the sourcer to retype them every session — confirmed by checking there's no `localStorage` usage for these fields (only the AI generation counter currently uses `localStorage`). This is worth fixing now given we're adding four more fields to an already-leaky form.

1. On mount, read `preparedBy`, `companyName`, `whatsappNumber`, `prsNumber`, `icoNumber`, `companyRegNumber` from `localStorage` (a single JSON blob under one key, e.g. `ds_sourcer_identity`, is cleaner than six separate keys) if present, and use those as the initial state instead of empty strings.
2. On any change to any of these fields, write the updated combined object back to that same `localStorage` key (debounced is fine, doesn't need to be instant).
3. This is a one-time-setup convenience — the fields remain fully editable per-session as they already are, this just means a returning sourcer doesn't start from blank every time.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Test: tick/untick both appendix toggles independently, generate a PDF each time, confirm the Formulas & Calculations and Glossary pages appear/disappear correctly and independently.
4. Test: fill in all four new identity fields, refresh the page, confirm they're still populated (persistence working).
5. Do not push automatically — report back what changed, the `tsc` result, and screenshots of both toggles and the new fields, and I'll verify before you push to `production-candidate`.
