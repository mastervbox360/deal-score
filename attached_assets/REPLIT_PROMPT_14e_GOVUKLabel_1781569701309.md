# REPLIT PROMPT 14e — GOV.UK Badge → Inline Label Text

## What this does
Removes the dark GOV.UK pill badges from the EPC Rating and Flood Risk fields and replaces them with small inline "gov.uk" text directly after the field label. One-line visual change per label.

**Dependency:** Prompt 14d merged and passing tsc.

## Standing rules
- Read the file in full before touching it
- npx tsc --noEmit must pass with zero errors before finishing
- Commit: `git add -A && git commit -m "Stage 10 — Prompt 14e: GOV.UK badge → inline label text" && git push origin stage-6`

---

## THE CHANGE

Find the EPC Rating and Flood Risk group labels in `AnalysisHub.tsx`. They currently render like this pattern:

```tsx
{/* Group label */}
<div style={{ ...groupLabelStyle }}>EPC RATING</div>
{/* GOV.UK badge pill next to the select */}
<a href="..." target="_blank" style={{ background: '#555', color: '#fff', ... }}>GOV.UK</a>
```

Replace so the label row itself contains the `gov.uk` link — no separate pill:

```tsx
<div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
  EPC RATING
  <a
    href="https://www.gov.uk/find-energy-certificate"
    target="_blank"
    rel="noreferrer"
    style={{ fontSize: 10, fontWeight: 400, color: '#aaa', textTransform: 'lowercase', letterSpacing: 0, textDecoration: 'none' }}
  >
    · gov.uk ↗
  </a>
</div>
```

Apply the same treatment to **FLOOD RISK**:

```tsx
<div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#999', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
  FLOOD RISK
  <a
    href="https://check-long-term-flood-risk.service.gov.uk/postcode"
    target="_blank"
    rel="noreferrer"
    style={{ fontSize: 10, fontWeight: 400, color: '#aaa', textTransform: 'lowercase', letterSpacing: 0, textDecoration: 'none' }}>
    · gov.uk ↗
  </a>
</div>
```

**Delete** the standalone GOV.UK pill/badge elements that are currently rendered near the dropdowns.

The result: label reads `EPC RATING · gov.uk ↗` in a single line — uppercase bold for the label, lowercase muted for the link. No dark pill.

---

## After completing
1. `npx tsc --noEmit` — zero errors
2. Commit and push
3. Screenshot of the EPC / Flood Risk fields so I can verify
