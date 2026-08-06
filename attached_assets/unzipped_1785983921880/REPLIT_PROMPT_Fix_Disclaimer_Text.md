# Replit Agent Prompt — Small Fix: Property Intelligence Disclaimer Text

**Branch: confirm you are on `production-candidate`. This is a one-line text change.**

Find the existing disclaimer line at the bottom of the Property Intelligence panel in `Home.tsx` — it currently reads approximately: "Source: Land Registry, EPC Register, Environment Agency. All fields remain editable."

Update it to: "Source: Land Registry, EPC Register, Environment Agency. Address suggestions may occasionally show an incorrect postcode on streets with more than one postcode. All fields remain editable."

Keep the existing styling/formatting exactly as-is — this is a text-only change, one sentence inserted into the existing line.

## Verification before pushing

1. `npx tsc --noEmit` — zero errors required.
2. Confirm `git status` shows only the one intended file.
3. Screenshot the updated panel to confirm the text reads correctly and doesn't overflow/wrap awkwardly.
4. Do not push automatically — report back and I'll confirm before you push to `production-candidate`.
