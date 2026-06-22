# REPLIT PROMPT 17e — Append Postcode to Scraped Address

## Branch: stage-6 | File: DashboardPage.tsx (or wherever handleScrapeUrl lives)

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## PROBLEM

When a Rightmove URL is scraped, `d.postcode` is returned separately (e.g. `"CF24 2LW"`) but is NOT appended to the address field. The user sees `"Elm Street, Cardiff"` instead of `"Elm Street, Cardiff, CF24 2LW"`.

The postcode is already formatted with a space by the edge function (`outcode + ' ' + incode`). It just needs appending to the address before it's set in `ndData`.

---

## FIX — One change in `handleScrapeUrl`

Find this block in `handleScrapeUrl`:

```tsx
if (d.address) setNdData(nd => ({ ...nd, address: d.address }))
```

Replace with:

```tsx
if (d.address) {
  // Append postcode to address if available and not already present
  const fullAddress = (d.postcode && !d.address.includes(d.postcode.split(' ')[0]))
    ? `${d.address}, ${d.postcode}`
    : d.address
  setNdData(nd => ({ ...nd, address: fullAddress }))
}
```

The postcode split check (`d.postcode.split(' ')[0]`) uses just the outcode (e.g. `"CF24"`) to test whether it's already in the address — avoids doubling up if Rightmove ever includes the postcode in their displayAddress.

---

## ALSO — Ensure the address saved to deal.inputs includes the postcode

Find the deal creation call. Where `ndData.address` is written into `deal.inputs`, it will now automatically include the postcode since `ndData.address` is set to `fullAddress` above. No additional change needed there.

However, check that `scrapeExtra` does NOT separately set an address field that would overwrite this. If `scrapeExtra` includes `address`, remove it — the full address (with postcode) should come from `ndData.address`.

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test: paste `https://www.rightmove.co.uk/properties/89477043`
   - Address field should show: `"Elm Street, Cardiff, CF24 [incode]"` or `"Elm Street, Cardiff, CF24"` if only outcode is available
   - Format must have a space in the postcode: `CF24 2LW` not `CF242LW`
3. Commit:
```
git add -A && git commit -m "fix: Prompt 17e — append postcode to scraped address" && git push origin stage-6
```

## REPORT BACK

1. What did `d.postcode` contain for this listing — full postcode (`CF24 2LW`) or outcode only (`CF24`)?
2. Does the address field now show the postcode appended correctly?
