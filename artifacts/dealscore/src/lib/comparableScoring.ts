/**
 * Comparable Evidence Scoring Engine — Prompt 3 of 5
 *
 * Exports:
 *   SubjectContext    — the subject deal data needed for comparison
 *   ComparableScore   — the structured return value
 *   scoreComparable() — the main scoring function
 *
 * No UI wiring lives here; this module is purely functional and unit-testable.
 */

import type { ComparableRow } from './types';
import type { DealType } from './calculations';
import { haversineMiles } from './calculations';

// ── Interpolation helper ─────────────────────────────────────────────────────
/**
 * Map a raw value to a 0–100 quality score via linear interpolation.
 * Returns 100 when value ≤ strong, 0 when value ≥ weak, linearly blending between.
 * Convention: lower raw value = better outcome (distance, months ago, % deviation).
 */
function interpolate(value: number, strong: number, weak: number): number {
  if (value <= strong) return 100;
  if (value >= weak) return 0;
  return Math.round(100 * (1 - (value - strong) / (weak - strong)));
}

// ── Date parsing ─────────────────────────────────────────────────────────────
const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun',
                     'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/**
 * Parse a free-text date string ("Jan 2025", "March 2024", "01/2025") into
 * the number of calendar months elapsed since then. Returns null if unparseable.
 */
function parseMonthsAgo(dateStr: string): number | null {
  const parts = (dateStr || '').trim().split(/[\s,/\-]+/);
  let monthIdx: number | null = null;
  let year: number | null = null;
  for (const part of parts) {
    const mi = MONTH_NAMES.findIndex(m => part.toLowerCase().startsWith(m));
    if (mi !== -1) monthIdx = mi;
    const n = parseInt(part, 10);
    if (!isNaN(n) && n >= 1900 && n <= 2100) year = n;
    // Two-digit month number ("01"–"12")
    if (!isNaN(n) && n >= 1 && n <= 12 && part.length <= 2 && monthIdx === null) monthIdx = n - 1;
  }
  if (monthIdx === null || year === null) return null;
  const now = new Date();
  const monthsDiff = (now.getFullYear() - year) * 12 + (now.getMonth() - monthIdx);
  return Math.max(0, monthsDiff);
}

// ── Price parsing ─────────────────────────────────────────────────────────────
/** Strip £ signs and commas; return numeric value or null if not parseable. */
function parsePrice(priceStr: string): number | null {
  const cleaned = (priceStr || '').replace(/[£,\s]/g, '');
  const val = parseFloat(cleaned);
  return isNaN(val) || val <= 0 ? null : val;
}

/** Absolute % deviation of `a` from `b`, as a decimal (0.10 = 10%). Null if either is falsy/zero. */
function pctDev(a: number | null, b: number | null): number | null {
  if (!a || !b) return null;
  return Math.abs(a - b) / b;
}

// ── Public interfaces ─────────────────────────────────────────────────────────

/**
 * Everything the scoring engine needs to know about the subject deal.
 * Build this from component state before calling scoreComparable().
 */
export interface SubjectContext {
  propertyType: string;
  tenure: 'Freehold' | 'Leasehold' | null;
  lat: number | null;
  lng: number | null;
  floorArea: number | null;    // sqm
  bedrooms: number | null;     // for bedroom-count factor matching
  /**
   * Reference price per m² for sale comparable scoring — strategy-aware:
   *   BTL / HMO / SA / SOCIAL → purchasePrice / floorArea
   *   FLIP                    → expectedSalePrice / floorArea  (validates exit/GDV, not entry)
   *   BRRR                    → postRefurbValue / floorArea    (validates refinance basis)
   *   R2R                     → null (no property purchase; sale comparables score without this factor)
   */
  pricePerSqM: number | null;
  dealType: DealType;
  // Rent figures — populate whichever is applicable for the deal type:
  monthlyRent: number | null;          // BTL, BRRR
  rentPerRoom: number | null;          // HMO, R2R
  leaseIncomePerMonth: number | null;  // SOCIAL
}

