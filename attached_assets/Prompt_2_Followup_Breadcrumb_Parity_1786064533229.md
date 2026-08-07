REPLIT PROMPT — Prompt 2 follow-up: breadcrumb parity fix
Branch: production-candidate

The portrait cover (DealScorePDF.tsx) breadcrumb shows
"{DEAL_LABELS[dealType]} · {city}" — e.g. "Buy-to-Let Analysis ·
Cardiff". The landscape cover (DealScorePDFProPlus.tsx) breadcrumb only
shows "{DEAL_LABELS[dealType]}" — missing the "· {city}" part.

Find the breadcrumb line in the new cover block in
DealScorePDFProPlus.tsx (added during Prompt 2). Find how the portrait
file derives `city` for its breadcrumb (search for how
`splitAddressThreeLines` or similar is used near the breadcrumb in
DealScorePDF.tsx — Prompt 2's own report mentioned this). Apply the same
logic in DealScorePDFProPlus.tsx so both breadcrumbs match.

If the address-splitting helper isn't already available in
DealScorePDFProPlus.tsx, check whether it's exported from
DealScorePDF.tsx (same pattern as computeCoverKeyMetric was exported
during the last fix) rather than writing a second implementation.

VERIFICATION:
1. npx tsc --noEmit — zero errors.
2. git status — confirm only the expected file(s) changed.
3. Generate a PDF from DealScorePDFProPlus.tsx and confirm the
   breadcrumb now reads "{deal type} · {city}", matching the portrait
   version exactly for the same deal.
4. Do NOT push. Report back tsc result, git status, and the exact
   breadcrumb text from the generated PDF.
