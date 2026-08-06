# Replit Agent Prompt 2 of 2 — Floor Plan Upload & Book a Viewing / Enquiries Page

**Branch: confirm you are on `production-candidate`, and confirm Prompt 1 (identity fields — WhatsApp, PRS, ICO, Company Number) has already landed before starting this, since the contact page depends on those fields existing.**

## Part 1 — Floor plan upload

Read the existing Property Photos upload implementation in `Home.tsx` in full before building this — reuse the same upload/storage pattern (file input, preview, remove button), don't build a second, different mechanism.

1. Add a new state field for a single floor plan image (unlike Property Photos, which supports multiple — a floor plan is typically one image). Follow the same base64/storage approach already used for photos.
2. Add a "Floor Plan" upload section in the Inputs form — a single image upload with a preview and a remove/replace option, positioned near Property Photos (same accordion, or its own small section directly after — use your judgement on the cleanest placement given the existing Property Photos section's structure).
3. Pass the floor plan data into `pdfProps`.

## Part 2 — Floor Plan page in the PDF

In both `DealScorePDF.tsx` and `DealScorePDFProPlus.tsx`:

1. Add a new "Floorplan" page/section (a sensible position is directly after the Property Photos section, since they're both visual property content).
2. If a floor plan image was uploaded, display it full-page or appropriately sized, consistent with how Property Photos are displayed.
3. If none was uploaded, show a graceful empty-state message — check how the existing "no comparables supplied" / "no certificate found" empty-state pattern is styled elsewhere in these files and match it, e.g. "Floorplan not yet supplied for this deal."
4. This section should not gate on any toggle — floor plans, when present, are core pack content (per the due-diligence research confirming floor plans as standard), not appendix material like the Glossary/Formulas.

## Part 3 — Book a Viewing / Enquiries page

Add a new final content page (before the Legal & Disclosure page, or after it — check which reads better given the existing page flow, but likely makes sense right before Legal & Disclosure as a natural closing "how to proceed" page) in both PDF components:

1. Heading: "Book a Viewing / Enquiries" (or similar).
2. Display, conditionally (only show fields that have actual values — omit blank ones gracefully, following the established pattern used throughout this PDF for optional fields): Company/Trading Name, Contact Name, Email, Phone, WhatsApp Number.
3. If email and/or phone/WhatsApp are present, style them as clear contact points — doesn't need interactive buttons (this is a static PDF, not a web page), just clearly presented contact information a reader can act on.
4. If none of the contact fields have been filled in at all, omit this page entirely rather than showing an empty page with just a heading.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Test: upload a floor plan, generate a PDF, confirm it displays correctly. Remove it, confirm the graceful empty-state text shows instead.
4. Test: fill in the contact/identity fields from Prompt 1, generate a PDF, confirm the Book a Viewing page shows all filled fields and omits any left blank.
5. Test: leave all contact fields blank, confirm the Book a Viewing page is omitted entirely from the generated PDF.
6. Do not push automatically — report back what changed, the `tsc` result, and screenshots of the Floorplan page (both with and without an uploaded image) and the Book a Viewing page, and I'll verify before you push to `production-candidate`.
