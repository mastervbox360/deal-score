// Shared type definitions used across pages and PDF components

export interface ComparableRow {
  id: string; // stable id for React keys — use crypto.randomUUID() for new rows
  type: 'sale' | 'let';
  address: string;
  postcode: string;
  propertyType: string; // one of PROPERTY_TYPES
  bedrooms: number | '';
  floorArea: number | ''; // sqm only
  date: string; // "Date Sold" for type=sale, "Date Let" for type=let
  price: string; // "Sale Price" for type=sale, "Monthly Rent" for type=let
  includeInPdf: boolean | null; // null = default — used in Prompt 5
  lat: number | null; // populated in Prompt 2
  lng: number | null;
}