export interface ComparableScore {
  overall: 'Strong' | 'Fair' | 'Weak';
  /** 0–100 weighted numeric score; -1 when a hard gate tripped (no meaningful score). */
  overallNumeric: number;
  /** Human-readable reason if a hard gate fired; null otherwise. */
  gateFailed: string | null;
  /** True when one or both lat/lng were unavailable — distance factor omitted, gate skipped. */
  distanceUnverified: boolean;
  /** True for let comparables against an SA deal — rent metric cannot be computed. */
  rentMetricUnavailable: boolean;
  /** True for sale comparables against an R2R deal — no reference purchase price exists. */
  priceMetricUnavailable: boolean;
  factors: Array<{
    label: string;
    status: 'strong' | 'fair' | 'weak' | 'unavailable';
    /** Human-readable value shown in the UI, e.g. "4 months ago" or "0.6 miles". */
    detail: string;
  }>;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

function factorStatus(score: number | null): 'strong' | 'fair' | 'weak' | 'unavailable' {
  if (score === null) return 'unavailable';
  if (score >= 75) return 'strong';
  if (score >= 50) return 'fair';
  return 'weak';
}

/**
 * Weighted average over a set of factors, automatically skipping nulls and
 * re-normalising the remaining weights so the output is always 0–100.
 */
function weightedAverage(factors: Array<{ weight: number; score: number | null }>): number {
  const available = factors.filter(f => f.score !== null);
  const totalWeight = available.reduce((s, f) => s + f.weight, 0);
  if (totalWeight === 0) return 0;
  return available.reduce((s, f) => s + f.weight * f.score!, 0) / totalWeight;
}

function band(numeric: number): 'Strong' | 'Fair' | 'Weak' {
  if (numeric >= 75) return 'Strong';
  if (numeric >= 50) return 'Fair';
  return 'Weak';
}

// ── Main scoring function ─────────────────────────────────────────────────────

export function scoreComparable(comparable: ComparableRow, subject: SubjectContext): ComparableScore {
  // Convenience: return a hard-gated Weak immediately, skipping all factor computation
  const gatedWeak = (reason: string, distanceUnverified = false): ComparableScore => ({
    overall: 'Weak',
    overallNumeric: -1,
    gateFailed: reason,
    distanceUnverified,
    rentMetricUnavailable: false,
    priceMetricUnavailable: false,
    factors: [],
  });

  // ── Gate 1 & 2: Property type + tenure (sale comparables only) ───────────
  if (comparable.type === 'sale') {
    if (
      comparable.propertyType &&
      subject.propertyType &&
      comparable.propertyType !== subject.propertyType
    ) {
      return gatedWeak('Property type mismatch');
    }
    // Tenure gate: ComparableRow does not currently carry a tenure field, so this can only
    // fire if a future extension adds one. Noted here for Prompt 4/5 expansion.
    // When it does: if (comparable.tenure && subject.tenure && comparable.tenure !== subject.tenure)
    //   return gatedWeak('Tenure mismatch');
  }

  // ── Gate 3: Distance > 2 miles (both types; skipped if coordinates unknown) ─
  let distanceMiles: number | null = null;
  let distanceUnverified = false;

  if (subject.lat && subject.lng && comparable.lat && comparable.lng) {
    distanceMiles = haversineMiles(subject.lat, subject.lng, comparable.lat, comparable.lng);
    if (distanceMiles > 2) return gatedWeak('Distance > 2 miles');
  } else {
    distanceUnverified = true;
  }

  // ── Shared factor: Recency ────────────────────────────────────────────────
  const monthsAgo = parseMonthsAgo(comparable.date);
  const recencyScore = monthsAgo !== null ? interpolate(monthsAgo, 6, 12) : null;
  const recencyDetail = monthsAgo !== null
    ? `${Math.round(monthsAgo)} month${Math.round(monthsAgo) === 1 ? '' : 's'} ago`
    : 'No date entered';

  // ── Shared factor: Distance ───────────────────────────────────────────────
  const distanceScore = distanceMiles !== null ? interpolate(distanceMiles, 0.3, 1.0) : null;
  const distanceDetail = distanceMiles !== null
    ? `${distanceMiles.toFixed(2)} miles`
    : 'Coordinates unavailable — distance unverified';

  // ── Shared factor: Floor area proximity ──────────────────────────────────
  const compFloorArea: number | null = comparable.floorArea !== '' ? comparable.floorArea : null;
  const floorAreaPct = pctDev(compFloorArea, subject.floorArea);
  const floorAreaScore = floorAreaPct !== null ? interpolate(floorAreaPct, 0.15, 0.30) : null;
  const floorAreaDetail = floorAreaPct !== null
    ? `${Math.round(floorAreaPct * 100)}% difference (comp ${compFloorArea}m² / subject ${subject.floorArea}m²)`
    : 'Floor area unavailable on one or both sides';

  // ── Shared factor: Bedroom count match ───────────────────────────────────
  const compBeds: number | null = comparable.bedrooms !== '' ? comparable.bedrooms : null;
  const bedDiff = compBeds !== null && subject.bedrooms !== null
    ? Math.abs(compBeds - subject.bedrooms)
    : null;
  const bedroomScore = bedDiff !== null ? interpolate(bedDiff, 0, 2) : null;
  const bedroomDetail = bedDiff !== null
    ? bedDiff === 0
      ? `Exact match (${compBeds} bed)`
      : `${bedDiff} bed difference (comp ${compBeds} / subject ${subject.bedrooms})`
    : 'Bedroom count unavailable';

  // ── Branch on comparable type ─────────────────────────────────────────────

  if (comparable.type === 'sale') {
    // Dynamic label: clarifies which reference price is being validated
    const psmLabel =
      subject.dealType === 'FLIP'  ? 'Exit price/m² proximity'        :
      subject.dealType === 'BRRR'  ? 'Post-refurb price/m² proximity' :
                                     'Price/m² proximity';

    // Factor: Price per m² proximity
    // R2R has no reference purchase price — mark unavailable and exclude from scoring
    const compPrice = parsePrice(comparable.price);
    const compPSM = compPrice !== null && compFloorArea ? compPrice / compFloorArea : null;
    let psmScore: number | null = null;
    let psmDetail: string;
    let priceMetricUnavailable = false;

    if (subject.dealType === 'R2R') {
      // No property purchase in R2R — sale comparable price/m² has no valid reference to compare against
      priceMetricUnavailable = true;
      psmDetail = 'Price comparison not applicable for Rent-to-Rent deals';
    } else {
      const psmPct = pctDev(compPSM, subject.pricePerSqM);
      psmScore = psmPct !== null ? interpolate(psmPct, 0.10, 0.20) : null;
      psmDetail = psmPct !== null && compPSM !== null && subject.pricePerSqM !== null
        ? `${Math.round(psmPct * 100)}% difference (£${Math.round(compPSM)}/m² vs £${Math.round(subject.pricePerSqM)}/m²)`
        : 'Price/m² unavailable — price or floor area missing';
    }

    const saleFactors: Array<{ label: string; weight: number; score: number | null; detail: string }> = [
      { label: 'Recency',    weight: 25, score: recencyScore,   detail: recencyDetail },
      { label: psmLabel,     weight: 25, score: psmScore,       detail: psmDetail },
      { label: 'Distance',   weight: 20, score: distanceScore,  detail: distanceDetail },
      { label: 'Floor area', weight: 20, score: floorAreaScore, detail: floorAreaDetail },
      { label: 'Bedrooms',   weight: 10, score: bedroomScore,   detail: bedroomDetail },
    ];

    // For R2R, psmScore is null → weightedAverage skips it and re-normalises the remaining 75%
    const overallNumeric = Math.round(weightedAverage(saleFactors));
    return {
      overall: band(overallNumeric),
      overallNumeric,
      gateFailed: null,
      distanceUnverified,
      rentMetricUnavailable: false,
      priceMetricUnavailable,
      factors: saleFactors.map(f => ({
        label: f.label,
        status: factorStatus(f.score),
        detail: f.detail,
      })),
    };
  }

  // ── Let comparable ────────────────────────────────────────────────────────

  // Factor: Property type match (weighted, not a gate for let)
  const propTypeMatch = comparable.propertyType && subject.propertyType
    ? comparable.propertyType === subject.propertyType
    : null;
  const propTypeScore = propTypeMatch !== null ? (propTypeMatch ? 100 : 0) : null;
  const propTypeDetail = propTypeMatch !== null
    ? propTypeMatch
      ? `Exact match (${comparable.propertyType})`
      : `Mismatch — comp ${comparable.propertyType || '(unknown)'} / subject ${subject.propertyType}`
    : 'Property type unavailable';

  // Factor: Rent metric proximity — branches on dealType
  let rentScore: number | null = null;
  let rentDetail = '';
  let rentMetricUnavailable = false;

  const compPrice = parsePrice(comparable.price);

  if (subject.dealType === 'SA') {
    // SA deals use nightly rates; monthly rent comparisons are meaningless
    rentMetricUnavailable = true;
    rentDetail = 'Rent metric not applicable for SA deals (nightly rate basis)';
  } else if (subject.dealType === 'HMO' || subject.dealType === 'R2R') {
    // Room-based income: compare rent per room
    const compRentPerRoom = compPrice !== null && compBeds ? compPrice / compBeds : null;
    const rentPct = pctDev(compRentPerRoom, subject.rentPerRoom);
    rentScore = rentPct !== null ? interpolate(rentPct, 0.10, 0.20) : null;
    rentDetail = rentPct !== null && compRentPerRoom !== null && subject.rentPerRoom !== null
      ? `${Math.round(rentPct * 100)}% difference (£${Math.round(compRentPerRoom)}/room vs £${Math.round(subject.rentPerRoom)}/room)`
      : 'Rent/room unavailable — price or bedroom count missing on comparable or subject';
  } else {
    // Whole-property rent: BTL, BRRR, SOCIAL — compare rent per m²
    const subjectMonthly = subject.dealType === 'SOCIAL'
      ? subject.leaseIncomePerMonth
      : subject.monthlyRent;
    const subjectRentPSM = subjectMonthly && subject.floorArea ? subjectMonthly / subject.floorArea : null;
    const compRentPSM = compPrice !== null && compFloorArea ? compPrice / compFloorArea : null;
    const rentPct = pctDev(compRentPSM, subjectRentPSM);
    rentScore = rentPct !== null ? interpolate(rentPct, 0.10, 0.20) : null;
    rentDetail = rentPct !== null && compRentPSM !== null && subjectRentPSM !== null
      ? `${Math.round(rentPct * 100)}% difference (£${compRentPSM.toFixed(2)}/m²/mo vs £${subjectRentPSM.toFixed(2)}/m²/mo)`
      : 'Rent/m² unavailable — price, floor area, or subject rent missing';
  }

  const letFactors: Array<{ label: string; weight: number; score: number | null; detail: string }> = [
    { label: 'Recency',               weight: 25, score: recencyScore,   detail: recencyDetail },
    { label: 'Rent metric proximity', weight: 25, score: rentScore,      detail: rentDetail },
    { label: 'Distance',              weight: 20, score: distanceScore,  detail: distanceDetail },
    { label: 'Property type',         weight: 15, score: propTypeScore,  detail: propTypeDetail },
    { label: 'Floor area',            weight: 10, score: floorAreaScore, detail: floorAreaDetail },
    { label: 'Bedrooms',              weight:  5, score: bedroomScore,   detail: bedroomDetail },
  ];

  // For SA deals, rentScore is null → weightedAverage skips it automatically and re-normalises
  const overallNumeric = Math.round(weightedAverage(letFactors));
  return {
    overall: band(overallNumeric),
    overallNumeric,
    gateFailed: null,
    distanceUnverified,
    rentMetricUnavailable,
    priceMetricUnavailable: false,
    factors: letFactors.map(f => ({
      label: f.label,
      status: factorStatus(f.score),
      detail: f.detail,
    })),
  };
}
