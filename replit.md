# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## DealScore App (`artifacts/dealscore`)

React + Vite + Tailwind + shadcn/ui. UK property deal analyser with 7 strategies (BTL, HMO, Flip, SA, BRRR, R2R, Social).

**Key files:**
- `src/pages/Home.tsx` — main component (~1,700 lines after Stage 6A)
- `src/lib/calculations.ts` — all strategy calculation functions
- `src/components/DealScorePDF.tsx` — React-PDF 4-page investor report

**PDF generation:** Uses `@react-pdf/renderer` (PDFDownloadLink). Removed jsPDF entirely in Stage 6A.
- Vite config: `optimizeDeps.include: ['@react-pdf/renderer']` — required for Vite/CJS compatibility
- PDF has 4 pages: Cover (navy/brand background + logo), Property & Financial Summary, Strategy Analysis + Deal Score, Deal Notes
- Sourcer branding: logo upload (base64) + brand colour picker in the "Prepared by" section

**Property Tax:** Supports SDLT (England/NI), LTT (Wales), LBTT (Scotland). Manual override with draft-state input.

**User preferences:** £ currency, navy #1B3A6B brand colour default, UK addresses via Google Maps Places API.
