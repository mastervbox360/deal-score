REPLIT PROMPT — Prompt 1: Typography + colour foundation
Branch: production-candidate

Read artifacts/dealscore/src/components/DealScorePDF.tsx and
artifacts/dealscore/src/components/DealScorePDFProPlus.tsx IN FULL before
making any changes. Plan every edit explicitly, then execute. This is
infrastructure only — no section needs to look "finished" after this
prompt, but nothing later in the restyle depends on old Helvetica/hardcoded
colours still being present.

---

FIX 1 — Register DM Sans

Two font files are already in the project at:
  artifacts/dealscore/src/fonts/DMSans-Regular.ttf
  artifacts/dealscore/src/fonts/DMSans-Bold.ttf

Confirm both files exist at that exact path before proceeding — do not
guess or fall back to a different path if they're missing, stop and
report it instead, since react-pdf needs to embed them at build time.

At the top of BOTH DealScorePDF.tsx and DealScorePDFProPlus.tsx, add:

  import { Font } from '@react-pdf/renderer';

  Font.register({
    family: 'DM Sans',
    fonts: [
      { src: '/src/fonts/DMSans-Regular.ttf', fontWeight: 'normal' },
      { src: '/src/fonts/DMSans-Bold.ttf', fontWeight: 'bold' },
    ],
  });

(Adjust the src path only if react-pdf in this project needs an absolute
URL or a different import method — check how any other custom asset, e.g.
the logo image, is currently referenced and follow the same pattern. Do
not invent a new asset-loading approach if one already exists.)

Then, in BOTH files, replace every occurrence of:
  fontFamily: 'Helvetica'        →  fontFamily: 'DM Sans'
  fontFamily: 'Helvetica-Bold'   →  fontFamily: 'DM Sans', fontWeight: 'bold'

This applies to every style in the `base = StyleSheet.create({...})` block
and every inline `style={{ fontFamily: ... }}` in the JSX. Grep for
'Helvetica' in both files to catch every instance — do not rely on the
StyleSheet block alone, there are inline overrides too.

---

FIX 2 — Route all colour through brandColour / accentColour props

Both files already receive `props.brandColour` and `props.accentColour` —
confirm this by checking the props interface near the top of each file
(look for `brandColour: string;` and `accentColour: string;`).

Replace every hardcoded hex colour that is currently standing in for "the
brand colour" with `props.brandColour`. This specifically includes (but
grep to confirm you catch every instance, do not assume this list is
exhaustive):
  - '#1B3A6B' wherever it's used as a heading, accent, or structural colour
  - Any `DEALSCORE_BRAND.primaryColour` reference used for headings/accents
    on the pack itself (leave DEALSCORE_BRAND alone if it's used for
    DealScore's own app chrome rather than the generated investor pack —
    check the import and confirm which is which before changing it)

Replace every hardcoded colour currently standing in for "the accent
colour" with `props.accentColour`. This includes:
  - '#1D9E75' / '#2EC4B6' or any teal/green used for underlines, rules,
    or highlight accents
  - `DEALSCORE_BRAND.accentColour` at line ~1191 (the existing
    borderBottomColor rule) — this one should already be correct, confirm
    it and leave as-is if it's already dynamic

Do NOT touch colours that are semantic rather than brand-driven — e.g.
Strong/Average/Weak status colours (`#16a34a` / `#d97706` / `#dc2626`),
risk-flag amber (`#fef3c7` / `#fbbf24`), or plain body text greys
(`#333333`, `#555555`, `#666666`). Those stay hardcoded; they mean
something specific and shouldn't shift with brand colour.

---

FIX 3 — Remove the stat-box / score-circle / pill components

In the `base = StyleSheet.create({...})` block, remove these style
definitions entirely, and remove every `<View>`/`<Text>` in the JSX that
uses them:
  - heroRow, heroValue, heroLabel (and the hero-box wrapper style used
    around line ~721 — the `<View style={base.heroRow}>` block and
    whatever renders each individual stat box inside it)
  - calloutLabel, calloutValue (and its wrapping box style)
  - metCard, metCardLabel, metCardValue

Do not replace these with anything yet — just remove them and the JSX
that renders them. The next prompt (content page restyle) rebuilds this
information as label/value rows. If removing these leaves a page visibly
broken or empty in a section, leave a plain `{/* TODO: Prompt 3 rebuilds
this as label/value rows */}` comment in that spot rather than trying to
improvise a replacement now.

Also remove any tag-pill / badge component used purely for decorative
attribute chips (e.g. "Terraced" / "Freehold" / "D EPC" style pills) if
present in either file — grep for 'pill' and 'Badge' to find them.

---

VERIFICATION

1. Run `npx tsc --noEmit` — zero errors required before doing anything
   else.
2. Run `git status` — confirm only DealScorePDF.tsx, DealScorePDFProPlus.tsx,
   and the two font files under src/fonts/ show as changed (the font files
   may already be tracked if they were added in a prior step — if so,
   just confirm the .tsx changes are the only new diff).
   If anything else changed, stop and report it before proceeding.
3. Do NOT push. Report back:
   - tsc result (pass/fail, and any errors if it failed)
   - git status output
   - A list of every hardcoded colour you found and what you replaced it
     with (or left alone, and why)
   - Confirmation the two font files are present and registered
   - Any spot where you left a TODO comment because removing the old
     stat-box left a section looking broken
