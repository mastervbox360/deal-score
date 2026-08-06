# Replit Agent Prompt — Comparable Address Autocomplete + Accurate Geometry + EPC Auto-Fill

**Branch: confirm you are on `production-candidate`, and confirm all prior comparables work (data model, geocoding, visible distance, exact house-number matching) is already in place.**

This brings comparable rows up to parity with the subject property's address handling, now that the EPC flow is confirmed working correctly end-to-end.

Read the subject property's address autocomplete implementation in `Home.tsx` in full (`fetchAddressSuggestions`, `selectSuggestion`, and the `AutocompleteService`/`PlacesService` calls) before writing anything for comparables — reuse the same pattern, don't rebuild it differently.

## Part 1 — Address autocomplete on comparable rows

1. Add the same Places autocomplete dropdown behaviour to each comparable row's Address field — reuse `fetchAddressSuggestions`-style logic (debounced, `componentRestrictions: { country: 'gb' }`) rather than writing a second implementation.
2. On selecting a suggestion for a comparable row, call `PlacesService.getDetails` requesting fields: `formatted_address`, `address_components`, **and `geometry`** (the subject property's current call only requests the first two — add `geometry` here for comparables, and separately for the subject property too, see Part 2).
3. From the result, extract and auto-fill on that comparable row: the cleaned formatted address, the postcode (from `address_components`, same extraction pattern already used for the subject property), and `lat`/`lng` directly from `result.geometry.location.lat()` / `.lng()`.
4. Since we now have accurate rooftop-level coordinates directly from Places, **skip the `postcodes.io` geocoding step entirely for rows filled via the autocomplete dropdown** — only fall back to the existing `postcodes.io` blur-based geocoding (already built) for rows where the postcode was typed manually instead of selected from the dropdown. Use whichever `lat`/`lng` source is available; Places-derived coordinates are more accurate when present.

## Part 2 — Upgrade subject property geocoding accuracy too, for consistency

1. Add `geometry` to the subject property's existing `getDetails` fields call (`selectSuggestion`, currently requests `['formatted_address', 'address_components']`).
2. Store `result.geometry.location.lat()`/`.lng()` as the subject's `lat`/`lng`, preferring this over the existing `postcodes.io`-derived coordinates from the flood-risk lookup (which remains as a fallback if geometry isn't returned for some reason).
3. This makes all distance calculations (subject-to-comparable) consistently building-level accurate rather than mixing postcode-centroid and rooftop-level sources depending on how each address was entered.

## Part 3 — EPC-based auto-fill for comparable Floor Area and Property Type

Now that the EPC lookup flow (two-step search + certificate fetch, with exact house-number matching) is confirmed correct:

1. Once a comparable row has a postcode and address (from either autocomplete or manual entry), call the same EPC lookup function already used for the subject property, passing this comparable's postcode and address.
2. If a confident match is found (`matchStatus: 'matched'`), auto-fill that comparable row's **Floor Area** (from `total_floor_area`) and **Property Type** (mapped from `dwelling_type`, reusing the existing mapping table) — but only if those fields are currently empty; never overwrite a value the sourcer has already manually entered.
3. If the match status is `no_match` or `no_certificate`, leave those fields empty for manual entry — don't show any error, this is a normal, expected outcome for many comparables.
4. Be mindful of API call volume — comparable rows can be added one at a time, so trigger this lookup on postcode blur (same debounce pattern as the existing geocoding), not on every keystroke.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Test on the deploy preview (remember: Netlify Functions don't run in the Replit dev preview, so EPC/certificate testing needs the real deployed branch URL): add a comparable row, type a partial address, select from the dropdown, and confirm address + postcode auto-fill, followed by Floor Area and Property Type auto-filling shortly after (if that property has a matchable EPC certificate).
4. Confirm manually-typed postcodes (no dropdown used) still work via the existing `postcodes.io` fallback path.
5. Confirm the subject property's own address autocomplete still works correctly and now also captures accurate geometry-based coordinates.
6. Do not push automatically — report back what changed, the `tsc` result, and screenshots showing a comparable row auto-filling from the dropdown, and I'll verify before you push to `production-candidate`.
