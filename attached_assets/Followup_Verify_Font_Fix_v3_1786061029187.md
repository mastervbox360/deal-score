Good root-cause work finding the fvar/gvar/STAT issue and the LangSys
index-21 bug. Two things to do now:

1. DMSans-Regular.ttf and DMSans-Bold.ttf at src/fonts/ have been
   replaced again (56KB each, down from the 66KB FontForge versions
   currently in git HEAD). These are properly instanced from the
   original variable fonts using fonttools' instancer (Regular at
   wght=400, Bold at wght=700, both opsz=14 — matching the font's own
   named instances), with STAT dropped and liga stripped — the same
   clean method that already fixed the italic. No fvar/gvar/avar/HVAR/
   MVAR/STAT tables remain, and Bold's OS/2.usWeightClass is correctly
   700 vs Regular's 400 this time (they were previously identical
   weight, which was a separate bug worth having fixed).

   Do NOT touch DMSans-Italic.ttf — leave it exactly as you already
   fixed it, that one's confirmed working.

2. Re-run the full verification with all three current files:
   - Generate a PDF from both DealScorePDF.tsx and DealScorePDFProPlus.tsx
   - Confirm no crash across all three weights
   - Extract text with pdftotext, confirm "Profit"/"Confidential"/
     "financial" all intact
   - Confirm Bold text is visibly bolder than Regular this time (open
     the PDF and eyeball it, or compare glyph widths programmatically)
   - You still can't view the PDF directly, so for the italic slant
     specifically: just confirm generation succeeds without error one
     more time with the swapped Regular/Bold in place, and I'll ask
     Videet to do the one visual look (italic angle is already confirmed
     -10° at the font metadata level on my end, so it should be fine —
     just needs an actual human eyeball since neither of us can render
     images).

Report back: crash/no-crash for all three weights together, the
extracted text, tsc result, and git status.

Do NOT push yet.
