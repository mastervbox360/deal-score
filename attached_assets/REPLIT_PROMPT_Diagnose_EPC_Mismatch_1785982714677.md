# Replit Agent Prompt — Diagnose: Correct EPC Certificate Not Being Matched for a Known Address

**Branch: confirm you are on `production-candidate`. This is a diagnostic-only prompt — do not write any fix until Step 1's findings are reported and reviewed.**

## The problem

We have a known-correct reference point: the official gov.uk certificate lookup (`find-energy-certificate.service.gov.uk`) confirms **65A Horwood Close, Cardiff, CF24 2LW** has a real, valid EPC certificate:
- Certificate number: `0330-2991-1060-2909-5661`
- Rating: **C**
- Property type: **End-terrace house**
- Total floor area: **71 square metres**
- Valid until: 9 June 2031

But the app, searching this same postcode (`CF24 2LW`, correctly spaced) and house number (`65a`), is returning a **different** result — rating B, 55 m², built 1983–1990 — which does not match the real certificate at all. The postcode was previously confirmed wrong in an earlier test (a typo of `CF24 2LY`), but this test used the correct postcode and still got a wrong answer, so this is a genuine remaining bug in the search or matching logic, not test data.

## What to do — diagnose only, in this order

1. Call the search endpoint directly for this postcode: `GET /api/domestic/search?postcode=CF24+2LW` (using the confirmed working auth), and log the **full raw array of results** — every `certificateNumber`, `addressLine1`, `addressLine2`, and `currentEnergyEfficiencyBand` returned.
2. **Check specifically whether `certificateNumber: 0330-2991-1060-2909-5661` appears anywhere in that results array.**
   - **If it IS present**: the search is working correctly, and the bug is in the matching logic — report exactly what `addressLine1`/`addressLine2` this specific result has, so we can see why the `addressMatches`/`parseHouseNum` logic (from the last two fixes) isn't selecting it. Also report which *other* result the matching logic actually did select, and what its address fields look like, so we can see what wrongly matched instead.
   - **If it is NOT present**: the problem is upstream of matching entirely — check how many total results the search returned for this postcode (is it being cut off by the current page size limit? the earlier fix mentioned raising this to 50 — confirm the actual current limit in the code, and confirm the total result count for this specific postcode isn't exceeding it). Also check whether the search response includes any pagination metadata (`totalRecords`, `totalPages` — these were shown in the search endpoint's documented response shape) indicating there are more results than what's being fetched.
3. Directly fetch the known-correct certificate to confirm the API can return it at all: `GET /api/certificate?certificate_number=0330-2991-1060-2909-5661`. Confirm this succeeds and log its `dwelling_type`/`total_floor_area`/`current_energy_efficiency_band` fields, to confirm this certificate genuinely exists and is retrievable from the API (not just from the public gov.uk lookup site, which may source from a slightly different dataset).

## Do not fix anything yet

Report back what you find at each of the three steps above — specifically whether the correct certificate is present in the search results and being wrongly passed over by matching, or absent from search results entirely (a different, more fundamental problem). These are two very different bugs requiring different fixes, and I want to see the real evidence before deciding which one we're dealing with.
