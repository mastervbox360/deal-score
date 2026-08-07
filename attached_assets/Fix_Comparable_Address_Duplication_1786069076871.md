REPLIT PROMPT — Fix: duplicated postcode in Comparable Sales rows
Branch: production-candidate

CONTEXT: A generated PDF shows a Comparable Sales row rendering as
"62 Horwood Cl, Cardiff CF24 2LW CF24 2LW" — the postcode appears twice.
The render logic itself (DealScorePDF.tsx, ~line 2609, and the matching
line in the Let comparables table further down, and the same pattern in
DealScorePDFProPlus.tsx) is:

  {row.address}{row.postcode ? `, ${row.postcode}` : ''}

This is correct IF `row.address` never contains the postcode. The bug is
that in this case it does — the user typed (or something populated) the
full address including postcode into the address field, and the postcode
field was also filled separately, so concatenation duplicates it.

---

STEP 1 — Confirm the actual data, don't guess

Find where comparable rows are added/edited in Home.tsx (search for
`setComparables` — there's a blank-row initializer around line 3203
using an "Add Row" button, and a postcode input handler around line
3110). Check whether there's any existing validation or auto-split logic
on the address field for comparables. There likely isn't — confirm this
before writing a fix.

---

STEP 2 — Fix the display, don't change how the fields are entered

The correct fix is defensive de-duplication at render time, not a data
migration or a change to how the address input works (users should still
be free to type addresses however they want). In both DealScorePDF.tsx
and DealScorePDFProPlus.tsx, wherever this pattern appears:

  {row.address}{row.postcode ? `, ${row.postcode}` : ''}

Replace with a small helper that only appends the postcode if the
address doesn't already end with it (case-insensitive, trimmed):

  function formatCompAddress(address: string, postcode: string): string {
    if (!postcode) return address;
    const trimmedAddr = address.trim();
    const trimmedPc = postcode.trim();
    if (trimmedAddr.toLowerCase().endsWith(trimmedPc.toLowerCase())) {
      return trimmedAddr;
    }
    return `${trimmedAddr}, ${trimmedPc}`;
  }

Add this near the other comparable-formatting helpers in each file (or
in one file and export it if the other already imports similar helpers
from it — follow whatever pattern computeCoverKeyMetric/
splitAddressThreeLines already established). Replace every occurrence of
the old inline concatenation (sale comps AND let comps, both files) with
`formatCompAddress(row.address, row.postcode)`.

---

STEP 3 — Do NOT touch the missing beds/floor area/price/date

Leave the `—` fallback behavior for bedrooms/floorArea/price/date
exactly as it is — showing a dash for genuinely empty fields is correct,
expected behavior for an incomplete manually-entered comparable, not a
bug. Confirm in your report whether this specific row was added via the
blank "Add Row" flow (in which case empty fields are expected) rather
than changing anything here.

---

VERIFICATION

1. npx tsc --noEmit — zero errors.
2. git status — confirm only the expected files changed.
3. Generate a PDF with a comparable row where the address field already
   includes the postcode (reproduce the exact bug) and confirm it now
   displays without duplication.
4. Also test a comparable row where the address does NOT include the
   postcode, and confirm the postcode still gets appended correctly (no
   regression on the normal case).
5. Do NOT push. Report back tsc result, git status, and the exact
   before/after text for both test cases.
