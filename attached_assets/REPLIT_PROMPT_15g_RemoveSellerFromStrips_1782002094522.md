# REPLIT PROMPT 15g — Remove Seller Element from Results/Sensitivity/Workings Strips
**File:** `artifacts/dealscore/src/components/DealChrome.tsx`  
**Branch:** stage-6  
**Depends on:** Prompt 15f complete and committed.

---

## What this prompt fixes

In Prompt 15f, a context-aware seller element was added to the Analysis tab info strip (shows "Link seller" teal CTA when no seller is linked, or the seller name in grey when linked). This is correct behaviour on the **Inputs** sub-view — the user is building the deal and the seller is part of that context.

However, the seller element currently shows on ALL Analysis sub-views: Inputs, Results, Sensitivity, and Workings. On Results, Sensitivity, and Workings it is redundant noise — the user is reviewing numbers, not managing deal setup. The Seller tab handles all seller management.

**Goal:** The seller element should only appear when the active Analysis sub-view is **Inputs**. Results, Sensitivity, and Workings strips should not show it.

---

## Read the file first

Read `artifacts/dealscore/src/components/DealChrome.tsx` in full before making any changes.

Also read `artifacts/dealscore/src/components/AnalysisHub.tsx` to understand how the active sub-view state is managed and how it could be surfaced to DealChrome.

---

## Implementation

The active Analysis sub-view (`'inputs' | 'results' | 'sensitivity' | 'workings'`) is managed inside `AnalysisHub.tsx`. `DealChrome.tsx` wraps the deal and doesn't currently know which sub-view is active.

**Choose the simplest approach that requires the fewest new props/state:**

### Option A — Prop drilling (preferred if clean)
1. In `AnalysisHub.tsx`, expose the active sub-view via a callback or prop passed up to `DealPage.tsx`
2. `DealPage.tsx` passes it down to `DealChrome.tsx` as an optional prop (e.g. `analysisSubView?: string`)
3. In `DealChrome.tsx`, wrap the seller element in a conditional:
   ```tsx
   {activeTab === 'analysis' && analysisSubView === 'inputs' && (
     /* seller element JSX */
   )}
   ```

### Option B — Local URL param read (simplest, no prop changes)
The active sub-view may already be tracked in the URL (e.g. `?view=inputs`). If so, read it directly in `DealChrome.tsx` using `useSearchParams()` or `new URLSearchParams(window.location.search)`:
```tsx
const searchParams = new URLSearchParams(window.location.search)
const subView = searchParams.get('view') ?? 'inputs'

{activeTab === 'analysis' && subView === 'inputs' && (
  /* seller element JSX */
)}
```

Check which approach already exists in the codebase and use it. Do not introduce a new pattern if an existing one handles this.

---

## Expected result after this change

### Analysis → Inputs strip:
`[Seller element] · Optimise · Notes · View results`

### Analysis → Results strip:
`Optimise · Notes · Export results`

### Analysis → Sensitivity strip:
`Notes · Export`

### Analysis → Workings strip:
`Notes · Export workings`

No other tab strips should change.

---

## Checklist before committing

- [ ] `npx tsc --noEmit` → zero errors
- [ ] Seller element (Link seller / seller name) only visible when Analysis sub-view is Inputs
- [ ] Seller element does NOT appear on Results, Sensitivity, or Workings strips
- [ ] Results strip: Optimise · Notes · Export results (unchanged except seller removed)
- [ ] Sensitivity strip: Notes · Export (unchanged except seller removed)
- [ ] Workings strip: Notes · Export workings (unchanged except seller removed)
- [ ] All other tab strips (Overview, Content, Seller, Investors, Fees) unchanged
- [ ] Switching between sub-views correctly shows/hides the seller element

When all checklist items pass:

```bash
git add -A && git commit -m "Stage 10 — Prompt 15g: Seller CTA in Inputs strip only — removed from Results/Sensitivity/Workings" && git push origin stage-6
```
