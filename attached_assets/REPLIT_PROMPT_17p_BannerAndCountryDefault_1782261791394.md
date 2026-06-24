# REPLIT PROMPT 17p — Fix "Filled in" banner language + country default

## Branch: stage-6 | File: DashboardPage.tsx

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## FIX 1 — Country should default to "Select..." not "England & NI"

When the scraper returns no country (e.g. "Pearse Close, Penarth" — no postcode in address), the Country / Tax Region dropdown currently defaults to "England & NI". It should show "Select..." instead — forcing the user to pick, rather than silently assuming England.

Read `DashboardPage.tsx`. Find `handleScrapeUrl` (or wherever the scrape result populates `ndData`).

Find where `country` is set from the scrape result. Look for something like:
```tsx
country: d.country || 'England'   // or similar default
```

Change it so that if the scraper didn't return a country, country is left as `''` (empty string), which will show the "Select..." placeholder in the dropdown:
```tsx
country: d.country || ''
```

Also check the `ndData` initial state — if `country` is initialised to `'England'` or `'England & NI'`, change it to `''`.

---

## FIX 2 — Rewrite the "Filled in:" banner to be consistent and clear

Read `DashboardPage.tsx`. Find where the "Filled in: address, price, beds, 2 bath, property type, tenure" string is constructed after a successful scrape.

The current format is inconsistent — it mixes field names ("address", "price", "tenure") with counts ("2 bath", "beds"). Replace the entire banner construction with a consistent format that shows **actual values** for the key fields, using a middle dot separator:

**New format:** `Auto-filled: [fields as values]`

Build the list from whichever fields were actually returned by the scraper:

```tsx
const filledParts: string[] = []
if (d.address)       filledParts.push('Address')
if (d.price)         filledParts.push(`£${d.price.toLocaleString()}`)
if (d.propertyType)  filledParts.push(d.propertyType)
if (d.beds)          filledParts.push(`${d.beds} bed`)
if (d.bathrooms)     filledParts.push(`${d.bathrooms} bath`)
if (d.tenure)        filledParts.push(d.tenure)
if (d.country)       filledParts.push(d.country)
if (d.epcRating)     filledParts.push(`EPC ${d.epcRating}`)

const filledText = filledParts.length > 0
  ? `Auto-filled: ${filledParts.join(' · ')}`
  : 'Details filled in'
```

Examples of what this produces:
- `Auto-filled: Address · £350,000 · Town house · 3 bed · 2 bath · Freehold`
- `Auto-filled: Address · £160,000 · Semi-detached house · 2 bed · 1 bath · Freehold · Wales`
- `Auto-filled: Address · £189,950 · Semi-detached house · 3 bed · 2 bath · Freehold · Wales · EPC D`

The label changes from "Filled in:" to "Auto-filled:" for consistency with the "Auto-fill from listing" header above.

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test with `https://www.rightmove.co.uk/properties/172694219` (Penarth — no postcode in address):
   - Country / Tax Region should show "Select..." not "England & NI"
   - Banner should show: `Auto-filled: Address · £350,000 · Town house · 3 bed · 2 bath · Freehold`
3. Test with `https://www.rightmove.co.uk/properties/174298085` (Wilson Road, CF5 — postcode in address):
   - Country should show "Wales" (from postcode prefix detection)
   - Banner should show: `Auto-filled: Address · £189,950 · Semi-detached house · 3 bed · 2 bath · Freehold · Wales`
4. Commit:
```
git add -A && git commit -m "fix: Prompt 17p — country defaults to Select, auto-filled banner format" && git push origin stage-6
```

## REPORT BACK

1. Does Penarth listing now show "Select..." for country?
2. Does Wilson Road listing still show "Wales" for country?
3. What does the banner text look like for each?
