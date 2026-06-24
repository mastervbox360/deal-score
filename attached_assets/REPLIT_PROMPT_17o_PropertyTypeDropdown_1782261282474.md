# REPLIT PROMPT 17o — Add missing property types to dropdown + normaliseType mappings

## Branch: stage-6

**Standing rule:** Read before editing. `npx tsc --noEmit` zero errors before committing.

---

## CONTEXT

Rightmove uses property types that don't exist in DealScore's Property Type dropdown. When the scraper returns a value that doesn't match a dropdown option, the field silently shows "Select..." and the user gets no data. Silently mapping to a "close enough" type is worse — it corrupts data without the user knowing.

The fix is to add all missing types as proper dropdown options, and update `normaliseType` in the scraper to return the exact canonical string for each.

**Prompt 17n already sent a change adding 'Town house' — do not duplicate it. Build on top of it.**

---

## STEP 1 — Find where property type options are defined

Read `DashboardPage.tsx`. Find the Property Type `<select>` or options array in Step 2 of the New Deal slide-over. Note the exact format of the existing options (value + label).

Also search for any other places property type options are defined or used:
```bash
grep -r "Terraced house\|propertyType\|property_type\|PropertyType" src/ --include="*.tsx" --include="*.ts" -l
```

Read any files returned and check if property type options are defined elsewhere (e.g. in a constants file, analysis calculations, or display helpers).

---

## STEP 2 — Add missing options to the Property Type dropdown

The complete canonical list of property types (in display order) is:

```
Terraced house
End-of-terrace house
Semi-detached house
Detached house
Link-detached house        ← NEW
Town house                 ← already being added in 17n prompt
Bungalow (detached)
Bungalow (semi-detached)
Flat / Apartment
Studio flat
Maisonette
Penthouse                  ← NEW
Converted flat
Purpose-built flat
Cottage                    ← NEW
HMO
Block of flats
Park home                  ← NEW
Chalet                     ← NEW
Commercial / mixed use
Land
```

Add the five new options (`Link-detached house`, `Penthouse`, `Cottage`, `Park home`, `Chalet`) to every place property type options appear in the codebase. Use exactly these strings as both the value and the label.

---

## STEP 3 — Update `normaliseType` in `supabase/functions/scrape-property/index.ts`

Read the current `normaliseType` function. Replace the entire function body with this updated version that maps all Rightmove raw strings to the exact canonical values:

```typescript
function normaliseType(raw: string): string {
  if (!raw) return ''
  const t = raw.toLowerCase().trim()

  // Multi-word checks first (more specific → less specific)
  if (t.includes('end of terrace') || t.includes('end-of-terrace') || t === 'end terrace') return 'End-of-terrace house'
  if (t.includes('link') && t.includes('detached')) return 'Link-detached house'
  if (t.includes('semi')) return 'Semi-detached house'
  if (t.includes('detached')) return 'Detached house'
  if (t.includes('town house') || t.includes('townhouse')) return 'Town house'
  if (t.includes('bungalow') && (t.includes('semi') || t.includes('semi-detached'))) return 'Bungalow (semi-detached)'
  if (t.includes('bungalow') || t.includes('chalet bungalow')) return 'Bungalow (detached)'
  if (t.includes('terraced') || t.includes('terrace')) return 'Terraced house'
  if (t.includes('studio')) return 'Studio flat'
  if (t.includes('penthouse')) return 'Penthouse'
  if (t.includes('maisonette')) return 'Maisonette'
  if (t.includes('converted flat') || t.includes('converted apartment')) return 'Converted flat'
  if (t.includes('purpose-built flat') || t.includes('purpose built flat') || t.includes('purpose built apartment')) return 'Purpose-built flat'
  if (t.includes('block of flat') || t.includes('block of apartment')) return 'Block of flats'
  if (t.includes('flat') || t.includes('apartment')) return 'Flat / Apartment'
  if (t.includes('cottage')) return 'Cottage'
  if (t.includes('park home') || t.includes('mobile home') || t.includes('park home')) return 'Park home'
  if (t.includes('chalet')) return 'Chalet'
  if (t.includes('hmo') || t.includes('house in multiple')) return 'HMO'
  if (t.includes('block of flat') || t.includes('block of apartment')) return 'Block of flats'
  if (t.includes('commercial') || t.includes('mixed use') || t.includes('mixed-use')) return 'Commercial / mixed use'
  if (t === 'land' || t.includes('building plot') || t.includes('development site')) return 'Land'

  return raw.trim()
}
```

Note: `chalet bungalow` (a bungalow-style property, not a ski chalet) maps to `Bungalow (detached)`. A standalone `chalet` (without "bungalow") maps to `Chalet`.

---

## STEP 4 — Deploy updated scraper to Supabase

After editing `scrape-property/index.ts`, paste the full file into:
Supabase → Edge Functions → `scrape-property` → Code tab → Deploy updates

---

## FINAL STEPS

1. `npx tsc --noEmit` — zero errors
2. Test: open New Deal → Step 2 → Property Type dropdown → confirm all new options appear
3. Test URL fill with `https://www.rightmove.co.uk/properties/172694219` (Penarth Town House) → Property Type should now show "Town house"
4. Commit:
```
git add -A && git commit -m "feat: Prompt 17o — add Link-detached, Penthouse, Cottage, Park home, Chalet to property type dropdown" && git push origin stage-6
```

## REPORT BACK

1. Which files needed updating for the dropdown options?
2. Does the Property Type dropdown now show all 21 options?
3. Does the Penarth listing fill as "Town house"?
