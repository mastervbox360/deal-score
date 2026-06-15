# REPLIT PROMPT C — Additional Scraped Fields (Lease, Service Charge, Ground Rent, Council Tax)

You are working on the DealScore app on branch `stage-6`.

**Standing rule:** Only add the minimal code needed. Do NOT touch existing Supabase calls, auth, deal state, navigation, or routing.

---

## TASK 1: Update `supabase/functions/scrape-property/index.ts`

### 1a. Add to the `PropertyData` interface:

```typescript
leaseYears?: number       // years remaining on lease
serviceCharge?: number    // annual service charge £
groundRent?: number       // annual ground rent £
councilTaxBand?: string   // 'A'–'H'
```

### 1b. Add this helper function (alongside the other normalise helpers at the bottom of the file):

```typescript
function extractLeasehold(text: string): {
  leaseYears?: number
  serviceCharge?: number
  groundRent?: number
  councilTaxBand?: string
} {
  const result: { leaseYears?: number; serviceCharge?: number; groundRent?: number; councilTaxBand?: string } = {}

  // Lease length: "123 years remaining", "LEASEHOLD (123 years)", "123 year lease"
  const leaseM = text.match(/(\d{2,4})\s+years?\s+(?:remaining|left|unexpired)/i)
    || text.match(/leasehold\s*\(?(\d{2,4})\s+years?\)?/i)
    || text.match(/(\d{2,4})\s+year\s+(?:lease|leasehold)/i)
  if (leaseM) result.leaseYears = parseInt(leaseM[1])

  // Service charge — per annum or per month (convert monthly → annual)
  const scAnnual = text.match(/service\s+charge[:\s£]+([\d,]+)\s*(?:per\s+(?:annum|year)|p\.?a\.?)\b/i)
  const scMonthly = text.match(/service\s+charge[:\s£]+([\d,]+)\s*(?:per\s+month|p\.?c\.?m\.?|p\.?m\.?)\b/i)
  if (scAnnual) result.serviceCharge = parseInt(scAnnual[1].replace(/,/g, ''))
  else if (scMonthly) result.serviceCharge = parseInt(scMonthly[1].replace(/,/g, '')) * 12

  // Ground rent
  const grM = text.match(/ground\s+rent[:\s£]+([\d,]+)/i)
  if (grM) result.groundRent = parseInt(grM[1].replace(/,/g, ''))

  // Council tax band A–H
  const ctM = text.match(/council\s+tax\s+(?:band\s*)?:?\s*([A-H])\b/i)
  if (ctM) result.councilTaxBand = ctM[1].toUpperCase()

  return result
}
```

### 1c. Use `extractLeasehold` in each parser:

**In `parseRightmove`:**

In the `__NEXT_DATA__` path, after extracting images, add:
```typescript
// Leasehold details from key features + description
const rmText = [
  ...(Array.isArray(prop.keyFeatures) ? prop.keyFeatures.map((f: unknown) => typeof f === 'string' ? f : (f as Record<string,string>)?.content ?? '') : []),
  stripHtml(prop.text?.description || ''),
].join(' ')
const rmLh = extractLeasehold(rmText)
if (rmLh.leaseYears) data.leaseYears = rmLh.leaseYears
if (rmLh.serviceCharge) data.serviceCharge = rmLh.serviceCharge
if (rmLh.groundRent) data.groundRent = rmLh.groundRent
if (rmLh.councilTaxBand) data.councilTaxBand = rmLh.councilTaxBand
```

In the HTML fallback path, just before `return data`, add:
```typescript
// Leasehold details from full page text
const htmlText = stripHtml(html).substring(0, 8000)
const htmlLh = extractLeasehold(htmlText)
if (htmlLh.leaseYears && !data.leaseYears) data.leaseYears = htmlLh.leaseYears
if (htmlLh.serviceCharge && !data.serviceCharge) data.serviceCharge = htmlLh.serviceCharge
if (htmlLh.groundRent && !data.groundRent) data.groundRent = htmlLh.groundRent
if (htmlLh.councilTaxBand && !data.councilTaxBand) data.councilTaxBand = htmlLh.councilTaxBand
```

**In `parseZoopla`**, after the existing `zFa` floor area block, add:
```typescript
const zText = [
  ...(Array.isArray(listing.keyFeatures) ? listing.keyFeatures.map((f: unknown) => typeof f === 'string' ? f : '') : []),
  stripHtml(listing.description || listing.shortDescription || ''),
].join(' ')
const zLh = extractLeasehold(zText)
if (zLh.leaseYears) data.leaseYears = zLh.leaseYears
if (zLh.serviceCharge) data.serviceCharge = zLh.serviceCharge
if (zLh.groundRent) data.groundRent = zLh.groundRent
if (zLh.councilTaxBand) data.councilTaxBand = zLh.councilTaxBand
```

**In `parseOTM`**, after the existing `otmFa` block, add:
```typescript
const otmText = stripHtml(listing.description || '').substring(0, 8000)
const otmLh = extractLeasehold(otmText)
if (otmLh.leaseYears) data.leaseYears = otmLh.leaseYears
if (otmLh.serviceCharge) data.serviceCharge = otmLh.serviceCharge
if (otmLh.groundRent) data.groundRent = otmLh.groundRent
if (otmLh.councilTaxBand) data.councilTaxBand = otmLh.councilTaxBand
```

---

## TASK 2: Update `artifacts/dealscore/src/components/DashboardPage.tsx`

### 2a. Extend `scrapeExtra` state type:

Find the existing `scrapeExtra` state declaration and add the new fields:
```typescript
const [scrapeExtra, setScrapeExtra] = useState<{
  tenure?: string
  epcRating?: string
  floorAreaSqm?: number
  images?: string[]
  leaseYears?: number
  serviceCharge?: number
  groundRent?: number
  councilTaxBand?: string
}>({})
```

### 2b. In `handleScrapeUrl`, extend the `extra` object after the existing fields:

```typescript
if (d.leaseYears) extra.leaseYears = d.leaseYears
if (d.serviceCharge) extra.serviceCharge = d.serviceCharge
if (d.groundRent) extra.groundRent = d.groundRent
if (d.councilTaxBand) extra.councilTaxBand = d.councilTaxBand
```

### 2c. Add to the `populated` array in `handleScrapeUrl`:

```typescript
d.leaseYears && `${d.leaseYears}yr lease`,
d.serviceCharge && `SC £${d.serviceCharge.toLocaleString('en-GB')}pa`,
d.groundRent && `GR £${d.groundRent.toLocaleString('en-GB')}pa`,
d.councilTaxBand && `CT band ${d.councilTaxBand}`,
```

The `scrapeExtra` spread into the deal creation `inputs` call already exists — no change needed there.

---

After all changes run `npx tsc --noEmit`. Zero errors before committing. Tell me:
1. What was changed in each file
2. Which leasehold fields you added to the interface and handler
