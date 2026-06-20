# REPLIT PROMPT 15d — Inputs Page Visual Parity
**File:** `artifacts/dealscore/src/components/AnalysisHub.tsx`  
**Branch:** stage-6  
**Depends on:** Prompt 15c complete and committed.

---

## What this prompt fixes

The inputs page lacks visual contrast compared to the confirmed mockup (`ds_analysis_hub.html`). The mockup has:
- Dark, bold field labels
- Clearly visible input borders
- Solid navy active state on segmented controls
- Distinct, readable field values

The Replit build has washed-out labels (light grey), near-invisible borders, and a light-grey active toggle. This prompt brings the inputs page into full visual parity with the mockup.

**Do not change any functionality, layout, section order, or component structure. Only change visual CSS properties.**

---

## Read the file first

Read `artifacts/dealscore/src/components/AnalysisHub.tsx` in full before making any changes.

---

## Part A — IField component: label and input styling

Find the `IField` sub-component inside `AnalysisHub.tsx`. Apply these CSS changes:

### 1. Label color — darken from grey to near-black

Find the label element inside `IField`. Change its color from `var(--text-2)` (or `#6c757d` or any grey value) to:

```tsx
color: 'var(--text-1, #1a1a2e)'
```

The label should also be:
```tsx
fontWeight: 600,
fontSize: 11,
```

### 2. Input border — strengthen from faint to clearly visible

Find the `<input>` element inside `IField`. Change its border from `.5px solid var(--ds-border)` (or any faint border) to:

```tsx
border: '1px solid #d1d5db'
```

When the input is focused (`:focus` style or `onFocus`/`onBlur` state), the border should deepen to:
```tsx
border: '1px solid var(--navy, #1B3A6B)'
```

### 3. Input text color — ensure dark filled values

The `<input>` element should have:
```tsx
color: 'var(--text-1, #1a1a2e)',
fontSize: 13,
```

### 4. Placeholder text — clearly lighter than filled text

```tsx
// CSS or inline style
// placeholder color: #9ca3af
```

If using inline styles, add `onFocus`/`onBlur` border state management or simply use a CSS class. Either approach is fine as long as the focus border deepens to navy.

---

## Part B — ISelect and ISelectOther components: same treatment

Find the `ISelect` and `ISelectOther` sub-components. Apply identical label and border changes:

- Label: `color: 'var(--text-1, #1a1a2e)'`, `fontWeight: 600`, `fontSize: 11`
- `<select>` element border: `'1px solid #d1d5db'`
- `<select>` text color: `'var(--text-1, #1a1a2e)'`
- Focus border: `'1px solid var(--navy, #1B3A6B)'`

For `<select>` elements, the background when unfocused should be `#fff`.

---

## Part C — Seg2 (segmented control) active state: navy not grey

Find the `Seg2` sub-component (the binary segmented control used for Freehold/Leasehold, IO/Repayment, etc.).

The **active/selected button** must use:
```tsx
// Active button:
background: 'var(--navy, #1B3A6B)',
color: '#fff',
fontWeight: 600,
boxShadow: 'none',
```

The **inactive button** must use:
```tsx
// Inactive button:
background: 'transparent',
color: 'var(--text-2, #6c757d)',
fontWeight: 500,
```

The **container track** (the grey pill background behind both buttons):
```tsx
background: '#f3f4f6',
borderRadius: 8,
padding: 2,
```

If there is currently a lighter active style (e.g. white background with shadow, or a light grey), replace it entirely with the navy active state above.

---

## Part D — Section card (Sec component) border: slightly stronger

Find the `Sec` sub-component (the section card wrapper with the grey header band).

The outer card border should be:
```tsx
border: '1px solid #d1d5db'
```

(Currently likely `.5px solid var(--ds-border)` which is too faint.)

The box shadow can stay subtle:
```tsx
boxShadow: '0 1px 3px rgba(0,0,0,.06)'
```

---

## Part E — Required field asterisk: visible red

Find where the required (`req`) asterisk renders in `IField` labels (or equivalent). It should be clearly visible:
```tsx
color: '#ef4444',  // red
fontWeight: 700,
marginLeft: 2,
```

---

## Part F — Checklist before committing

- [ ] `npx tsc --noEmit` → zero errors
- [ ] IField labels are dark (`#1a1a2e`), not grey
- [ ] Input field borders are clearly visible (1px `#d1d5db`)
- [ ] Input focus border turns navy
- [ ] Filled input text is dark and readable
- [ ] Seg2 active button is solid navy with white text (not light grey)
- [ ] Seg2 inactive button is transparent with grey text
- [ ] ISelect / ISelectOther labels and borders match IField treatment
- [ ] Section card borders are clearly defined (1px `#d1d5db`)
- [ ] Required asterisk is red and visible
- [ ] No layout, section order, or functionality changes — CSS only

When all checklist items pass:

```bash
git add -A && git commit -m "Stage 10 — Prompt 15d: Inputs visual parity — darker labels, stronger borders, navy toggle" && git push origin stage-6
```
