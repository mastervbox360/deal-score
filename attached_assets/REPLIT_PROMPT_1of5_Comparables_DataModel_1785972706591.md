# Replit Agent Prompt 1 of 5 — Comparable Evidence: New Data Structure

**Branch: confirm you are on `production-candidate` before making any changes.**

This is the first of five prompts building out a comparable-evidence overhaul (structured fields, real proximity scoring, quality traffic light, sale/let comparable types, and PDF filtering). **This prompt only covers the data structure change** — no scoring, no geocoding, no PDF changes yet. Keep the diff scoped to exactly what's below; later prompts build on top of this.

Read `artifacts/dealscore/src/pages/Home.tsx` in full before making changes, specifically the current comparables state and every place it's read or rendered.

## What to do

Replace the current comparable state:
```typescript
const [comparables, setComparables] = useState<Array<{ address: string; bedsType: string; dateSold: string; price: string }>>([...])
```
with:
```typescript
interface ComparableRow {
  id: string; // stable id for React keys — use crypto.randomUUID() for new rows
  type: 'sale' | 'let';
  address: string;
  postcode: string;
  propertyType: string; // one of PROPERTY_TYPES, same list the subject deal uses
  bedrooms: number | '';
  floorArea: number | ''; // sqm only — no unit toggle at comparable-row level
  date: string; // "Date Sold" label for type=sale, "Date Let" label for type=let
  price: string; // "Sale Price" label for type=sale, "Monthly Rent" label for type=let
  includeInPdf: boolean | null; // null = default, true/false = manual override — not used yet, just include the field
  lat: number | null; // not populated yet — added in Prompt 2
  lng: number | null;
}

const [comparables, setComparables] = useState<ComparableRow[]>([]);
```

1. Update the "Add Row" button to create a new row with sensible defaults: `{ id: crypto.randomUUID(), type: 'sale', address: '', postcode: '', propertyType: '', bedrooms: '', floorArea: '', date: '', price: '', includeInPdf: null, lat: null, lng: null }`
2. Update the comparable table rendering to match the new fields. For this prompt, just get the UI functionally correct with the new fields present as basic inputs — a Sale/Let toggle (simple two-button pill, matching the existing Freehold/Leasehold tenure toggle pattern), a Property Type dropdown (reuse the existing `PROPERTY_TYPES` constant), a Bedrooms number input, a Postcode text input, a Floor Area (m²) number input, and the existing Address/Date/Price fields — with Date and Price labels switching based on the row's `type` ("Date Sold"/"Sale Price" vs "Date Let"/"Monthly Rent"). Don't build the traffic light, scoring, or geocoding yet — that's Prompts 2–4.
3. Update any code that reads `comparables` elsewhere (PDF props building, any place `bedsType`/`dateSold` are referenced) so nothing breaks — for now, just pass the new fields through as-is or map old field names to new ones wherever needed to keep it compiling. Full PDF rework happens in Prompt 5, so at this stage just keep existing PDF output working without errors, even if it doesn't yet show the new fields.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only intended files.
3. Manually add a comparable row, fill in all fields including the new ones, confirm no console errors and the row saves/persists correctly within the session.
4. Do not push automatically — report back what changed, the `tsc` result, and a screenshot of the updated comparable row UI, and I'll verify before you push to `production-candidate`.
