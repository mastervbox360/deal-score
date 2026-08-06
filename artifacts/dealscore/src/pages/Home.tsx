import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Home, TrendingUp, Calculator, Download, ChevronDown, RotateCcw, Trash2, Plus, Sparkles, X } from 'lucide-react';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import DealScorePDF, { type DealScorePDFProps } from '@/components/DealScorePDF';
import DealScorePDFProPlus from '@/components/DealScorePDFProPlus';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { calculateBTL, calculateHMO, calculateFlip, calculateSA, calculateBRRR, calculateR2R, calculateSocialHousing, calculatePropertyTax, haversineMiles, TAX_LABEL, COUNTRY_LABEL, BUYER_LABEL, type DealType, type BTLInputs, type HMOInputs, type FlipInputs, type SAInputs, type BRRRInputs, type R2RInputs, type SocialHousingInputs, type Country, type BuyerType } from '@/lib/calculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { ComparableRow } from '@/lib/types';
import { scoreComparable, type SubjectContext } from '@/lib/comparableScoring';

declare global {
  interface Window {
    initGoogleMaps: () => void;
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(value);
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`;
}

function getLuminance(hex: string): number {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const toLinear = (c: number) => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getContrastText(bgHex: string): string {
  return getLuminance(bgHex) > 0.35 ? '#1A1A1A' : '#FFFFFF';
}


const PdfDownloadButton = React.memo(function PdfDownloadButton({
  pdfProps,
  fileName,
  orientation,
  tooltip = 'Download investor pack PDF',
}: {
  pdfProps: DealScorePDFProps;
  fileName: string;
  orientation: 'portrait' | 'landscape';
  tooltip?: string;
}) {
  const textColour = getContrastText(pdfProps.brandColour);
  const PdfComponent = pdfProps.tierOverride === 'pro_plus' && orientation === 'landscape' ? DealScorePDFProPlus : DealScorePDF;
  return (
    <PDFDownloadLink
      key={pdfProps.propertyAddress + '||' + pdfProps.coverStyle + '||' + pdfProps.currentScore + '||' + pdfProps.riskFlags.length}
      document={<PdfComponent {...pdfProps} />}
      fileName={fileName}
      style={{ flex: 1, textDecoration: 'none' }}
      data-testid="button-download-pdf"
    >
      {({ loading }: { loading: boolean }) => (
        <div
          title={tooltip}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm shadow-md hover:opacity-90 active:scale-[0.99] transition w-full cursor-pointer"
          style={{ backgroundColor: pdfProps.brandColour, color: textColour }}
        >
          <Download className="w-4 h-4" style={{ color: textColour }} />
          {loading ? 'Preparing PDF…' : '⬇ Download Investor Summary PDF'}
        </div>
      )}
    </PDFDownloadLink>
  );
});

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1200;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve('');
    };
    img.src = url;
  });
}

const isIOS = typeof navigator !== 'undefined' && (
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
);

const DEFAULT_TIMELINE_STAGES: Record<string, Array<{ label: string; month: number }>> = {
  BTL:    [{ label: 'Exchange', month: 0 }, { label: 'Completion', month: 1 }, { label: 'Refurb Complete', month: 3 }, { label: 'Tenant In', month: 4 }],
  HMO:    [{ label: 'Exchange', month: 0 }, { label: 'Completion', month: 1 }, { label: 'Conversion Complete', month: 4 }, { label: 'Tenants In', month: 5 }],
  SA:     [{ label: 'Exchange', month: 0 }, { label: 'Completion', month: 1 }, { label: 'Furnishing Complete', month: 3 }, { label: 'First Booking', month: 4 }],
  BRRR:   [{ label: 'Exchange', month: 0 }, { label: 'Completion', month: 1 }, { label: 'Refurb Complete', month: 4 }, { label: 'Refinance', month: 5 }, { label: 'Tenant In', month: 6 }],
  FLIP:   [{ label: 'Exchange', month: 0 }, { label: 'Completion', month: 1 }, { label: 'Refurb Complete', month: 4 }, { label: 'Listed', month: 5 }, { label: 'Sold', month: 7 }],
  R2R:    [{ label: 'Agreement Signed', month: 0 }, { label: 'Keys Received', month: 1 }, { label: 'Setup Complete', month: 2 }, { label: 'Tenants In', month: 3 }],
  SOCIAL: [{ label: 'Exchange', month: 0 }, { label: 'Completion', month: 1 }, { label: 'Handover to Provider', month: 2 }, { label: 'Lease Start', month: 3 }],
};

function iterativeSolve(
  startPrice: number,
  check: (price: number) => boolean,
  step = 1000,
  maxIter = 10000
): number | null {
  if (startPrice <= 0) return null;
  let price = Math.round(startPrice / step) * step;
  for (let i = 0; i < maxIter; i++) {
    if (price <= 0) return null;
    if (check(price)) return price;
    price -= step;
  }
  return null;
}

// EPC dwelling_type → internal property type mapping — shared by subject property and comparable EPC auto-fill
const EPC_TYPE_MAP: Record<string, string> = {
  'Top-floor flat': 'Flat/Apartment', 'Mid-floor flat': 'Flat/Apartment',
  'Ground-floor flat': 'Flat/Apartment', 'Basement flat': 'Flat/Apartment',
  'Flat': 'Flat/Apartment', 'Maisonette': 'Flat/Apartment',
  'Mid-terrace house': 'Terraced', 'End-terrace house': 'Terraced',
  'Semi-detached house': 'Semi-Detached', 'Detached house': 'Detached',
  'Bungalow': 'Bungalow', 'Park home': 'Terraced',
};

export default function HomePage() {
  const [dealType, setDealType] = useState<DealType>('BTL');

  const [sharedInputs, setSharedInputs] = useState({
    purchasePrice: 0,
    refurbCost: 0,
    otherCosts: 0,
    depositPercent: 25,
    mortgageRate: 0,
    mortgageTerm: 25,
    mortgageType: 'IO' as 'IO' | 'REPAYMENT',
  });

  const [btlInputs, setBtlInputs] = useState({ monthlyRent: 0 });

  const [hmoInputs, setHmoInputs] = useState({ rooms: 0, rentPerRoom: 0, occupancyRate: 90, licenceCost: 0 });

  const [preparedBy, setPreparedBy] = useState({ name: '', email: '', phone: '' });
  const [companyName, setCompanyName] = useState<string>('');
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState<string>('Terraced');
  const [tenure, setTenure] = useState<'Freehold' | 'Leasehold'>('Freehold');
  const [autoFilledPropertyType, setAutoFilledPropertyType] = useState(false);
  const [autoFilledTenure, setAutoFilledTenure] = useState(false);
  const [userSetTenure, setUserSetTenure] = useState(false);
  const [userSetLeaseLength, setUserSetLeaseLength] = useState(false);
  const [leaseLengthYears, setLeaseLengthYears] = useState<number>(0);
  const [bedrooms, setBedrooms] = useState<number | ''>('');
  const [bathrooms, setBathrooms] = useState<number | ''>('');
  const [remainingLeaseYears, setRemainingLeaseYears] = useState<number | ''>('');
  const [leaseExtensionCost, setLeaseExtensionCost] = useState<number | ''>('');
  const [isCashBuyer, setIsCashBuyer] = useState<boolean>(false);
  const [isUninhabitable, setIsUninhabitable] = useState<boolean>(false);
  const [isAuctionPurchase, setIsAuctionPurchase] = useState<boolean>(false);
  const [auctionDate, setAuctionDate] = useState<string>('');
  const [auctionCompletionDate, setAuctionCompletionDate] = useState<string>('');
  const [buyersPremiumPct, setBuyersPremiumPct] = useState<number | ''>('');
  const [buyersPremiumAmount, setBuyersPremiumAmount] = useState<number | ''>('');
  const [buyersPremiumMode, setBuyersPremiumMode] = useState<'pct' | 'fixed'>('pct');
  const [auctionReservationFee, setAuctionReservationFee] = useState<number | ''>('');
  const [sourcingFee, setSourcingFee] = useState<number>(0);
  const [sourcingFeeDisclaimer, setSourcingFeeDisclaimer] = useState<string | null>(null);
  const [manualFloorArea, setManualFloorArea] = useState<number | ''>('');
  const [floorAreaUnit, setFloorAreaUnit] = useState<'sqm' | 'sqft'>('sqm');
  const [protectAddress, setProtectAddress] = useState<boolean>(false);
  const [protectedAddressDescription, setProtectedAddressDescription] = useState<string>('');
  const [paymentTermsExpanded, setPaymentTermsExpanded] = useState<boolean>(false);
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [resultsMode, setResultsMode] = useState<Record<string, 'analyse' | 'offer'>>({
    BTL: 'analyse', HMO: 'analyse', FLIP: 'analyse', SA: 'analyse',
    BRRR: 'analyse', R2R: 'analyse', SOCIAL: 'analyse',
  });
  const [optimiserTarget, setOptimiserTarget] = useState<Record<string, 'roi' | 'cf'>>({
    BTL: 'roi', HMO: 'roi', FLIP: 'roi', SA: 'roi',
    BRRR: 'roi', R2R: 'roi', SOCIAL: 'roi',
  });
  const [btlOfferROI, setBtlOfferROI] = useState(8);
  const [btlOfferCF, setBtlOfferCF] = useState(250);
  const [hmoOfferROI, setHmoOfferROI] = useState(12);
  const [hmoOfferCF, setHmoOfferCF] = useState(500);
  const [hmoOfferYield, setHmoOfferYield] = useState(10);
  const [flipOfferMargin, setFlipOfferMargin] = useState(18);
  const [flipOfferMinProfit, setFlipOfferMinProfit] = useState(25000);
  const [flipOfferWithPlanning, setFlipOfferWithPlanning] = useState(true);
  const [brrrOfferCashLeft, setBrrrOfferCashLeft] = useState(10000);
  const [saOfferROI, setSaOfferROI] = useState(15);
  const [saOfferProfit, setSaOfferProfit] = useState(500);
  const [saOfferOccupancy, setSaOfferOccupancy] = useState(75);
  const [r2rOfferProfit, setR2rOfferProfit] = useState(500);
  const [r2rOfferROI, setR2rOfferROI] = useState(50);
  const [socialOfferROI, setSocialOfferROI] = useState(8);
  const [socialOfferCF, setSocialOfferCF] = useState(250);
  const disclaimerName = companyName.trim() || preparedBy.name || '[Sourcer Name]';
  const effectiveDisclaimer = sourcingFeeDisclaimer !== null
    ? sourcingFeeDisclaimer
    : `The sourcing fee stated is payable to ${disclaimerName} as agreed between the sourcer and investor. ${disclaimerName} provides property sourcing services only and is not authorised or regulated by the Financial Conduct Authority. This document is prepared for information purposes only, is confidential, and does not constitute financial, legal, or investment advice. All financial projections are estimates based on information available at the time of preparation and may differ from actual results. Investors should satisfy themselves through their own due diligence prior to proceeding. Independent legal and financial advice should be sought before making any investment decision. ${disclaimerName} accepts no liability for any loss or damage arising from reliance on this document. ${dealType === 'FLIP' ? 'Property values can fall as well as rise. Refurbishment costs and project timelines may exceed initial estimates and past performance is not indicative of future results.' : dealType === 'R2R' ? 'This opportunity does not involve the acquisition of any ownership interest in the property. Returns are subject to occupancy rates, subletting income, and the terms agreed with the landlord. Past performance is not indicative of future results.' : 'Property values can fall as well as rise, rental income is not guaranteed, and past performance is not indicative of future results.'}`;
  const [marketValue, setMarketValue] = useState<number>(0);
  const [strategyNotes, setStrategyNotes] = useState<Record<string, string>>({});
  const [propertyDescription, setPropertyDescription] = useState<string>('');
  const [vendorSituation, setVendorSituation] = useState<string>('');
  const [areaAverageYield, setAreaAverageYield] = useState(0);
  const [timelineStages, setTimelineStages] = useState(DEFAULT_TIMELINE_STAGES['BTL']);
  const [offerDeadline, setOfferDeadline] = useState('');
  const [viewingAvailable, setViewingAvailable] = useState(false);
  const [refurbScope, setRefurbScope] = useState('');
  const [comparables, setComparables] = useState<ComparableRow[]>([]);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);
  const [photoFiles, setPhotoFiles] = useState<string[]>([]);
  const [heroPhotoIndex, setHeroPhotoIndex] = useState<number>(0);
  const [photoLimitError, setPhotoLimitError] = useState<boolean>(false);
  const [executiveSummary, setExecutiveSummary] = useState<Record<string, string>>({});
  const [aiGenerating, setAiGenerating] = useState<boolean>(false);
  const [strategyAiGenerating, setStrategyAiGenerating] = useState<boolean>(false);
  const [aiGenCount, setAiGenCount] = useState<number>(() => parseInt(localStorage.getItem('ds_ai_gen_count') ?? '0', 10));
  const [listingLinks, setListingLinks] = useState<Array<{ label: string; url: string }>>([{ label: '', url: '' }]);
  const [strategyOpen, setStrategyOpen] = useState<boolean>(false);
  const [dealNotesOpen, setDealNotesOpen] = useState<boolean>(false);
  const [hasAnalysed, setHasAnalysed] = useState(false);
  const [stressTestOpen, setStressTestOpen] = useState<boolean>(false);
  const [showWorkingsOpen, setShowWorkingsOpen] = useState<boolean>(false);
  const [whyScoreOpen, setWhyScoreOpen] = useState<boolean>(false);
  const [showAnnual, setShowAnnual] = useState<boolean>(false);
  const [includeWorkingsInPDF, setIncludeWorkingsInPDF] = useState<boolean>(false);
  const [taxCountry, setTaxCountry] = useState<Country>('ENGLAND');
  const [buyerType, setBuyerType] = useState<BuyerType>('ADDITIONAL');
  const [taxOverrideActive, setTaxOverrideActive] = useState(false);
  const [taxOverrideEditing, setTaxOverrideEditing] = useState(false);
  const [manualTaxValue, setManualTaxValue] = useState<number>(0);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<'S' | 'M' | 'L'>('M');
  const [coverStyle, setCoverStyle] = useState<'classic' | 'clean' | 'bold'>('classic');
  const [pdfOrientation, setPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [tierOverride, setTierOverride] = useState<'free' | 'pro' | 'pro_plus'>('pro_plus');
  const [brandColourDraft, setBrandColourDraft] = useState('#1B3A6B');
  const [brandColour, setBrandColour] = useState('#1B3A6B');
  const [accentColour, setAccentColour] = useState<string>('#00C896');
  const [accentColourDraft, setAccentColourDraft] = useState<string>('#00C896');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState<boolean>(false);
  const [showDealScoreOnCover, setShowDealScoreOnCover] = useState<boolean>(true);
  const [showBMVOnCover, setShowBMVOnCover] = useState<boolean>(true);
  const [showSourcingFeeOnCover, setShowSourcingFeeOnCover] = useState<boolean>(false);
  const [iosGenerating, setIosGenerating] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setBrandColour(brandColourDraft), 500);
    return () => clearTimeout(timer);
  }, [brandColourDraft]);

  useEffect(() => {
    const timer = setTimeout(() => setAccentColour(accentColourDraft), 500);
    return () => clearTimeout(timer);
  }, [accentColourDraft]);

  useEffect(() => {
    if (isUninhabitable) {
      setIsCashBuyer(true);
    } else {
      setIsCashBuyer(false);
    }
  }, [isUninhabitable]);

  useEffect(() => {
    if (!isAuctionPurchase || !auctionDate) return;
    const allDefaults = Object.values(DEFAULT_TIMELINE_STAGES);
    const currentJSON = JSON.stringify(timelineStages);
    const isStillDefault = allDefaults.some(def => JSON.stringify(def) === currentJSON);
    if (!isStillDefault) return;
    const auctionLabel = `Auction (${new Date(auctionDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})`;
    const completionLabel = auctionCompletionDate
      ? `Completion (${new Date(auctionCompletionDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })})`
      : 'Completion';
    setTimelineStages(prev => {
      const updated = [...prev];
      if (updated[0]) updated[0] = { ...updated[0], label: auctionLabel };
      if (updated[1]) updated[1] = { ...updated[1], label: completionLabel };
      return updated;
    });
  }, [isAuctionPurchase, auctionDate, auctionCompletionDate]);

  const [propertyData, setPropertyData] = useState<{
    detectedTenure: 'Freehold' | 'Leasehold' | null;
    detectedPropertyType: string | null;
    floorArea: number | null;
    epcRating: string | null;
    potentialEpcRating: string | null;
    constructionDate: string | null;
    mainHeating: string | null;
    heatingCostCurrent: number | null;
    environmentalImpactCurrent: number | null;
    energyConsumptionCurrent: number | null;
    epcMatchStatus: 'no_match' | null; // 'no_match' = certs found for postcode but none matched this address
    epcExpired: boolean;               // true when matched cert registrationDate + 10 years < today
    epcExpiryDate: string | null;      // "YYYY-MM-DD" expiry date, present when epcExpired is true
    floodRisk: string | null;
    lat: number | null;
    lng: number | null;
  } | null>(null);
  const [propertyDataLoading, setPropertyDataLoading] = useState(false);
  const [propertyDataOpen, setPropertyDataOpen] = useState(true);

  const [addressSuggestions, setAddressSuggestions] = useState<{description: string; placeId: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  // Rooftop-level coords captured from Places getDetails when user selects subject address from autocomplete.
  // Preferred over postcodes.io postcode-centroid coords for flood lookup and distance calculations.
  const subjectPlacesCoords = useRef<{ lat: number; lng: number } | null>(null);

  // Per-comparable-row autocomplete state — keyed by row.id
  const [compSuggestions, setCompSuggestions] = useState<Record<string, { description: string; placeId: string }[]>>({});
  const [compShowSuggestions, setCompShowSuggestions] = useState<Record<string, boolean>>({});
  const [compHighlightedIndex, setCompHighlightedIndex] = useState<Record<string, number>>({});
  // Which comparable rows have their score breakdown expanded
  const [expandedComps, setExpandedComps] = useState<Record<string, boolean>>({});

  const [flipInputs, setFlipInputs] = useState({ holdingCostsPerMonth: 0, projectLengthMonths: 0, expectedSalePrice: 0, sellingCostsPercent: 2, financingMethod: 'Bridging' as 'Cash' | 'Bridging' | 'Mortgage', contingencyPercent: 10, flipBridgingRate: 0, flipBridgingTermMonths: 0, flipBridgingLTV: 70, flipMortgageDeposit: 25, flipMortgageRate: 0, flipMortgageTerm: 25, flipMortgageType: 'IO' as 'IO' | 'Repayment' });

  const [saInputs, setSaInputs] = useState({ nightlyRate: 0, occupancyPercent: 75, platformFeesPercent: 0 });

  const [brrrInputs, setBrrrInputs] = useState({ postRefurbValue: 0, refinancePercent: 75, newMortgageRate: 0, monthlyRent: 0, bridgingRate: 0, bridgingTermMonths: 0, bridgingLTV: 70 });

  const [r2rLandlordDepositMonths, setR2rLandlordDepositMonths] = useState<number>(1);

  const [r2rInputs, setR2rInputs] = useState<R2RInputs>({
    monthlyRentPaid: 0,
    rooms: 0,
    rentPerRoom: 0,
    occupancyRate: 90,
    managementFeesPercent: 0,
    monthlyRunningCosts: 0,
    setupCosts: 0,
    landlordDeposit: 0,
    sourcingFee: 0,
  });

  const [socialInputs, setSocialInputs] = useState({ leaseIncomePerMonth: 0, leaseLengthYears: 0 });

  const [managementFeePercent, setManagementFeePercent] = useState(10);
  const [voidAllowancePercent, setVoidAllowancePercent] = useState(5);
  const [maintenanceReserve, setMaintenanceReserve] = useState(75);
  const [buildingsInsurance, setBuildingsInsurance] = useState(30);
  const [serviceCharge, setServiceCharge] = useState(0);
  const [groundRentAnnual, setGroundRentAnnual] = useState(0);

  const handleSharedChange = (field: keyof typeof sharedInputs, value: string) => {
    setSharedInputs(prev => ({ ...prev, [field]: field === 'mortgageType' ? value : (Number(value) || 0) }));
  };

  const handleBtlChange = (field: keyof typeof btlInputs, value: string) => {
    setBtlInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleHmoChange = (field: keyof typeof hmoInputs, value: string) => {
    setHmoInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleFlipChange = (field: keyof typeof flipInputs, value: string) => {
    if (field === 'financingMethod') {
      setFlipInputs(prev => ({ ...prev, financingMethod: value as 'Cash' | 'Bridging' | 'Mortgage' }));
    } else if (field === 'flipMortgageType') {
      setFlipInputs(prev => ({ ...prev, flipMortgageType: value as 'IO' | 'Repayment' }));
    } else {
      setFlipInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
    }
  };

  const handleSaChange = (field: keyof typeof saInputs, value: string) => {
    setSaInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleBrrrChange = (field: keyof typeof brrrInputs, value: string) => {
    setBrrrInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleR2rChange = (field: keyof R2RInputs, value: string) => {
    setR2rInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleSocialChange = (field: keyof typeof socialInputs, value: string) => {
    setSocialInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setLogoBase64((ev.target?.result as string) ?? null);
    reader.readAsDataURL(file);
  };

  const detectTaxCountryFromPostcode = (address: string) => {
    const postcodeMatch = address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i);
    if (!postcodeMatch) return;
    const postcode = postcodeMatch[0].toUpperCase().replace(/\s/g, '');
    const prefix = postcode.match(/^[A-Z]{1,2}/)?.[0] || '';

    const walesPostcodes = ['CF', 'SA', 'NP', 'LL', 'LD', 'SY'];
    const scotlandPostcodes = ['EH', 'G', 'AB', 'DD', 'KY', 'PH', 'FK', 'KA', 'ML', 'PA', 'TD', 'DG', 'KW', 'IV', 'HS', 'ZE'];

    if (walesPostcodes.includes(prefix)) {
      setTaxCountry('WALES');
    } else if (scotlandPostcodes.includes(prefix)) {
      setTaxCountry('SCOTLAND');
    } else {
      setTaxCountry('ENGLAND');
    }
  };

  const lookupPropertyData = async (address: string) => {
    if (!address || address.trim().length < 5) return;
    setPropertyDataLoading(true);
    // Show panel immediately with empty state so it appears at once
    setPropertyData({ detectedTenure: null, detectedPropertyType: null, floorArea: null, epcRating: null, potentialEpcRating: null, constructionDate: null, mainHeating: null, heatingCostCurrent: null, environmentalImpactCurrent: null, energyConsumptionCurrent: null, epcMatchStatus: null, epcExpired: false, epcExpiryDate: null, floodRisk: null, lat: null, lng: null });

    try {
      const postcodeMatch = address.match(/[A-Z]{1,2}[0-9][0-9A-Z]?\s*[0-9][A-Z]{2}/i);
      const postcode = postcodeMatch ? postcodeMatch[0].replace(/\s+/g, '').toUpperCase() : null;

      if (!postcode) {
        setPropertyDataLoading(false);
        return;
      }

      // Extract a plain string from a JSON-LD field: label[0]._value, _value, @id last segment, or plain value.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const getLdValue = (field: any): string | null => {
        if (!field) return null;
        if (typeof field === 'string') return field;
        if (typeof field === 'number') return String(field);
        if (field?.label?.[0]?.['_value']) return field.label[0]['_value'];
        if (field?.['_value'] != null) return String(field['_value']);
        if (typeof field?.['@id'] === 'string') return (field['@id'] as string).split('/').pop() ?? null;
        return null;
      };

      // EPC — typically fast; updates rating, floor area, construction date
      // EPC — two-step flow handled server-side: search by postcode → match address → fetch full certificate
      // Pass the full address so the function can match the specific property, not just first for postcode
      // Returns { data: <cert in snake_case>, matchStatus: 'matched' | 'no_match' | 'no_certificate' }
      const epcFetch = fetch(
        `/.netlify/functions/epc-lookup?postcode=${postcode}&address=${encodeURIComponent(address)}`
      )
        .then(r => r.json())
        .then(epc => {
          try {
            const cert = epc?.data;
            const matchStatus: string | undefined = epc?.matchStatus;

            if (!cert) {
              // If certs exist for the postcode but none matched this address, flag it so the
              // UI can show a distinct "couldn't confirm" warning instead of "no certificate"
              if (matchStatus === 'no_match') {
                setPropertyData(prev => prev ? { ...prev, epcMatchStatus: 'no_match' } : null);
              }
              return;
            }

            // Helper: some string fields vary by schema version — newer certs return a plain string,
            // older ones return { value: string, language: "1" }. Handle both gracefully.
            const strVal = (v: unknown): string | null =>
              typeof v === 'string' ? (v || null) : ((v as Record<string, unknown>)?.value as string) ?? null;

            // Property type: use dwelling_type (human-readable) rather than property_type (integer code)
            const rawDwellingType = strVal(cert.dwelling_type);
            const epcPropertyType = rawDwellingType
              ? (EPC_TYPE_MAP[rawDwellingType] || rawDwellingType)
              : null;

            // Floor area: plain number in sqm
            const floorArea = cert.total_floor_area != null ? Number(cert.total_floor_area) : null;

            // EPC rating (current and potential)
            const epcRating: string | null = cert.current_energy_efficiency_band || null;
            const potentialEpcRating: string | null = cert.potential_energy_efficiency_band || null;

            // Construction age band: letter code (A–L) in sap_building_parts[0]
            const AGE_BAND: Record<string, string> = {
              A: 'Pre-1900', B: '1900–1929', C: '1930–1949', D: '1950–1966',
              E: '1967–1975', F: '1976–1982', G: '1983–1990', H: '1991–1995',
              I: '1996–2002', J: '2003–2006', K: '2007–2011', L: '2012 onwards',
            };
            const parts = cert.sap_building_parts as Record<string, unknown> | unknown[] | null;
            const firstPart = parts
              ? (Array.isArray(parts) ? parts[0] : Object.values(parts)[0]) as Record<string, unknown>
              : null;
            const ageBandCode = firstPart?.construction_age_band as string | null ?? null;
            const constructionDate = ageBandCode ? (AGE_BAND[ageBandCode] || ageBandCode) : null;

            // Main heating description (array, take first; same string-or-object duality)
            const heatingArr = cert.main_heating as unknown[] | null;
            const firstHeating = heatingArr && heatingArr.length > 0
              ? heatingArr[0] as Record<string, unknown>
              : null;
            const mainHeating = firstHeating ? strVal(firstHeating.description) : null;

            // Annual heating cost (current) — { value: number, currency: "GBP" }
            const heatingCostRaw = cert.heating_cost_current as { value?: number } | null;
            const heatingCostCurrent = heatingCostRaw?.value != null ? Number(heatingCostRaw.value) : null;

            // Environmental impact rating (current) and energy consumption
            const environmentalImpactCurrent = cert.environmental_impact_current != null
              ? Number(cert.environmental_impact_current) : null;
            const energyConsumptionCurrent = cert.energy_consumption_current != null
              ? Number(cert.energy_consumption_current) : null;

            // Expiry flag — present when the matched certificate is more than 10 years old
            const epcExpired: boolean = epc?.expired === true;
            const epcExpiryDate: string | null = epc?.expiryDate ?? null;

            if (epcPropertyType) { setPropertyType(epcPropertyType); setAutoFilledPropertyType(true); }
            if (floorArea != null) { setManualFloorArea(floorArea); setFloorAreaUnit('sqm'); }
            setPropertyData(prev => prev ? {
              ...prev,
              floorArea,
              epcRating,
              potentialEpcRating,
              constructionDate,
              mainHeating,
              heatingCostCurrent,
              environmentalImpactCurrent,
              energyConsumptionCurrent,
              epcMatchStatus: null, // successful match — clear any prior no_match state
              epcExpired,
              epcExpiryDate,
              ...(epcPropertyType ? { detectedPropertyType: epcPropertyType } : {}),
            } : null);
          } catch { /* silent */ }
        })
        .catch(() => null);

      // Land Registry — typically slower; updates tenure and property type (authoritative)
      const landRegFetch = fetch(`/.netlify/functions/land-registry?postcode=${postcode}`)
        .then(r => r.json())
        .then(landReg => {
          try {
            const items = landReg?.result?.items;
            if (items && items.length > 0) {
              const item = items[0];
              const estateRaw = getLdValue(item.estateType)?.toLowerCase() ?? '';
              const detectedTenure: 'Freehold' | 'Leasehold' | null =
                estateRaw.includes('freehold') ? 'Freehold' :
                estateRaw.includes('leasehold') ? 'Leasehold' : null;
              const propRaw = getLdValue(item.propertyType)?.toLowerCase() ?? '';
              const landRegTypeMap: Record<string, string> = {
                'terraced': 'Terraced', 'semi-detached': 'Semi-Detached', 'detached': 'Detached',
                'flat-maisonette': 'Flat/Apartment', 'semi detached': 'Semi-Detached',
                'flat / maisonette': 'Flat/Apartment', 'flat/maisonette': 'Flat/Apartment',
              };
              const detectedPropertyType = landRegTypeMap[propRaw] ?? null;
              if (detectedTenure && !userSetTenure) { setTenure(detectedTenure); setAutoFilledTenure(true); }
              if (detectedPropertyType) { setPropertyType(detectedPropertyType); setAutoFilledPropertyType(true); }
              setPropertyData(prev => prev ? {
                ...prev,
                ...(detectedTenure ? { detectedTenure } : {}),
                ...(detectedPropertyType ? { detectedPropertyType } : {}),
              } : null);
            }
          } catch { /* silent */ }
        })
        .catch(() => null);

      // Geo + Flood — chains geo lookup into flood check; updates flood risk.
      // If the user selected the address from the autocomplete dropdown, subjectPlacesCoords.current
      // holds rooftop-level coords (more accurate than postcode centroid). Those are preferred for both
      // the flood proximity query and the stored lat/lng used in distance calculations.
      const geoFloodFetch = fetch(`https://api.postcodes.io/postcodes/${postcode}`)
        .then(r => r.json())
        .then(async geoResult => {
          try {
            // Prefer Places rooftop coords; fall back to postcodes.io centroid
            const placesCoords = subjectPlacesCoords.current;
            const lat: number | null = placesCoords?.lat ?? geoResult?.result?.latitude ?? null;
            const lng: number | null = placesCoords?.lng ?? geoResult?.result?.longitude ?? null;
            if (lat && lng) {
              const floodRes = await fetch(
                `https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat=${lat}&long=${lng}&dist=1`
              ).then(r => r.json()).catch(() => null);
              const floodItems = floodRes?.items;
              const floodRisk = floodItems && floodItems.length > 0
                ? 'Flood risk area detected nearby — check Environment Agency for full assessment'
                : 'No flood risk areas detected nearby';
              setPropertyData(prev => prev ? { ...prev, lat, lng, floodRisk } : null);
            }
          } catch { /* silent */ }
        })
        .catch(() => null);

      // Wait for all before clearing the loading spinner
      await Promise.all([epcFetch, landRegFetch, geoFloodFetch]);

    } catch (error) {
      console.error('Property lookup error:', error);
    } finally {
      setPropertyDataLoading(false);
    }
  };

  useEffect(() => {
    if (!propertyAddress.trim()) {
      setPropertyData(null);
      return;
    }
    detectTaxCountryFromPostcode(propertyAddress);
    const timer = setTimeout(() => {
      lookupPropertyData(propertyAddress);
    }, 800);
    return () => clearTimeout(timer);
  }, [propertyAddress]);

  useEffect(() => {
    if (document.getElementById('google-maps-script')) return;
    window.initGoogleMaps = () => {
      console.log('Google Maps loaded successfully');
    };
    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyDHLc76QjrniMh6ylFEofPiS_kESZ7_z7A&libraries=places&v=beta&region=GB&language=en&callback=initGoogleMaps`;
    script.async = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    const allDefaults = Object.values(DEFAULT_TIMELINE_STAGES);
    const currentJSON = JSON.stringify(timelineStages);
    const isStillDefault = allDefaults.some(def => JSON.stringify(def) === currentJSON);
    if (isStillDefault) {
      setTimelineStages(DEFAULT_TIMELINE_STAGES[dealType] ?? DEFAULT_TIMELINE_STAGES['BTL']);
    }
  }, [dealType]);

  const fetchAddressSuggestions = (input: string) => {
    if (!input || input.length < 3 || !window.google?.maps?.places) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const svc = new window.google.maps.places.AutocompleteService();
      svc.getPlacePredictions(
        { input, componentRestrictions: { country: 'gb' } },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            setAddressSuggestions(predictions.map(p => ({ description: p.description, placeId: p.place_id })));
            setShowSuggestions(true);
          } else {
            setAddressSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } catch (err) {
      console.error('Autocomplete error:', err);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: { description: string; placeId: string }) => {
    setShowSuggestions(false);
    setAddressSuggestions([]);
    setHighlightedIndex(-1);
    setPropertyAddress(suggestion.description);
    try {
      const svc = new window.google.maps.places.PlacesService(document.createElement('div'));
      svc.getDetails(
        { placeId: suggestion.placeId, fields: ['formatted_address', 'address_components', 'geometry'] },
        (result, status) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !result) return;
          let cleaned = (result.formatted_address || suggestion.description)
            .replace(/, UK$/, '')
            .replace(/, United Kingdom$/, '');
          const postcodeComp = result.address_components?.find(
            (c) => c.types.includes('postal_code')
          );
          const postcode = postcodeComp?.long_name || '';
          if (postcode && !cleaned.includes(postcode)) {
            cleaned = `${cleaned}, ${postcode}`;
          }
          // Store rooftop-level coords for use in subsequent flood lookup + distance calculations.
          // These are more accurate than the postcode-centroid coords postcodes.io returns.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const placesLat = (result.geometry as any)?.location?.lat?.();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const placesLng = (result.geometry as any)?.location?.lng?.();
          if (placesLat && placesLng) {
            subjectPlacesCoords.current = { lat: placesLat, lng: placesLng };
          }
          setPropertyAddress(cleaned);
          detectTaxCountryFromPostcode(cleaned);
          // Pre-populate property description skeleton if field is empty
          const postcodeArea = postcode.split(/\s+/)[0];
          if (postcodeArea) {
            setPropertyDescription((prev) => {
              if (prev.trim()) return prev;
              const parts: string[] = [];
              if (propertyType) parts.push(propertyType);
              if (tenure) parts.push(tenure);
              parts.push(`${postcodeArea} area`);
              return parts.join(', ') + '.';
            });
          }
        }
      );
    } catch {
      // Keep suggestion.description if PlacesService fails
    }
  };

  // ── Comparable row autocomplete helpers ─────────────────────────────────────
  // Mirrors the subject property autocomplete pattern; operates per-row by row.id.

  const fetchCompSuggestions = (rowId: string, input: string) => {
    if (!input || input.length < 3 || !window.google?.maps?.places) {
      setCompSuggestions(prev => ({ ...prev, [rowId]: [] }));
      setCompShowSuggestions(prev => ({ ...prev, [rowId]: false }));
      return;
    }
    try {
      const svc = new window.google.maps.places.AutocompleteService();
      svc.getPlacePredictions(
        { input, componentRestrictions: { country: 'gb' } },
        (predictions, status) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions && predictions.length > 0) {
            setCompSuggestions(prev => ({ ...prev, [rowId]: predictions.map(p => ({ description: p.description, placeId: p.place_id })) }));
            setCompShowSuggestions(prev => ({ ...prev, [rowId]: true }));
          } else {
            setCompSuggestions(prev => ({ ...prev, [rowId]: [] }));
            setCompShowSuggestions(prev => ({ ...prev, [rowId]: false }));
          }
        }
      );
    } catch (err) {
      console.error('Comparable autocomplete error:', err);
      setCompSuggestions(prev => ({ ...prev, [rowId]: [] }));
      setCompShowSuggestions(prev => ({ ...prev, [rowId]: false }));
    }
  };

  // Fetches EPC data for a comparable row and auto-fills floor area + property type if empty.
  // Only fires when matchStatus === 'matched'; no error is shown for no_match / no_certificate.
  const fetchCompEpc = (rowId: string, postcode: string, address: string) => {
    if (!postcode || !address) return;
    fetch(`/.netlify/functions/epc-lookup?postcode=${encodeURIComponent(postcode)}&address=${encodeURIComponent(address)}`)
      .then(r => r.json())
      .then(epc => {
        try {
          if (epc?.matchStatus !== 'matched' || !epc?.data) return;
          const cert = epc.data;
          const rawDwellingType = typeof cert.dwelling_type === 'string'
            ? cert.dwelling_type
            : (cert.dwelling_type as Record<string, unknown>)?.value as string ?? null;
          const epcPropertyType = rawDwellingType ? (EPC_TYPE_MAP[rawDwellingType] || null) : null;
          const floorArea = cert.total_floor_area != null ? Number(cert.total_floor_area) : null;
          setComparables(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            return {
              ...r,
              // Only fill if the field is currently empty — never overwrite a user-entered value
              ...(epcPropertyType && !r.propertyType ? { propertyType: epcPropertyType } : {}),
              ...(floorArea != null && r.floorArea === '' ? { floorArea } : {}),
            };
          }));
        } catch { /* silent */ }
      })
      .catch(() => null);
  };

  const selectCompSuggestion = (rowId: string, suggestion: { description: string; placeId: string }) => {
    setCompShowSuggestions(prev => ({ ...prev, [rowId]: false }));
    setCompSuggestions(prev => ({ ...prev, [rowId]: [] }));
    setCompHighlightedIndex(prev => ({ ...prev, [rowId]: -1 }));
    // Set address immediately from suggestion description while getDetails loads
    setComparables(prev => prev.map(r => r.id === rowId ? { ...r, address: suggestion.description } : r));
    try {
      const svc = new window.google.maps.places.PlacesService(document.createElement('div'));
      svc.getDetails(
        { placeId: suggestion.placeId, fields: ['formatted_address', 'address_components', 'geometry'] },
        (result, status) => {
          if (status !== window.google.maps.places.PlacesServiceStatus.OK || !result) return;
          let cleaned = (result.formatted_address || suggestion.description)
            .replace(/, UK$/, '')
            .replace(/, United Kingdom$/, '');
          const postcodeComp = result.address_components?.find(c => c.types.includes('postal_code'));
          const postcode = postcodeComp?.long_name || '';
          if (postcode && !cleaned.includes(postcode)) {
            cleaned = `${cleaned}, ${postcode}`;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const placesLat = (result.geometry as any)?.location?.lat?.();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const placesLng = (result.geometry as any)?.location?.lng?.();
          setComparables(prev => prev.map(r => {
            if (r.id !== rowId) return r;
            return {
              ...r,
              address: cleaned,
              ...(postcode ? { postcode } : {}),
              ...(placesLat && placesLng ? { lat: placesLat, lng: placesLng, geocodeFailed: false } : {}),
            };
          }));
          // Trigger EPC auto-fill now that we have a confirmed address + postcode
          if (postcode) fetchCompEpc(rowId, postcode, cleaned);
        }
      );
    } catch { /* silent — address already set from suggestion.description above */ }
  };
  // ────────────────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setPropertyAddress('');
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setPropertyType('Terraced');
    setTenure('Freehold');
    setAutoFilledPropertyType(false);
    setAutoFilledTenure(false);
    setUserSetTenure(false);
    setUserSetLeaseLength(false);
    setLeaseLengthYears(0);
    setSourcingFee(0);
    setSourcingFeeDisclaimer(null);
    setManualFloorArea('');
    setFloorAreaUnit('sqm');
    setProtectAddress(false);
    setProtectedAddressDescription('');
    setPaymentTermsExpanded(false);
    setPaymentTerms('');
    setMarketValue(0);
    setStrategyNotes({});
    setPropertyDescription('');
    setVendorSituation('');
    setComparables([]);
    setPhotoFiles([]);
    setHeroPhotoIndex(0);
    setExecutiveSummary({});
    setListingLinks([{ label: '', url: '' }]);
    setTaxCountry('ENGLAND');
    setBuyerType('ADDITIONAL');
    setTaxOverrideActive(false);
    setTaxOverrideEditing(false);
    setManualTaxValue(0);
    setStrategyOpen(false);
    setDealNotesOpen(false);
    setStressTestOpen(false);
    setShowWorkingsOpen(false);
    setIncludeWorkingsInPDF(false);
    setAreaAverageYield(0);
    setTimelineStages(DEFAULT_TIMELINE_STAGES[dealType] ?? DEFAULT_TIMELINE_STAGES['BTL']);
    setOfferDeadline('');
    setViewingAvailable(false);
    setRefurbScope('');
    setSharedInputs({ purchasePrice: 0, refurbCost: 0, otherCosts: 0, depositPercent: 25, mortgageRate: 0, mortgageTerm: 25, mortgageType: 'IO' });
    if (dealType === 'BTL') {
      setBtlInputs({ monthlyRent: 0 });
    } else if (dealType === 'HMO') {
      setHmoInputs({ rooms: 0, rentPerRoom: 0, occupancyRate: 90, licenceCost: 0 });
    } else if (dealType === 'FLIP') {
      setFlipInputs({ holdingCostsPerMonth: 0, projectLengthMonths: 0, expectedSalePrice: 0, sellingCostsPercent: 2, financingMethod: 'Bridging', contingencyPercent: 10, flipBridgingRate: 0, flipBridgingTermMonths: 0, flipBridgingLTV: 70, flipMortgageDeposit: 25, flipMortgageRate: 0, flipMortgageTerm: 25, flipMortgageType: 'IO' });
    } else if (dealType === 'SA') {
      setSaInputs({ nightlyRate: 0, occupancyPercent: 75, platformFeesPercent: 0 });
    } else if (dealType === 'BRRR') {
      setBrrrInputs({ postRefurbValue: 0, refinancePercent: 75, newMortgageRate: 0, monthlyRent: 0, bridgingRate: 0, bridgingTermMonths: 0, bridgingLTV: 70 });
    } else if (dealType === 'R2R') {
      setR2rInputs({ monthlyRentPaid: 0, rooms: 0, rentPerRoom: 0, occupancyRate: 90, managementFeesPercent: 0, monthlyRunningCosts: 0, setupCosts: 0, landlordDeposit: 0, sourcingFee: 0 });
    } else {
      setSocialInputs({ leaseIncomePerMonth: 0, leaseLengthYears: 0 });
    }
    setManagementFeePercent(10);
    setVoidAllowancePercent(5);
    setMaintenanceReserve(75);
    setBuildingsInsurance(30);
    setServiceCharge(0);
    setGroundRentAnnual(0);
    setPropertyData(null);
    setPropertyDataLoading(false);
    setPropertyDataOpen(true);
    setPdfOrientation('portrait');
    setBedrooms('');
    setBathrooms('');
    setRemainingLeaseYears('');
    setLeaseExtensionCost('');
    setIsCashBuyer(false);
    setIsUninhabitable(false);
    setIsAuctionPurchase(false);
    setAuctionDate('');
    setAuctionCompletionDate('');
    setBuyersPremiumPct('');
    setBuyersPremiumAmount('');
    setBuyersPremiumMode('pct');
    setAuctionReservationFee('');
  };

  const sharedTax = calculatePropertyTax(sharedInputs.purchasePrice, taxCountry, buyerType);
  const effectiveTax = taxOverrideActive ? manualTaxValue : sharedTax;
  const buyersPremiumValue = isAuctionPurchase
    ? (buyersPremiumMode === 'pct'
        ? sharedInputs.purchasePrice * (Number(buyersPremiumPct) || 0) / 100
        : Number(buyersPremiumAmount) || 0)
    : 0;
  const auctionReservationFeeValue = isAuctionPurchase ? (Number(auctionReservationFee) || 0) : 0;

  const { purchasePrice, refurbCost, otherCosts } = sharedInputs;
  const sharedCostInputs = { managementFeePercent, voidAllowancePercent, maintenanceReserve, buildingsInsurance, serviceCharge, groundRentAnnual };

  // Floor area & price-per-sq derived values
  const effectiveFloorAreaSqM = manualFloorArea !== ''
    ? (floorAreaUnit === 'sqft' ? Number(manualFloorArea) / 10.7639 : Number(manualFloorArea))
    : null;
  const effectiveFloorAreaSqFt = effectiveFloorAreaSqM != null ? effectiveFloorAreaSqM * 10.7639 : null;
  const pricePerSqFt = effectiveFloorAreaSqFt != null && effectiveFloorAreaSqFt > 0 && purchasePrice > 0
    ? purchasePrice / effectiveFloorAreaSqFt : null;
  const pricePerSqM = effectiveFloorAreaSqM != null && effectiveFloorAreaSqM > 0 && purchasePrice > 0
    ? purchasePrice / effectiveFloorAreaSqM : null;

  // SubjectContext for comparable scoring — rebuilt whenever any relevant subject field changes
  const subjectCtx = useMemo<SubjectContext>(() => {
    // Strategy-aware reference price per m² for sale comparable scoring:
    //   FLIP   → expected sale price (validates GDV, not entry price)
    //   BRRR   → post-refurb value (validates refinance basis)
    //   R2R    → null (no property purchase; sale comps score without this factor)
    //   others → purchase price (standard entry-price validation)
    const refPricePerSqM = (() => {
      if (dealType === 'R2R') return null;
      const fa = effectiveFloorAreaSqM;
      if (!fa || fa <= 0) return null;
      if (dealType === 'FLIP') {
        const esp = flipInputs.expectedSalePrice;
        return esp > 0 ? esp / fa : null;
      }
      if (dealType === 'BRRR') {
        const prv = brrrInputs.postRefurbValue;
        return prv > 0 ? prv / fa : null;
      }
      // BTL, HMO, SA, SOCIAL
      return purchasePrice > 0 ? purchasePrice / fa : null;
    })();

    return {
      propertyType,
      tenure,
      lat: propertyData?.lat ?? null,
      lng: propertyData?.lng ?? null,
      floorArea: effectiveFloorAreaSqM,
      bedrooms: bedrooms !== '' ? bedrooms : null,
      pricePerSqM: refPricePerSqM,
      dealType,
      monthlyRent: dealType === 'BTL' ? (btlInputs.monthlyRent || null)
                 : dealType === 'BRRR' ? (brrrInputs.monthlyRent || null)
                 : null,
      rentPerRoom: dealType === 'HMO' ? (hmoInputs.rentPerRoom || null)
                 : dealType === 'R2R' ? (r2rInputs.rentPerRoom || null)
                 : null,
      leaseIncomePerMonth: dealType === 'SOCIAL' ? (socialInputs.leaseIncomePerMonth || null) : null,
    };
  }, [propertyType, tenure, propertyData, effectiveFloorAreaSqM, bedrooms,
      dealType, purchasePrice, flipInputs, brrrInputs, btlInputs, hmoInputs, r2rInputs, socialInputs]);

  const btlResults = calculateBTL({ ...sharedInputs, ...btlInputs, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
  const { licenceCost: hmoLicenceCost, ...hmoInputsForCalc } = hmoInputs;
  const hmoResults = calculateHMO({ ...sharedInputs, ...hmoInputsForCalc, otherCosts: sharedInputs.otherCosts + hmoLicenceCost, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
  const { financingMethod, contingencyPercent, flipBridgingRate, flipBridgingTermMonths, flipBridgingLTV, flipMortgageDeposit, flipMortgageRate, flipMortgageTerm, flipMortgageType, ...flipInputsForCalc } = flipInputs;
  const flipBridgingInterest = financingMethod === 'Bridging' && flipBridgingRate > 0 && flipBridgingTermMonths > 0
    ? (purchasePrice * (flipBridgingLTV / 100)) * (flipBridgingRate / 100) * flipBridgingTermMonths
    : 0;
  const flipMortgageInterest = (() => {
    if (financingMethod !== 'Mortgage' || flipMortgageRate <= 0 || flipInputs.projectLengthMonths <= 0) return 0;
    const loan = purchasePrice * (1 - flipMortgageDeposit / 100);
    if (flipMortgageType === 'IO') return loan * (flipMortgageRate / 100 / 12) * flipInputs.projectLengthMonths;
    const r = flipMortgageRate / 100 / 12;
    const n = flipMortgageTerm * 12;
    const monthly = r > 0 ? loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan / n;
    return monthly * flipInputs.projectLengthMonths;
  })();
  const flipResults = calculateFlip({ purchasePrice, refurbCost: refurbCost * (1 + contingencyPercent / 100), otherCosts: otherCosts + flipBridgingInterest + flipMortgageInterest, stampDuty: effectiveTax, ...flipInputsForCalc, sourcingFee });
  const saResults = calculateSA({ ...sharedInputs, ...saInputs, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
  const { bridgingRate: brrBridgingRate, bridgingTermMonths: brrBridgingTerm, bridgingLTV: brrBridgingLTV, ...brrrInputsForCalc } = brrrInputs;
  const brrrBridgingInterest = purchasePrice > 0 && brrBridgingRate > 0 && brrBridgingTerm > 0
    ? (purchasePrice * (brrBridgingLTV / 100)) * (brrBridgingRate / 100) * brrBridgingTerm
    : 0;
  const brrrResults = calculateBRRR({ purchasePrice, refurbCost, otherCosts: otherCosts + brrrBridgingInterest, stampDuty: effectiveTax, ...brrrInputsForCalc, ...sharedCostInputs, sourcingFee });
  const r2rResults = calculateR2R({ ...r2rInputs, landlordDeposit: r2rInputs.monthlyRentPaid * r2rLandlordDepositMonths, sourcingFee });
  const socialResults = calculateSocialHousing({ ...sharedInputs, ...socialInputs, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });

  const optimalOffer = React.useMemo(() => {
    if (resultsMode[dealType] !== 'offer') return null;
    const extraCosts = (leaseExtensionCost === '' ? 0 : leaseExtensionCost as number) + buyersPremiumValue + auctionReservationFeeValue;
    const getStampDuty = (p: number) => taxOverrideActive ? manualTaxValue : calculatePropertyTax(p, taxCountry, buyerType);

    const solveBTLLike = (
      calcFn: (p: number, tax: number) => { annualCashFlow: number; monthlyCashFlow: number; totalCashInvested: number; grossYield: number },
      targetROI: number, targetCF: number, startP: number
    ) => {
      const maxFromROI = iterativeSolve(startP, p => {
        const r = calcFn(p, getStampDuty(p));
        const adj = r.totalCashInvested + extraCosts;
        return adj > 0 && (r.annualCashFlow / adj) * 100 >= targetROI;
      });
      const maxFromCF = iterativeSolve(startP, p => calcFn(p, getStampDuty(p)).monthlyCashFlow >= targetCF);
      let maxPrice: number | null = null;
      let binding = '';
      if (maxFromROI !== null && maxFromCF !== null) {
        if (maxFromROI <= maxFromCF) { maxPrice = maxFromROI; binding = 'ROI constraint'; }
        else { maxPrice = maxFromCF; binding = 'Cash flow constraint'; }
      } else if (maxFromROI !== null) { maxPrice = maxFromROI; binding = 'ROI constraint'; }
      else if (maxFromCF !== null) { maxPrice = maxFromCF; binding = 'Cash flow constraint'; }
      return { maxPrice, binding };
    };

    if (dealType === 'BTL') {
      const effBtlROI = optimiserTarget['BTL'] === 'cf' ? -999999 : btlOfferROI;
      const effBtlCF  = optimiserTarget['BTL'] === 'roi' ? -999999 : btlOfferCF;
      const startP = sharedInputs.purchasePrice > 0 ? sharedInputs.purchasePrice : 500000;
      if (sharedInputs.purchasePrice > 0) {
        const adjI = btlResults.totalCashInvested + extraCosts;
        const adjROI = adjI > 0 ? (btlResults.annualCashFlow / adjI) * 100 : 0;
        if (adjROI >= effBtlROI && btlResults.monthlyCashFlow >= effBtlCF)
          return { type: 'already_meets' as const, currentROI: adjROI, currentCF: btlResults.monthlyCashFlow, currentYield: btlResults.grossYield };
      }
      const calcFn = (p: number, tax: number) => calculateBTL({ ...sharedInputs, purchasePrice: p, stampDuty: tax, ...btlInputs, ...sharedCostInputs, sourcingFee });
      const { maxPrice, binding } = solveBTLLike(calcFn, effBtlROI, effBtlCF, startP);
      if (!maxPrice) return { type: 'no_solution' as const };
      const r = calcFn(maxPrice, getStampDuty(maxPrice));
      return { type: 'found' as const, maxPrice, binding, achievedROI: (r.annualCashFlow / (r.totalCashInvested + extraCosts)) * 100, achievedCF: r.monthlyCashFlow, achievedYield: r.grossYield, gap: sharedInputs.purchasePrice - maxPrice };
    }

    if (dealType === 'HMO') {
      const effHmoROI = optimiserTarget['HMO'] === 'cf' ? -999999 : hmoOfferROI;
      const effHmoCF  = optimiserTarget['HMO'] === 'roi' ? -999999 : hmoOfferCF;
      const startP = sharedInputs.purchasePrice > 0 ? sharedInputs.purchasePrice : 600000;
      const annualRent = hmoInputs.rooms * hmoInputs.rentPerRoom * (hmoInputs.occupancyRate / 100) * 12;
      if (sharedInputs.purchasePrice > 0) {
        const adjI = hmoResults.totalCashInvested + extraCosts;
        const adjROI = adjI > 0 ? (hmoResults.annualCashFlow / adjI) * 100 : 0;
        const yld = sharedInputs.purchasePrice > 0 ? annualRent / sharedInputs.purchasePrice * 100 : 0;
        if (adjROI >= effHmoROI && hmoResults.monthlyCashFlow >= effHmoCF)
          return { type: 'already_meets' as const, currentROI: adjROI, currentCF: hmoResults.monthlyCashFlow, currentYield: yld };
      }
      const calcFn = (p: number, tax: number) => calculateHMO({ ...sharedInputs, purchasePrice: p, stampDuty: tax, ...hmoInputs, ...sharedCostInputs, sourcingFee });
      const { maxPrice: maxROICF, binding: b1 } = solveBTLLike(calcFn, effHmoROI, effHmoCF, startP);
      const maxFromYield: number | null = null;
      let maxPrice = maxROICF;
      let binding = b1;
      if (maxFromYield !== null && (maxPrice === null || maxFromYield < maxPrice)) { maxPrice = maxFromYield; binding = 'Gross yield constraint'; }
      if (!maxPrice) return { type: 'no_solution' as const };
      const r = calcFn(maxPrice, getStampDuty(maxPrice));
      return { type: 'found' as const, maxPrice, binding, achievedROI: (r.annualCashFlow / (r.totalCashInvested + extraCosts)) * 100, achievedCF: r.monthlyCashFlow, achievedYield: r.grossYield, gap: sharedInputs.purchasePrice - maxPrice };
    }

    if (dealType === 'FLIP') {
      const gdv = flipInputs.expectedSalePrice;
      if (gdv <= 0) return { type: 'no_solution' as const };
      const sellingCosts = gdv * (flipInputs.sellingCostsPercent / 100);
      const holding = flipInputs.holdingCostsPerMonth * flipInputs.projectLengthMonths;
      const fixedCosts = sharedInputs.refurbCost + sharedInputs.otherCosts + holding + buyersPremiumValue + auctionReservationFeeValue;
      const getMetrics = (p: number) => {
        const tax = getStampDuty(p);
        const totalCost = p + tax + fixedCosts;
        const profit = gdv - sellingCosts - totalCost;
        return { totalCost, profit, margin: totalCost > 0 ? (profit / totalCost) * 100 : 0 };
      };
      const startP = sharedInputs.purchasePrice > 0 ? sharedInputs.purchasePrice : Math.round(gdv * 0.7 / 1000) * 1000;
      const effFlipMargin    = optimiserTarget['FLIP'] === 'cf' ? -999999 : flipOfferMargin;
      const effFlipMinProfit = optimiserTarget['FLIP'] === 'roi' ? -999999 : flipOfferMinProfit;
      if (sharedInputs.purchasePrice > 0) {
        const m = getMetrics(sharedInputs.purchasePrice);
        if (m.margin >= effFlipMargin && m.profit >= effFlipMinProfit)
          return { type: 'already_meets' as const, currentROI: m.margin, currentCF: m.profit / Math.max(flipInputs.projectLengthMonths, 1), currentYield: 0 };
      }
      const maxFromMargin = iterativeSolve(startP, p => getMetrics(p).margin >= effFlipMargin);
      const maxFromMinProfit = iterativeSolve(startP, p => getMetrics(p).profit >= effFlipMinProfit);
      let maxPrice: number | null = null;
      let binding = '';
      if (maxFromMargin !== null && maxFromMinProfit !== null) {
        if (maxFromMargin <= maxFromMinProfit) { maxPrice = maxFromMargin; binding = 'Margin constraint'; }
        else { maxPrice = maxFromMinProfit; binding = 'Minimum profit floor'; }
      } else if (maxFromMargin !== null) { maxPrice = maxFromMargin; binding = 'Margin constraint'; }
      else if (maxFromMinProfit !== null) { maxPrice = maxFromMinProfit; binding = 'Minimum profit floor'; }
      if (!maxPrice) return { type: 'no_solution' as const };
      const m = getMetrics(maxPrice);
      return { type: 'found' as const, maxPrice, binding, achievedROI: m.margin, achievedCF: m.profit / Math.max(flipInputs.projectLengthMonths, 1), achievedYield: 0, gap: sharedInputs.purchasePrice - maxPrice };
    }

    if (dealType === 'BRRR') {
      const prv = brrrInputs.postRefurbValue;
      if (prv <= 0) return { type: 'no_solution' as const };
      const refinanceLoan = prv * (brrrInputs.refinancePercent / 100);
      const fixedCosts = sharedInputs.refurbCost + sharedInputs.otherCosts + (leaseExtensionCost === '' ? 0 : leaseExtensionCost as number) + buyersPremiumValue + auctionReservationFeeValue;
      const totalCostIn = (p: number) => p + getStampDuty(p) + fixedCosts;
      const startP = sharedInputs.purchasePrice > 0 ? sharedInputs.purchasePrice : prv;
      if (sharedInputs.purchasePrice > 0) {
        const tc = totalCostIn(sharedInputs.purchasePrice);
        if (tc <= refinanceLoan && tc - refinanceLoan <= brrrOfferCashLeft)
          return { type: 'already_meets' as const, currentROI: brrrResults.cashOnCashROI, currentCF: brrrResults.monthlyCashFlow, currentYield: brrrResults.grossYield };
      }
      const maxFrom75 = iterativeSolve(startP, p => totalCostIn(p) <= refinanceLoan);
      const maxFromCL = iterativeSolve(startP, p => (totalCostIn(p) - refinanceLoan) <= brrrOfferCashLeft);
      let maxPrice: number | null = null;
      let binding = '';
      if (maxFrom75 !== null && maxFromCL !== null) {
        if (maxFrom75 <= maxFromCL) { maxPrice = maxFrom75; binding = '75% refinance rule'; }
        else { maxPrice = maxFromCL; binding = `Cash left in ≤ ${formatCurrency(brrrOfferCashLeft)}`; }
      } else if (maxFrom75 !== null) { maxPrice = maxFrom75; binding = '75% refinance rule'; }
      else if (maxFromCL !== null) { maxPrice = maxFromCL; binding = `Cash left in ≤ ${formatCurrency(brrrOfferCashLeft)}`; }
      if (!maxPrice) return { type: 'no_solution' as const };
      const cashLeft = totalCostIn(maxPrice) - refinanceLoan;
      return { type: 'found' as const, maxPrice, binding, achievedROI: brrrResults.cashOnCashROI, achievedCF: brrrResults.monthlyCashFlow, achievedYield: brrrResults.grossYield, gap: sharedInputs.purchasePrice - maxPrice, brrrCashLeft: cashLeft };
    }

    if (dealType === 'SA') {
      const effSaROI    = optimiserTarget['SA'] === 'cf' ? -999999 : saOfferROI;
      const effSaProfit = optimiserTarget['SA'] === 'roi' ? -999999 : saOfferProfit;
      const startP = sharedInputs.purchasePrice > 0 ? sharedInputs.purchasePrice : 400000;
      if (sharedInputs.purchasePrice > 0) {
        const adjI = saResults.totalCashInvested + extraCosts;
        const adjROI = adjI > 0 ? (saResults.annualCashFlow / adjI) * 100 : 0;
        if (adjROI >= effSaROI && saResults.monthlyCashFlow >= effSaProfit)
          return { type: 'already_meets' as const, currentROI: adjROI, currentCF: saResults.monthlyCashFlow, currentYield: saResults.netYield };
      }
      const calcFn = (p: number, tax: number) => calculateSA({ ...sharedInputs, purchasePrice: p, stampDuty: tax, ...saInputs, occupancyPercent: saOfferOccupancy, ...sharedCostInputs, sourcingFee });
      const { maxPrice, binding } = solveBTLLike(calcFn, effSaROI, effSaProfit, startP);
      if (!maxPrice) return { type: 'no_solution' as const };
      const r = calcFn(maxPrice, getStampDuty(maxPrice));
      return { type: 'found' as const, maxPrice, binding, achievedROI: (r.annualCashFlow / (r.totalCashInvested + extraCosts)) * 100, achievedCF: r.monthlyCashFlow, achievedYield: r.netYield, gap: sharedInputs.purchasePrice - maxPrice };
    }

    if (dealType === 'R2R') {
      const gross = r2rInputs.rooms * r2rInputs.rentPerRoom * (r2rInputs.occupancyRate / 100);
      const mgmt = gross * (r2rInputs.managementFeesPercent / 100);
      const net = gross - mgmt;
      const maxLandlordRent = net - r2rOfferProfit - r2rInputs.monthlyRunningCosts;
      const maxSetupCosts = r2rOfferROI > 0 ? (r2rOfferProfit * 12) / (r2rOfferROI / 100) : 0;
      const r2rAlreadyMeets = optimiserTarget['R2R'] === 'roi'
        ? (r2rInputs.setupCosts <= 0 || r2rResults.roi >= r2rOfferROI)
        : r2rResults.monthlyProfit >= r2rOfferProfit;
      if (r2rAlreadyMeets)
        return { type: 'already_meets' as const, currentROI: r2rResults.roi, currentCF: r2rResults.monthlyProfit, currentYield: r2rResults.grossYield };
      return { type: 'r2r' as const, maxLandlordRent, maxSetupCosts, currentLandlordRent: r2rInputs.monthlyRentPaid };
    }

    if (dealType === 'SOCIAL') {
      const effSocialROI = optimiserTarget['SOCIAL'] === 'cf' ? -999999 : socialOfferROI;
      const effSocialCF  = optimiserTarget['SOCIAL'] === 'roi' ? -999999 : socialOfferCF;
      const startP = sharedInputs.purchasePrice > 0 ? sharedInputs.purchasePrice : 300000;
      if (sharedInputs.purchasePrice > 0) {
        const adjI = socialResults.totalCashInvested + extraCosts;
        const adjROI = adjI > 0 ? (socialResults.annualCashFlow / adjI) * 100 : 0;
        if (adjROI >= effSocialROI && socialResults.monthlyCashFlow >= effSocialCF)
          return { type: 'already_meets' as const, currentROI: adjROI, currentCF: socialResults.monthlyCashFlow, currentYield: socialResults.grossYield };
      }
      const calcFn = (p: number, tax: number) => calculateSocialHousing({ ...sharedInputs, purchasePrice: p, stampDuty: tax, ...socialInputs, ...sharedCostInputs, sourcingFee });
      const { maxPrice, binding } = solveBTLLike(calcFn, effSocialROI, effSocialCF, startP);
      if (!maxPrice) return { type: 'no_solution' as const };
      const r = calcFn(maxPrice, getStampDuty(maxPrice));
      return { type: 'found' as const, maxPrice, binding, achievedROI: (r.annualCashFlow / (r.totalCashInvested + extraCosts)) * 100, achievedCF: r.monthlyCashFlow, achievedYield: r.grossYield, gap: sharedInputs.purchasePrice - maxPrice };
    }

    return null;
  }, [dealType, resultsMode, optimiserTarget, sharedInputs, btlInputs, hmoInputs, flipInputs, saInputs, brrrInputs, r2rInputs, socialInputs, sharedCostInputs, taxCountry, taxOverrideActive, manualTaxValue, buyerType, btlResults, hmoResults, saResults, brrrResults, r2rResults, socialResults, leaseExtensionCost, buyersPremiumValue, auctionReservationFeeValue, btlOfferROI, btlOfferCF, hmoOfferROI, hmoOfferCF, hmoOfferYield, flipOfferMargin, flipOfferMinProfit, brrrOfferCashLeft, saOfferROI, saOfferProfit, saOfferOccupancy, r2rOfferProfit, r2rOfferROI, socialOfferROI, socialOfferCF]);

  const stressSupported = dealType === 'BTL' || dealType === 'HMO' || dealType === 'SA' || dealType === 'BRRR' || dealType === 'SOCIAL';

  const stressRentDown = (() => {
    if (dealType === 'BTL') {
      const r = calculateBTL({ ...sharedInputs, ...btlInputs, monthlyRent: btlInputs.monthlyRent * 0.9, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'HMO') {
      const r = calculateHMO({ ...sharedInputs, ...hmoInputs, rentPerRoom: hmoInputs.rentPerRoom * 0.9, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'SA') {
      const r = calculateSA({ ...sharedInputs, ...saInputs, nightlyRate: saInputs.nightlyRate * 0.9, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'BRRR') {
      const r = calculateBRRR({ purchasePrice, refurbCost, otherCosts, stampDuty: effectiveTax, ...brrrInputs, monthlyRent: brrrInputs.monthlyRent * 0.9, ...sharedCostInputs, sourcingFee });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'SOCIAL') {
      const r = calculateSocialHousing({ ...sharedInputs, ...socialInputs, leaseIncomePerMonth: socialInputs.leaseIncomePerMonth * 0.9, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    return { monthlyCashFlow: 0, cashOnCashROI: 0 };
  })();

  const stressRateUp = (() => {
    if (dealType === 'BTL') {
      const r = calculateBTL({ ...sharedInputs, ...btlInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'HMO') {
      const r = calculateHMO({ ...sharedInputs, ...hmoInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'SA') {
      const r = calculateSA({ ...sharedInputs, ...saInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'BRRR') {
      const r = calculateBRRR({ purchasePrice, refurbCost, otherCosts, stampDuty: effectiveTax, ...brrrInputs, newMortgageRate: brrrInputs.newMortgageRate + 1.5, ...sharedCostInputs, sourcingFee });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'SOCIAL') {
      const r = calculateSocialHousing({ ...sharedInputs, ...socialInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: effectiveTax, ...sharedCostInputs, sourcingFee });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    return { monthlyCashFlow: 0, cashOnCashROI: 0 };
  })();

  const taxLabel = TAX_LABEL[taxCountry];
  const buyerLabel = BUYER_LABEL[buyerType];

  const currentPurchasePrice = dealType === 'R2R' ? 0 : sharedInputs.purchasePrice;
  const equityDayOne = marketValue - currentPurchasePrice;
  const bmvAmount = equityDayOne;
  const bmvPercent = marketValue > 0 ? (bmvAmount / marketValue) * 100 : 0;

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  function getCFSignal(cf: number, incomplete: boolean) {
    if (incomplete) return { colour: '#94A3B8', label: 'INCOMPLETE' };
    if (cf > 0) return { colour: '#10B981', label: 'POSITIVE' };
    if (cf < 0) return { colour: '#EF4444', label: 'NEGATIVE' };
    return { colour: '#94A3B8', label: 'INCOMPLETE' };
  }
  function getROISignal(score: string, incomplete: boolean) {
    if (incomplete || score === 'Incomplete') return { colour: '#94A3B8', label: 'INCOMPLETE' };
    if (score === 'Strong') return { colour: '#10B981', label: 'RECOMMENDED' };
    if (score === 'Average') return { colour: '#F59E0B', label: 'REVIEW' };
    return { colour: '#EF4444', label: 'AVOID' };
  }
  function getDealScoreSignal(score: string) {
    if (score === 'Incomplete') return { colour: '#94A3B8', label: 'INCOMPLETE' };
    if (score === 'Strong') return { colour: '#10B981', label: 'RECOMMENDED' };
    if (score === 'Average') return { colour: '#F59E0B', label: 'REVIEW' };
    return { colour: '#EF4444', label: 'AVOID' };
  }

  const dealLabel =
    dealType === 'BTL' ? 'Buy-to-Let' :
    dealType === 'HMO' ? 'HMO' :
    dealType === 'FLIP' ? 'Flip / Refurb' :
    dealType === 'SA' ? 'Serviced Accommodation' :
    dealType === 'BRRR' ? 'BRRR' :
    dealType === 'R2R' ? 'Rent to Rent' :
    'Social Housing';

  const currentScore =
    dealType === 'BTL' ? btlResults.score :
    dealType === 'HMO' ? hmoResults.score :
    dealType === 'FLIP' ? flipResults.score :
    dealType === 'SA' ? saResults.score :
    dealType === 'BRRR' ? brrrResults.score :
    dealType === 'R2R' ? r2rResults.score :
    socialResults.score;

  React.useEffect(() => {
    if (currentScore !== 'Incomplete') setHasAnalysed(true);
  }, [currentScore]);

  const currentMonthlyCF: number =
    dealType === 'BTL' ? btlResults.monthlyCashFlow :
    dealType === 'HMO' ? hmoResults.monthlyCashFlow :
    dealType === 'SA' ? saResults.monthlyCashFlow :
    dealType === 'BRRR' ? brrrResults.monthlyCashFlow :
    dealType === 'SOCIAL' ? socialResults.monthlyCashFlow :
    dealType === 'FLIP' ? flipResults.profitPerMonth :
    r2rResults.monthlyProfit;

  const missingFields = React.useMemo(() => {
    const missing: string[] = [];
    if (dealType === 'BTL') {
      if (!(purchasePrice > 0)) missing.push('Purchase Price');
      if (!(btlInputs.monthlyRent > 0)) missing.push('Monthly Rent');
      if (!isCashBuyer && !(sharedInputs.mortgageRate > 0)) missing.push('Mortgage Rate');
      if (!isCashBuyer && !(sharedInputs.depositPercent > 0)) missing.push('Deposit %');
    } else if (dealType === 'HMO') {
      if (!(purchasePrice > 0)) missing.push('Purchase Price');
      if (!(hmoInputs.rooms > 0)) missing.push('Number of Rooms');
      if (!(hmoInputs.rentPerRoom > 0)) missing.push('Rent Per Room');
      if (!isCashBuyer && !(sharedInputs.mortgageRate > 0)) missing.push('Mortgage Rate');
      if (!isCashBuyer && !(sharedInputs.depositPercent > 0)) missing.push('Deposit %');
    } else if (dealType === 'FLIP') {
      if (!(purchasePrice > 0)) missing.push('Purchase Price');
      if (!(flipInputs.expectedSalePrice > 0)) missing.push('Expected Sale Price');
      if (!(sharedInputs.refurbCost > 0)) missing.push('Refurb Cost');
    } else if (dealType === 'SA') {
      if (!(purchasePrice > 0)) missing.push('Purchase Price');
      if (!(saInputs.nightlyRate > 0)) missing.push('Nightly Rate');
      if (!(saInputs.occupancyPercent > 0)) missing.push('Occupancy %');
      if (!isCashBuyer && !(sharedInputs.mortgageRate > 0)) missing.push('Mortgage Rate');
      if (!isCashBuyer && !(sharedInputs.depositPercent > 0)) missing.push('Deposit %');
    } else if (dealType === 'BRRR') {
      if (!(purchasePrice > 0)) missing.push('Purchase Price');
      if (!(brrrInputs.postRefurbValue > 0)) missing.push('Post-Refurb Value');
      if (!(brrrInputs.refinancePercent > 0)) missing.push('Refinance %');
      if (!(brrrInputs.monthlyRent > 0)) missing.push('Monthly Rent');
      if (!(brrrInputs.newMortgageRate > 0)) missing.push('New Mortgage Rate');
    } else if (dealType === 'R2R') {
      if (!(r2rInputs.monthlyRentPaid > 0)) missing.push('Rent to Landlord');
      if (!(r2rInputs.rooms > 0)) missing.push('Number of Rooms');
      if (!(r2rInputs.rentPerRoom > 0)) missing.push('Rent Per Room');
      if (!(r2rInputs.setupCosts > 0)) missing.push('Setup Costs');
    } else {
      if (!(purchasePrice > 0)) missing.push('Purchase Price');
      if (!(socialInputs.leaseIncomePerMonth > 0)) missing.push('Lease Income');
      if (!isCashBuyer && !(sharedInputs.mortgageRate > 0)) missing.push('Mortgage Rate');
      if (!isCashBuyer && !(sharedInputs.depositPercent > 0)) missing.push('Deposit %');
    }
    return missing;
  }, [dealType, sharedInputs, btlInputs, hmoInputs, flipInputs, saInputs, brrrInputs, r2rInputs, socialInputs, isCashBuyer, purchasePrice]);

  const currentYieldLabel: string =
    dealType === 'FLIP' ? 'Net Margin' :
    dealType === 'SA' ? 'Net Yield' :
    'Gross Yield';

  const currentYieldValue: string =
    dealType === 'BTL' ? formatPercent(btlResults.grossYield) :
    dealType === 'HMO' ? formatPercent(hmoResults.grossYield) :
    dealType === 'SA' ? formatPercent(saResults.netYield) :
    dealType === 'BRRR' ? formatPercent(brrrResults.grossYield) :
    dealType === 'SOCIAL' ? formatPercent(socialResults.grossYield) :
    dealType === 'FLIP' ? formatPercent(flipResults.roi) :
    formatPercent(r2rResults.grossYield);

  const currentROILabel: string =
    dealType === 'FLIP' ? 'Ann. ROI' :
    dealType === 'R2R' ? 'ROI' :
    'CoC ROI';

  const currentROIValue: string =
    dealType === 'BTL' ? formatPercent(btlResults.cashOnCashROI) :
    dealType === 'HMO' ? formatPercent(hmoResults.cashOnCashROI) :
    dealType === 'SA' ? formatPercent(saResults.cashOnCashROI) :
    dealType === 'BRRR' ? (brrrResults.moneyOut ? '∞' : formatPercent(brrrResults.cashOnCashROI)) :
    dealType === 'SOCIAL' ? formatPercent(socialResults.cashOnCashROI) :
    dealType === 'FLIP' ? formatPercent(flipResults.annualisedROI) :
    formatPercent(r2rResults.roi);

  const currentCashInLabel: string =
    dealType === 'FLIP' ? 'Total Cost' :
    dealType === 'R2R' ? 'Cash Invested' :
    'Cash In';

  const liveBarCashInLabel: string =
    dealType === 'FLIP' ? 'Total Cost' :
    dealType === 'R2R' ? 'Cash Invested' :
    'Cash In';

  const currentCashInValue: number =
    dealType === 'BTL' ? btlResults.totalCashInvested :
    dealType === 'HMO' ? hmoResults.totalCashInvested :
    dealType === 'SA' ? saResults.totalCashInvested :
    dealType === 'BRRR' ? brrrResults.cashLeftInDeal :
    dealType === 'SOCIAL' ? socialResults.totalCashInvested :
    dealType === 'FLIP' ? flipResults.totalCost :
    r2rResults.totalCashInvested;

  const currentCFLabel: string =
    dealType === 'FLIP' ? 'Profit/mo' :
    dealType === 'R2R' ? 'Monthly Profit' :
    'Cash Flow';

  const handleGenerateSummary = async () => {
    setAiGenerating(true);
    try {
      const currentResults =
        dealType === 'BTL' ? { grossYield: formatPercent(btlResults.grossYield), cashFlow: btlResults.monthlyCashFlow, roi: formatPercent(btlResults.cashOnCashROI) } :
        dealType === 'HMO' ? { grossYield: formatPercent(hmoResults.grossYield), cashFlow: hmoResults.monthlyCashFlow, roi: formatPercent(hmoResults.cashOnCashROI) } :
        dealType === 'FLIP' ? { grossYield: formatPercent(flipResults.roi), cashFlow: flipResults.profitPerMonth, roi: formatPercent(flipResults.annualisedROI) } :
        dealType === 'SA' ? { grossYield: formatPercent(saResults.netYield), cashFlow: saResults.monthlyCashFlow, roi: formatPercent(saResults.cashOnCashROI) } :
        dealType === 'BRRR' ? { grossYield: formatPercent(brrrResults.grossYield), cashFlow: brrrResults.monthlyCashFlow, roi: brrrResults.moneyOut ? '∞ (money out)' : formatPercent(brrrResults.cashOnCashROI) } :
        dealType === 'R2R' ? { grossYield: formatPercent(r2rResults.grossYield), cashFlow: r2rResults.monthlyProfit, roi: formatPercent(r2rResults.roi) } :
        { grossYield: formatPercent(socialResults.grossYield), cashFlow: socialResults.monthlyCashFlow, roi: formatPercent(socialResults.cashOnCashROI) };

      const response = await fetch('/.netlify/functions/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: propertyAddress,
          strategy: dealLabel,
          purchasePrice: sharedInputs.purchasePrice,
          grossYield: currentResults.grossYield,
          cashFlow: currentResults.cashFlow,
          roi: currentResults.roi,
          dealScore: currentScore,
          whyThisStrategy: strategyNotes[dealType] ?? '',
        }),
      });

      const data = await response.json() as { summary?: string; error?: string };
      const summary = data.summary?.trim() ?? '';
      if (summary) {
        setExecutiveSummary((prev) => ({ ...prev, [dealType]: summary }));
        const newCount = aiGenCount + 1;
        setAiGenCount(newCount);
        localStorage.setItem('ds_ai_gen_count', String(newCount));
      }
    } catch {
      // silent fail
    } finally {
      setAiGenerating(false);
    }
  };

  const handleGenerateStrategy = async () => {
    setStrategyAiGenerating(true);
    try {
      const currentResults =
        dealType === 'BTL' ? { grossYield: formatPercent(btlResults.grossYield), cashFlow: btlResults.monthlyCashFlow, roi: formatPercent(btlResults.cashOnCashROI) } :
        dealType === 'HMO' ? { grossYield: formatPercent(hmoResults.grossYield), cashFlow: hmoResults.monthlyCashFlow, roi: formatPercent(hmoResults.cashOnCashROI) } :
        dealType === 'FLIP' ? { grossYield: formatPercent(flipResults.roi), cashFlow: flipResults.profitPerMonth, roi: formatPercent(flipResults.annualisedROI) } :
        dealType === 'SA' ? { grossYield: formatPercent(saResults.netYield), cashFlow: saResults.monthlyCashFlow, roi: formatPercent(saResults.cashOnCashROI) } :
        dealType === 'BRRR' ? { grossYield: formatPercent(brrrResults.grossYield), cashFlow: brrrResults.monthlyCashFlow, roi: brrrResults.moneyOut ? '∞ (money out)' : formatPercent(brrrResults.cashOnCashROI) } :
        dealType === 'R2R' ? { grossYield: formatPercent(r2rResults.grossYield), cashFlow: r2rResults.monthlyProfit, roi: formatPercent(r2rResults.roi) } :
        { grossYield: formatPercent(socialResults.grossYield), cashFlow: socialResults.monthlyCashFlow, roi: formatPercent(socialResults.cashOnCashROI) };

      const response = await fetch('/.netlify/functions/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: propertyAddress,
          strategy: dealLabel,
          purchasePrice: sharedInputs.purchasePrice,
          grossYield: currentResults.grossYield,
          cashFlow: currentResults.cashFlow,
          roi: currentResults.roi,
          dealScore: currentScore,
          bmvPercent,
          promptType: 'strategy',
        }),
      });

      const data = await response.json() as { summary?: string; error?: string };
      const result = data.summary?.trim() ?? '';
      if (result) {
        setStrategyNotes(prev => ({ ...prev, [dealType]: result }));
        const newCount = aiGenCount + 1;
        setAiGenCount(newCount);
        localStorage.setItem('ds_ai_gen_count', String(newCount));
      }
    } catch {
      // silent fail
    } finally {
      setStrategyAiGenerating(false);
    }
  };

  const floodDetected = !!(propertyData?.floodRisk && propertyData.floodRisk.includes('detected') && !propertyData.floodRisk.includes('No'));
  const leaseholdWarning = tenure === 'Leasehold' && leaseLengthYears > 0 && leaseLengthYears < 85;

  const currentRiskFlags: string[] = (() => {
    const flags: (string | null)[] = [];
    if (dealType === 'BTL') {
      flags.push(leaseholdWarning ? '⚠️ Leasehold under 85 years — most lenders will not mortgage this property' : null);
      flags.push(sharedInputs.purchasePrice > 0 && btlResults.monthlyCashFlow < 0 ? '⚠️ Negative cash flow — review rent or mortgage assumptions' : null);
      flags.push(sharedInputs.purchasePrice > 0 && btlResults.grossYield < 5 && btlResults.grossYield > 0 ? '⚠️ Gross yield below 5% — may not meet lender stress tests' : null);
      flags.push(floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
    } else if (dealType === 'HMO') {
      flags.push(leaseholdWarning ? '⚠️ Leasehold under 85 years — most lenders will not mortgage this property' : null);
      flags.push(sharedInputs.purchasePrice > 0 && hmoResults.monthlyCashFlow < 0 ? '⚠️ Negative cash flow — review room rates or costs' : null);
      flags.push(floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
    } else if (dealType === 'FLIP') {
      flags.push(leaseholdWarning ? '⚠️ Leasehold under 85 years — most lenders will not mortgage this property' : null);
      flags.push(sharedInputs.purchasePrice > 0 && flipResults.netProfit < 0 ? '⚠️ Deal shows a net loss — review costs or expected sale price' : null);
      flags.push(floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
    } else if (dealType === 'SA') {
      flags.push(leaseholdWarning
        ? (saResults.score === 'Strong' || saResults.score === 'Average'
          ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
          : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property')
        : null);
      flags.push(sharedInputs.purchasePrice > 0 && saResults.monthlyCashFlow < 0 ? '⚠️ Negative cash flow — review nightly rate or occupancy assumptions' : null);
      flags.push(sharedInputs.purchasePrice > 0 && saInputs.occupancyPercent < 60 ? `⚠️ Occupancy at ${saInputs.occupancyPercent}% — most SA deals require 70%+ to stack.` : null);
      flags.push(floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
    } else if (dealType === 'BRRR') {
      flags.push(leaseholdWarning
        ? (brrrResults.score === 'Strong' || brrrResults.score === 'Average'
          ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
          : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property')
        : null);
      flags.push(sharedInputs.purchasePrice > 0 && brrrResults.monthlyCashFlow < 0 ? '⚠️ Negative cash flow after refinance — deal does not self-fund' : null);
      flags.push(sharedInputs.purchasePrice > 0 && brrrResults.cashLeftInDeal > 25000 ? `⚠️ £${Math.round(brrrResults.cashLeftInDeal).toLocaleString()} left in deal — over £25,000 tied up limits your ability to repeat the strategy.` : null);
      flags.push(floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
    } else if (dealType === 'R2R') {
      flags.push(r2rInputs.setupCosts > 0 && r2rResults.monthlyProfit < 200
        ? (r2rResults.score === 'Average'
          ? `⚠️ Monthly profit at £${Math.round(r2rResults.monthlyProfit).toLocaleString()} — thin margin for R2R.`
          : '⚠️ Monthly profit below £200 — does not meet typical R2R threshold.')
        : null);
      flags.push(floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
    } else {
      flags.push(leaseholdWarning
        ? (socialResults.score === 'Strong' || socialResults.score === 'Average'
          ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
          : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property')
        : null);
      flags.push(sharedInputs.purchasePrice > 0 && socialResults.monthlyCashFlow < 0 ? '⚠️ Negative cash flow — lease income does not cover mortgage and costs' : null);
      flags.push(floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
    }
    return flags.filter(Boolean) as string[];
  })();

  const handlePreviewIOS = async () => {
    setIosGenerating(true);
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const IosComponent = pdfProps.tierOverride === 'pro_plus' && pdfOrientation === 'landscape' ? DealScorePDFProPlus : DealScorePDF;
      const blob = await pdf(<IosComponent {...pdfProps} />).toBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error('PDF generation error:', e);
    } finally {
      setIosGenerating(false);
    }
  };

  const pdfProps = useMemo<DealScorePDFProps>(() => {
    const _effectiveTax = taxOverrideActive
      ? manualTaxValue
      : calculatePropertyTax(sharedInputs.purchasePrice, taxCountry, buyerType);
    const _taxLabel = TAX_LABEL[taxCountry];
    const _buyerLabel = BUYER_LABEL[buyerType];

    const _sharedCostInputs = { managementFeePercent, voidAllowancePercent, maintenanceReserve, buildingsInsurance, serviceCharge, groundRentAnnual };
    const _btlResults = calculateBTL({ ...sharedInputs, ...btlInputs, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
    const { licenceCost: _hmoLicenceCost, ...hmoInputsForPdfCalc } = hmoInputs;
    const _hmoResults = calculateHMO({ ...sharedInputs, ...hmoInputsForPdfCalc, otherCosts: sharedInputs.otherCosts + _hmoLicenceCost, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
    const { financingMethod: _pdfFlipFM, contingencyPercent: _pdfFlipCP, flipBridgingRate: _pdfFlipBridgingRate, flipBridgingTermMonths: _pdfFlipBridgingTerm, flipBridgingLTV: _pdfFlipBridgingLTV, flipMortgageDeposit: _pdfFlipMortgageDeposit, flipMortgageRate: _pdfFlipMortgageRate, flipMortgageTerm: _pdfFlipMortgageTerm, flipMortgageType: _pdfFlipMortgageType, ...pdfFlipCalcInputs } = flipInputs;
    const _flipBridgingInterest = _pdfFlipFM === 'Bridging' && _pdfFlipBridgingRate > 0 && _pdfFlipBridgingTerm > 0
      ? (sharedInputs.purchasePrice * (_pdfFlipBridgingLTV / 100)) * (_pdfFlipBridgingRate / 100) * _pdfFlipBridgingTerm
      : 0;
    const _flipMortgageInterest = (() => {
      if (_pdfFlipFM !== 'Mortgage' || _pdfFlipMortgageRate <= 0 || pdfFlipCalcInputs.projectLengthMonths <= 0) return 0;
      const loan = sharedInputs.purchasePrice * (1 - _pdfFlipMortgageDeposit / 100);
      if (_pdfFlipMortgageType === 'IO') return loan * (_pdfFlipMortgageRate / 100 / 12) * pdfFlipCalcInputs.projectLengthMonths;
      const r = _pdfFlipMortgageRate / 100 / 12;
      const n = _pdfFlipMortgageTerm * 12;
      const monthly = r > 0 ? loan * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : loan / n;
      return monthly * pdfFlipCalcInputs.projectLengthMonths;
    })();
    const _flipResults = calculateFlip({
      purchasePrice: sharedInputs.purchasePrice,
      refurbCost: sharedInputs.refurbCost * (1 + _pdfFlipCP / 100),
      otherCosts: sharedInputs.otherCosts + _flipBridgingInterest + _flipMortgageInterest,
      stampDuty: _effectiveTax,
      ...pdfFlipCalcInputs,
      sourcingFee,
    });
    const _saResults = calculateSA({ ...sharedInputs, ...saInputs, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
    const { bridgingRate: _brrBridgingRate, bridgingTermMonths: _brrBridgingTerm, bridgingLTV: _brrBridgingLTV, ...brrrInputsForPdfCalc } = brrrInputs;
    const _brrrBridgingInterest = sharedInputs.purchasePrice > 0 && _brrBridgingRate > 0 && _brrBridgingTerm > 0
      ? (sharedInputs.purchasePrice * (_brrBridgingLTV / 100)) * (_brrBridgingRate / 100) * _brrBridgingTerm
      : 0;
    const _brrrResults = calculateBRRR({
      purchasePrice: sharedInputs.purchasePrice,
      refurbCost: sharedInputs.refurbCost,
      otherCosts: sharedInputs.otherCosts + _brrrBridgingInterest,
      stampDuty: _effectiveTax,
      ...brrrInputsForPdfCalc,
      ..._sharedCostInputs,
      sourcingFee,
    });
    const _r2rResults = calculateR2R({ ...r2rInputs, sourcingFee });
    const _socialResults = calculateSocialHousing({ ...sharedInputs, ...socialInputs, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });

    const _stressSupported = dealType === 'BTL' || dealType === 'HMO' || dealType === 'SA' || dealType === 'BRRR' || dealType === 'SOCIAL';

    const _stressRentDown = (() => {
      if (dealType === 'BTL') {
        const r = calculateBTL({ ...sharedInputs, ...btlInputs, monthlyRent: btlInputs.monthlyRent * 0.9, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'HMO') {
        const r = calculateHMO({ ...sharedInputs, ...hmoInputs, rentPerRoom: hmoInputs.rentPerRoom * 0.9, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'SA') {
        const r = calculateSA({ ...sharedInputs, ...saInputs, nightlyRate: saInputs.nightlyRate * 0.9, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'BRRR') {
        const r = calculateBRRR({ purchasePrice: sharedInputs.purchasePrice, refurbCost: sharedInputs.refurbCost, otherCosts: sharedInputs.otherCosts, stampDuty: _effectiveTax, ...brrrInputs, monthlyRent: brrrInputs.monthlyRent * 0.9, ..._sharedCostInputs, sourcingFee });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'SOCIAL') {
        const r = calculateSocialHousing({ ...sharedInputs, ...socialInputs, leaseIncomePerMonth: socialInputs.leaseIncomePerMonth * 0.9, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      return { monthlyCashFlow: 0, cashOnCashROI: 0 };
    })();

    const _stressRateUp = (() => {
      if (dealType === 'BTL') {
        const r = calculateBTL({ ...sharedInputs, ...btlInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'HMO') {
        const r = calculateHMO({ ...sharedInputs, ...hmoInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'SA') {
        const r = calculateSA({ ...sharedInputs, ...saInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'BRRR') {
        const r = calculateBRRR({ purchasePrice: sharedInputs.purchasePrice, refurbCost: sharedInputs.refurbCost, otherCosts: sharedInputs.otherCosts, stampDuty: _effectiveTax, ...brrrInputs, newMortgageRate: brrrInputs.newMortgageRate + 1.5, ..._sharedCostInputs, sourcingFee });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'SOCIAL') {
        const r = calculateSocialHousing({ ...sharedInputs, ...socialInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: _effectiveTax, ..._sharedCostInputs, sourcingFee });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      return { monthlyCashFlow: 0, cashOnCashROI: 0 };
    })();

    const _baseCashFlow =
      dealType === 'BTL' ? _btlResults.monthlyCashFlow :
      dealType === 'HMO' ? _hmoResults.monthlyCashFlow :
      dealType === 'SA' ? _saResults.monthlyCashFlow :
      dealType === 'BRRR' ? _brrrResults.monthlyCashFlow :
      _socialResults.monthlyCashFlow;

    const _baseCoC =
      dealType === 'BTL' ? _btlResults.cashOnCashROI :
      dealType === 'HMO' ? _hmoResults.cashOnCashROI :
      dealType === 'SA' ? _saResults.cashOnCashROI :
      dealType === 'BRRR' ? _brrrResults.cashOnCashROI :
      _socialResults.cashOnCashROI;

    const _currentScore =
      dealType === 'BTL' ? _btlResults.score :
      dealType === 'HMO' ? _hmoResults.score :
      dealType === 'FLIP' ? _flipResults.score :
      dealType === 'SA' ? _saResults.score :
      dealType === 'BRRR' ? _brrrResults.score :
      dealType === 'R2R' ? _r2rResults.score :
      _socialResults.score;

    const _pp = sharedInputs.purchasePrice;
    const _equityDayOne = marketValue - (dealType === 'R2R' ? 0 : _pp);
    const _bmvPercent = marketValue > 0 ? (_equityDayOne / marketValue) * 100 : 0;

    const _floodDetected = !!(
      propertyData?.floodRisk &&
      propertyData.floodRisk.includes('detected') &&
      !propertyData.floodRisk.includes('No')
    );
    const _leaseholdWarn = tenure === 'Leasehold' && leaseLengthYears > 0 && leaseLengthYears < 85;

    const _riskFlags: string[] = (() => {
      const f: (string | null)[] = [];
      if (dealType === 'BTL') {
        f.push(_leaseholdWarn ? '⚠️ Leasehold under 85 years — most lenders will not mortgage this property' : null);
        f.push(_pp > 0 && _btlResults.monthlyCashFlow < 0 ? '⚠️ Negative cash flow — review rent or mortgage assumptions' : null);
        f.push(_pp > 0 && _btlResults.grossYield < 5 && _btlResults.grossYield > 0 ? '⚠️ Gross yield below 5% — may not meet lender stress tests' : null);
        f.push(_floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
      } else if (dealType === 'HMO') {
        f.push(_leaseholdWarn ? '⚠️ Leasehold under 85 years — most lenders will not mortgage this property' : null);
        f.push(_pp > 0 && _hmoResults.monthlyCashFlow < 0 ? '⚠️ Negative cash flow — review room rates or costs' : null);
        f.push(_floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
      } else if (dealType === 'FLIP') {
        f.push(_leaseholdWarn ? '⚠️ Leasehold under 85 years — most lenders will not mortgage this property' : null);
        f.push(_pp > 0 && _flipResults.netProfit < 0 ? '⚠️ Deal shows a net loss — review costs or expected sale price' : null);
        f.push(_floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
      } else if (dealType === 'SA') {
        f.push(_leaseholdWarn
          ? (_saResults.score === 'Strong' || _saResults.score === 'Average'
            ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
            : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property')
          : null);
        f.push(_pp > 0 && _saResults.monthlyCashFlow < 0 ? '⚠️ Negative cash flow — review nightly rate or occupancy assumptions' : null);
        f.push(_pp > 0 && saInputs.occupancyPercent < 60 ? `⚠️ Occupancy at ${saInputs.occupancyPercent}% — most SA deals require 70%+ to stack.` : null);
        f.push(_floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
      } else if (dealType === 'BRRR') {
        f.push(_leaseholdWarn
          ? (_brrrResults.score === 'Strong' || _brrrResults.score === 'Average'
            ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
            : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property')
          : null);
        f.push(_pp > 0 && _brrrResults.monthlyCashFlow < 0 ? '⚠️ Negative cash flow after refinance — deal does not self-fund' : null);
        f.push(_pp > 0 && _brrrResults.cashLeftInDeal > 25000
          ? `⚠️ £${Math.round(_brrrResults.cashLeftInDeal).toLocaleString()} left in deal — over £25,000 tied up limits your ability to repeat the strategy.`
          : null);
        f.push(_floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
      } else if (dealType === 'R2R') {
        f.push(r2rInputs.setupCosts > 0 && _r2rResults.monthlyProfit < 200
          ? (_r2rResults.score === 'Average'
            ? `⚠️ Monthly profit at £${Math.round(_r2rResults.monthlyProfit).toLocaleString()} — thin margin for R2R.`
            : '⚠️ Monthly profit below £200 — does not meet typical R2R threshold.')
          : null);
        f.push(_floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
      } else {
        f.push(_leaseholdWarn
          ? (_socialResults.score === 'Strong' || _socialResults.score === 'Average'
            ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
            : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property')
          : null);
        f.push(_pp > 0 && _socialResults.monthlyCashFlow < 0 ? '⚠️ Negative cash flow — lease income does not cover mortgage and costs' : null);
        f.push(_floodDetected ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding' : null);
      }
      return f.filter(Boolean) as string[];
    })();

    console.log('[pdfProps] riskFlags:', JSON.stringify(_riskFlags));

    return {
      dealType,
      dateStr,
      propertyAddress: propertyAddress
        ? propertyAddress.charAt(0).toUpperCase() + propertyAddress.slice(1)
        : propertyAddress,
      propertyType,
      tenure,
      leaseLengthYears,
      epcRating: propertyData?.epcRating ?? null,
      floodRisk: propertyData?.floodRisk ?? null,
      floorArea: effectiveFloorAreaSqM != null ? Math.round(effectiveFloorAreaSqM) : null,
      pricePerSqFt,
      pricePerSqM,
      floorAreaUnit,
      constructionDate: propertyData?.constructionDate ?? null,
      purchasePrice: _pp,
      effectiveTax: _effectiveTax,
      taxLabel: _taxLabel,
      taxCountryLabel: COUNTRY_LABEL[taxCountry],
      buyerLabel: _buyerLabel,
      refurbCost: sharedInputs.refurbCost,
      otherCosts: sharedInputs.otherCosts,
      depositPercent: sharedInputs.depositPercent,
      mortgageRate: sharedInputs.mortgageRate,
      mortgageType: sharedInputs.mortgageType,
      mortgageTerm: sharedInputs.mortgageTerm,
      marketValue,
      sourcingFee,
      sourcingFeeDisclaimer: effectiveDisclaimer,
      equityDayOne: _equityDayOne,
      bmvAmount: _equityDayOne,
      bmvPercent: _bmvPercent,
      preparedBy,
      companyName,
      logoBase64,
      brandColour,
      accentColour,
      logoSize,
      coverStyle,
      tierOverride,
      btlInputs: { ...btlInputs, ..._sharedCostInputs, monthlyExpenses: _btlResults.totalOperatingCosts },
      hmoInputs: { ...hmoInputs, ..._sharedCostInputs, monthlyExpenses: _hmoResults.totalOperatingCosts },
      flipInputs,
      saInputs: { ...saInputs, ..._sharedCostInputs, monthlyRunningCosts: _saResults.totalOperatingCosts },
      brrrInputs: { ...brrrInputs, ..._sharedCostInputs, monthlyExpenses: _brrrResults.totalOperatingCosts },
      r2rInputs,
      socialInputs: { ...socialInputs, ..._sharedCostInputs, managementCostsPerMonth: _socialResults.totalOperatingCosts },
      btlResults: _btlResults,
      hmoResults: _hmoResults,
      flipResults: _flipResults,
      saResults: _saResults,
      brrrResults: _brrrResults,
      r2rResults: _r2rResults,
      socialResults: _socialResults,
      currentScore: _currentScore,
      riskFlags: _riskFlags,
      executiveSummary: executiveSummary[dealType] ?? '',
      strategyNotes: strategyNotes[dealType] ?? '',
      propertyDescription,
      vendorSituation,
      comparables: comparables
        .filter(r => r.address.trim())
        .filter(r => {
          if (r.includeInPdf === true) return true;
          if (r.includeInPdf === false) return false;
          // null = default: include Strong or Fair, exclude Weak
          const s = scoreComparable(r, subjectCtx);
          return s.overall === 'Strong' || s.overall === 'Fair';
        })
        .map(r => ({
          type: r.type,
          address: r.address,
          postcode: r.postcode,
          propertyType: r.propertyType,
          bedrooms: r.bedrooms,
          floorArea: r.floorArea,
          date: r.date,
          price: r.price,
        })),
      comparableSaleTypeUsed: comparables.some(r => r.type === 'sale' && r.address.trim()),
      comparableLetTypeUsed: comparables.some(r => r.type === 'let' && r.address.trim()),
      listingLinks,
      photoFiles,
      heroPhotoIndex,
      stressTest: _stressSupported ? {
        baseCashFlow: _baseCashFlow,
        baseCoC: _baseCoC,
        rentDownCashFlow: _stressRentDown.monthlyCashFlow,
        rentDownCoC: _stressRentDown.cashOnCashROI,
        rateUpCashFlow: _stressRateUp.monthlyCashFlow,
        rateUpCoC: _stressRateUp.cashOnCashROI,
      } : undefined,
      includeWorkings: includeWorkingsInPDF,
      managementFeePercent,
      areaAverageYield,
      timelineStages: timelineStages.filter(s => s.label.trim() !== ''),
      offerDeadline,
      viewingAvailable,
      refurbScope,
      voidAllowancePercent,
      maintenanceReserve,
      buildingsInsurance,
      serviceCharge,
      groundRentAnnual,
      bedrooms: bedrooms === '' ? undefined : bedrooms as number,
      bathrooms: bathrooms === '' ? undefined : bathrooms as number,
      remainingLeaseYears: remainingLeaseYears === '' ? undefined : remainingLeaseYears as number,
      leaseExtensionCost: leaseExtensionCost === '' ? 0 : leaseExtensionCost as number,
      isCashBuyer,
      isUninhabitable,
      protectAddress,
      protectedAddressDescription,
      paymentTerms,
      isAuctionPurchase,
      auctionDate,
      auctionCompletionDate,
      buyersPremiumPct: buyersPremiumPct === '' ? 0 : buyersPremiumPct as number,
      buyersPremiumAmount: buyersPremiumAmount === '' ? 0 : buyersPremiumAmount as number,
      buyersPremiumMode,
      auctionReservationFee: auctionReservationFee === '' ? 0 : auctionReservationFee as number,
      buyersPremiumValue,
      auctionReservationFeeValue,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    dealType, dateStr, propertyAddress, propertyType, tenure, leaseLengthYears,
    propertyData, sharedInputs, btlInputs, hmoInputs, flipInputs, saInputs,
    brrrInputs, r2rInputs, socialInputs,
    taxCountry, taxOverrideActive, manualTaxValue, buyerType,
    marketValue, sourcingFee, sourcingFeeDisclaimer, preparedBy, companyName, logoBase64, brandColour,
    accentColour, logoSize, coverStyle, tierOverride,
    executiveSummary, strategyNotes, propertyDescription, vendorSituation,
    subjectCtx, comparables, listingLinks, photoFiles, heroPhotoIndex,
    includeWorkingsInPDF,
    managementFeePercent, voidAllowancePercent, maintenanceReserve,
    buildingsInsurance, serviceCharge, groundRentAnnual,
    areaAverageYield, timelineStages, offerDeadline, viewingAvailable, refurbScope,
    bedrooms, bathrooms, remainingLeaseYears, leaseExtensionCost, isCashBuyer, isUninhabitable,
    isAuctionPurchase, auctionDate, auctionCompletionDate, buyersPremiumPct, buyersPremiumAmount,
    buyersPremiumMode, auctionReservationFee, buyersPremiumValue, auctionReservationFeeValue,
    protectAddress, protectedAddressDescription, paymentTerms,
  ]);

  const hasMinimumData =
    dealType === 'BTL'
      ? sharedInputs.purchasePrice > 0 && btlInputs.monthlyRent > 0
    : dealType === 'HMO'
      ? sharedInputs.purchasePrice > 0 && hmoInputs.rooms > 0 && hmoInputs.rentPerRoom > 0
    : dealType === 'SA'
      ? sharedInputs.purchasePrice > 0 && saInputs.nightlyRate > 0
    : dealType === 'BRRR'
      ? sharedInputs.purchasePrice > 0 && brrrInputs.monthlyRent > 0
    : dealType === 'R2R'
      ? r2rInputs.monthlyRentPaid > 0 && r2rInputs.rooms > 0 && r2rInputs.rentPerRoom > 0
    : dealType === 'FLIP'
      ? sharedInputs.purchasePrice > 0 && flipInputs.expectedSalePrice > 0
    : socialInputs.leaseIncomePerMonth > 0 && sharedInputs.purchasePrice > 0;

  const VERDICT_LABELS: Record<string, string> = {
    Strong: 'RECOMMENDED',
    Average: 'REVIEW',
    Weak: 'AVOID',
  };

  const renderScoreBadge = (score: string) => {
    if (score === 'Incomplete') return null;

    const colors = {
      Strong: 'bg-emerald-500 text-white',
      Average: 'bg-amber-500 text-white',
      Weak: 'bg-red-500 text-white'
    };

    return (
      <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider ${colors[score as keyof typeof colors]}`}>
        {VERDICT_LABELS[score] ?? score}
      </div>
    );
  };

  return (
    <>
    <div className="min-h-screen pb-20 overflow-visible" style={{ backgroundColor: '#EDEEF2' }}>
      <header className="text-primary-foreground py-6 shadow-md sticky top-0 z-50" style={{ backgroundColor: '#1B3A6B' }}>
        <div className="max-w-[1024px] mx-auto px-4 sm:px-6 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">DealScore</h1>
            <p className="text-primary-foreground/80 text-sm">Professional property deal analyser</p>
          </div>
        </div>
      </header>

      <div className="sticky top-[100px] z-40 w-full">

      {/* Sticky Deal Score Bar */}
      <div className="bg-white border-b border-border w-full" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {(() => {
          const incomplete = missingFields.length > 0;
          const dsSignal = getDealScoreSignal(incomplete ? 'Incomplete' : currentScore);
          const scoreColour = dsSignal.colour;
          const scoreLabel = dsSignal.label;
          const showPurchasePrice = purchasePrice > 0 && dealType !== 'R2R';
          const showMaxOffer = !incomplete && resultsMode[dealType] === 'offer' && !!optimalOffer && (optimalOffer.type === 'found' || optimalOffer.type === 'r2r');
          const showOptimiserPrompt = !incomplete && resultsMode[dealType] === 'analyse';
          const maxOfferValue =
            optimalOffer?.type === 'r2r'   ? formatCurrency(Math.max(0, optimalOffer.maxLandlordRent)) + '/mo' :
            optimalOffer?.type === 'found' ? formatCurrency(optimalOffer.maxPrice) :
            '';

          // Signal 5 — strategy-specific key metric
          const currentMonthlyCF =
            dealType === 'BTL'    ? btlResults.monthlyCashFlow :
            dealType === 'HMO'    ? hmoResults.monthlyCashFlow :
            dealType === 'SA'     ? saResults.monthlyCashFlow :
            dealType === 'SOCIAL' ? socialResults.monthlyCashFlow :
            0;
          const keyMetricLabel =
            (dealType === 'BTL' || dealType === 'HMO' || dealType === 'SA' || dealType === 'SOCIAL') ? 'Cash Flow' :
            dealType === 'FLIP' ? 'Profit on Cost' :
            dealType === 'BRRR' ? 'Cash Left In' :
            'Monthly Profit';
          const keyMetricValue =
            (dealType === 'BTL' || dealType === 'HMO' || dealType === 'SA' || dealType === 'SOCIAL') ? formatCurrency(currentMonthlyCF) + '/mo' :
            dealType === 'FLIP' ? formatPercent(flipResults.profitOnCost) :
            dealType === 'BRRR' ? (brrrResults.moneyOut ? '∞ recycled' : formatCurrency(brrrResults.cashLeftInDeal)) :
            formatCurrency(r2rResults.monthlyProfit) + '/mo';
          const keyMetricColour: string | undefined =
            (dealType === 'BTL' || dealType === 'HMO' || dealType === 'SA' || dealType === 'SOCIAL')
              ? (currentMonthlyCF > 0 ? '#10B981' : currentMonthlyCF < 0 ? '#EF4444' : undefined)
              : dealType === 'FLIP'
                ? (flipResults.profitOnCost >= 18 ? '#10B981' : flipResults.profitOnCost >= 10 ? '#F59E0B' : '#EF4444')
                : dealType === 'BRRR'
                  ? (brrrResults.moneyOut || brrrResults.cashLeftInDeal <= 10000 ? '#10B981' : brrrResults.cashLeftInDeal <= 25000 ? '#F59E0B' : '#EF4444')
                  : (r2rResults.monthlyProfit >= 500 ? '#10B981' : r2rResults.monthlyProfit >= 200 ? '#F59E0B' : '#EF4444');

          return (
            <div className="max-w-[1024px] mx-auto px-6 py-2 flex items-center justify-between min-h-[44px]">

              {/* Left signals */}
              <div className="flex items-center">

                {/* 1 — Strategy (always, all screens) */}
                <div className="flex flex-col justify-center gap-0.5 px-3">
                  <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Strategy</span>
                  <span className="text-sm font-medium text-[#1B3A6B]">{dealLabel}</span>
                </div>

                {/* 2 — Purchase Price (desktop, not R2R) */}
                {showPurchasePrice && (<>
                  <div className="h-5 w-px bg-border/60 mx-1 shrink-0 self-center" />
                  <div className="hidden lg:flex flex-col justify-center gap-0.5 px-3">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Purchase Price</span>
                    <span className="text-sm font-medium text-[#1B3A6B]">{formatCurrency(purchasePrice)}</span>
                  </div>
                </>)}

                {/* 3 — GDV (desktop, FLIP only) */}
                {dealType === 'FLIP' && flipInputs.expectedSalePrice > 0 && (<>
                  <div className="h-5 w-px bg-border/60 mx-1 shrink-0 self-center" />
                  <div className="hidden lg:flex flex-col justify-center gap-0.5 px-3">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">GDV</span>
                    <span className="text-sm font-medium text-[#1B3A6B]">{formatCurrency(flipInputs.expectedSalePrice)}</span>
                  </div>
                </>)}

                {/* 4 — Setup Costs (desktop, R2R only) */}
                {dealType === 'R2R' && r2rInputs.setupCosts > 0 && (<>
                  <div className="h-5 w-px bg-border/60 mx-1 shrink-0 self-center" />
                  <div className="hidden lg:flex flex-col justify-center gap-0.5 px-3">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Setup Costs</span>
                    <span className="text-sm font-medium text-[#1B3A6B]">{formatCurrency(r2rInputs.setupCosts)}</span>
                  </div>
                </>)}

                {/* 5 — Key Metric (desktop, complete only) */}
                {!incomplete && (<>
                  <div className="h-5 w-px bg-border/60 mx-1 shrink-0 self-center" />
                  <div className="hidden lg:flex flex-col justify-center gap-0.5 px-3">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{keyMetricLabel}</span>
                    <span className="text-sm font-medium" style={keyMetricColour ? { color: keyMetricColour } : undefined}>{keyMetricValue}</span>
                  </div>
                </>)}

                {/* 6 — Deal Score (always visible, complete only) */}
                {!incomplete && (<>
                  <div className="h-5 w-px bg-border/60 mx-1 shrink-0 self-center" />
                  <div className="flex flex-col justify-center gap-0.5 px-3">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Deal Score</span>
                    <span className="text-sm font-medium" style={{ color: scoreColour }}>{scoreLabel}</span>
                  </div>
                </>)}

              </div>

              {/* Right element */}
              <div className="shrink-0 flex items-center">
                {missingFields.length > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full" style={{ backgroundColor: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0 bg-amber-500" />
                    <span className="text-[10px] font-medium text-amber-600 truncate max-w-[160px] sm:max-w-none">{`Enter: ${missingFields.join(', ')}`}</span>
                  </div>
                )}
                {showOptimiserPrompt && (
                  <button
                    type="button"
                    onClick={() => setResultsMode(prev => ({ ...prev, [dealType]: 'offer' }))}
                    className="text-[11px] px-3 py-1.5 rounded-full border border-border/60 bg-white text-muted-foreground hover:border-[#1B3A6B] hover:text-[#1B3A6B] transition-colors whitespace-nowrap"
                    title="Enter your target return — we'll calculate the maximum price you should pay"
                  >
                    ⚡ Deal Optimiser →
                  </button>
                )}
                {showMaxOffer && (
                  <div className="flex flex-col justify-center gap-0.5 px-3">
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Max Offer</span>
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: '#1B3A6B18', border: '0.5px solid #1B3A6B40', color: '#1B3A6B' }}
                    >
                      {maxOfferValue}
                    </span>
                  </div>
                )}
              </div>

            </div>
          );
        })()}
      </div>
      </div>

      <main className="max-w-[1024px] mx-auto px-6 mt-6">
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-6 items-start">
          {/* Inputs Panel */}
          <div className="lg:col-span-6">
            <Card className="border-0 bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 16px rgba(27, 58, 107, 0.08)', borderTop: '3px solid #1B3A6B' }}>
              <div className="px-6 pt-5 pb-2 flex justify-between items-center">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Calculator className="w-4 h-4" style={{ color: '#1B3A6B' }} /> Deal Numbers
                </h2>
              </div>
              <CardContent className="p-6 pb-0">
                {/* Strategy Selector */}
                <div className="space-y-2 mb-6 pb-6 border-b border-border">
                  <div className="flex items-center gap-1">
                    <Label>Investment Strategy</Label>
                    <InfoIcon id="strategy-selector" text={
                      dealType === 'BTL' ? TT.tabBtl :
                      dealType === 'HMO' ? TT.tabHmo :
                      dealType === 'FLIP' ? TT.tabFlip :
                      dealType === 'SA' ? TT.tabSa :
                      dealType === 'BRRR' ? TT.tabBrrr :
                      dealType === 'R2R' ? TT.tabR2r :
                      TT.tabSocial
                    } />
                  </div>
                  <select
                    value={dealType}
                    onChange={(e) => setDealType(e.target.value as DealType)}
                    style={{ fontSize: '16px' }}
                    className="w-full h-11 rounded-xl border border-input bg-background px-3 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-[#1B3A6B] cursor-pointer"
                  >
                    <option value="BTL">Buy-to-Let (BTL)</option>
                    <option value="HMO">House in Multiple Occupation (HMO)</option>
                    <option value="FLIP">Flip / Refurb</option>
                    <option value="SA">Serviced Accommodation (SA)</option>
                    <option value="BRRR">Buy, Refurb, Refinance, Rent (BRRR)</option>
                    <option value="R2R">Rent-to-Rent (R2R)</option>
                    <option value="SOCIAL">Social Housing</option>
                  </select>
                </div>
                {/* Shared: property metadata and universal financial inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-1"><Label>Property Address</Label><InfoIcon id="shared-addr" text={TT.propAddress} /></div>
                    <div style={{ position: 'relative' }}>
                      <Input
                        type="text"
                        placeholder="Enter full property address"
                        value={propertyAddress}
                        onChange={(e) => {
                          setPropertyAddress(e.target.value);
                          setHighlightedIndex(-1);
                          fetchAddressSuggestions(e.target.value);
                        }}
                        onKeyDown={(e) => {
                          if (!showSuggestions || addressSuggestions.length === 0) return;
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlightedIndex((prev) => Math.min(prev + 1, addressSuggestions.length - 1));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlightedIndex((prev) => Math.max(prev - 1, 0));
                          } else if (e.key === 'Enter') {
                            if (highlightedIndex >= 0) {
                              e.preventDefault();
                              selectSuggestion(addressSuggestions[highlightedIndex]);
                            }
                          } else if (e.key === 'Escape') {
                            setShowSuggestions(false);
                            setAddressSuggestions([]);
                            setHighlightedIndex(-1);
                          }
                        }}
                        onBlur={(e) => {
                          const related = e.relatedTarget as HTMLElement | null;
                          if (related && related.closest('[data-suggestions]')) return;
                          setTimeout(() => setShowSuggestions(false), 200);
                        }}
                        data-testid="input-property-address"
                        autoComplete="off"
                        style={{ paddingRight: propertyAddress ? '32px' : undefined }}
                      />
                      {propertyAddress && (
                        <button
                          type="button"
                          onPointerDown={(e) => {
                            e.preventDefault();
                            setPropertyAddress('');
                            setAddressSuggestions([]);
                            setShowSuggestions(false);
                          }}
                          style={{
                            position: 'absolute',
                            right: 10,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px',
                            color: '#94a3b8',
                            fontSize: 16,
                            lineHeight: 1,
                            zIndex: 10,
                          }}
                          aria-label="Clear address"
                        >
                          ×
                        </button>
                      )}
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div
                          data-suggestions=""
                          tabIndex={-1}
                          style={{
                          position: 'absolute',
                          zIndex: 1000,
                          background: '#fff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '0 0 6px 6px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          width: '100%',
                          maxHeight: 200,
                          overflowY: 'auto',
                        }}>
                          {addressSuggestions.map((suggestion, i) => (
                            <div
                              key={i}
                              onPointerDown={(e) => { e.preventDefault(); selectSuggestion(suggestion); }}
                              style={{
                                padding: '10px 12px',
                                fontSize: 13,
                                cursor: 'pointer',
                                borderBottom: i < addressSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                                color: '#1a1a1a',
                                background: i === highlightedIndex ? '#e8edf5' : '#fff',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = i === highlightedIndex ? '#e8edf5' : '#fff')}
                            >
                              {suggestion.description}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <PropertyDataPanel
                    data={propertyData}
                    loading={propertyDataLoading}
                    open={propertyDataOpen}
                    onToggle={() => setPropertyDataOpen(prev => !prev)}
                  />
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center gap-1"><Label>Property Type</Label><InfoIcon id="shared-proptype" text={TT.propType} /></div>
                    <PropertyTypeSelect value={propertyType} onChange={(v) => { setPropertyType(v); setAutoFilledPropertyType(false); }} />
                    {autoFilledPropertyType && <p className="text-xs text-slate-400 mt-1">Auto-suggested — please verify</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input type="number" min={0} max={20} step={1} placeholder="e.g. 3" value={bedrooms === '' ? '' : bedrooms} onChange={(e) => setBedrooms(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input type="number" min={0} max={10} step={1} placeholder="e.g. 1" value={bathrooms === '' ? '' : bathrooms} onChange={(e) => setBathrooms(e.target.value === '' ? '' : Number(e.target.value))} />
                  </div>
                  <TenureSection tenure={tenure} onChange={(v) => { setTenure(v); setAutoFilledTenure(false); setUserSetTenure(true); }} leaseLength={leaseLengthYears} onLeaseLength={(v) => { setLeaseLengthYears(v); setUserSetLeaseLength(true); }} hint={autoFilledTenure ? 'Auto-suggested — please verify' : undefined} />
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label>Floor Area</Label>
                      <InfoIcon id="floor-area" text="Enter the floor area to calculate price per sq ft/m². Auto-filled from EPC data when available — confirm the figure before relying on it." />
                    </div>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        min={1}
                        step={1}
                        placeholder={floorAreaUnit === 'sqft' ? 'e.g. 850' : 'e.g. 79'}
                        value={manualFloorArea === '' ? '' : manualFloorArea}
                        onChange={(e) => setManualFloorArea(e.target.value === '' ? '' : Number(e.target.value))}
                        className="flex-1"
                      />
                      <div className="flex rounded-md border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setFloorAreaUnit('sqm')}
                          className={`px-3 py-2 text-xs font-semibold transition-colors ${floorAreaUnit === 'sqm' ? 'bg-[#1B3A6B] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                          m²
                        </button>
                        <button
                          type="button"
                          onClick={() => setFloorAreaUnit('sqft')}
                          className={`px-3 py-2 text-xs font-semibold transition-colors ${floorAreaUnit === 'sqft' ? 'bg-[#1B3A6B] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                        >
                          ft²
                        </button>
                      </div>
                    </div>
                    {effectiveFloorAreaSqM != null && (
                      <p className="text-xs text-slate-500">
                        {floorAreaUnit === 'sqft'
                          ? `${Number(manualFloorArea).toLocaleString('en-GB')} ft² ≈ ${Math.round(effectiveFloorAreaSqM).toLocaleString('en-GB')} m²`
                          : `${Number(manualFloorArea).toLocaleString('en-GB')} m² ≈ ${Math.round(effectiveFloorAreaSqM * 10.7639).toLocaleString('en-GB')} ft²`}
                      </p>
                    )}
                  </div>
                  {tenure === 'Leasehold' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1">
                          <Label>Remaining Lease (years)</Label>
                          <InfoIcon id="remaining-lease" text="Leases under 80 years attract additional extension costs and may affect mortgage eligibility. Under 70 years, many lenders will decline entirely." />
                        </div>
                        <Input type="number" min={1} max={999} step={1} placeholder="e.g. 75" value={remainingLeaseYears === '' ? '' : remainingLeaseYears} onChange={(e) => setRemainingLeaseYears(e.target.value === '' ? '' : Number(e.target.value))} />
                        {remainingLeaseYears !== '' && (remainingLeaseYears as number) < 80 && (
                          <p className={`text-xs mt-1 ${(remainingLeaseYears as number) < 70 ? 'text-red-600' : 'text-amber-600'}`}>
                            {(remainingLeaseYears as number) < 70
                              ? 'Lease below 70 years — most lenders will decline. Specialist finance or cash purchase required. Extension costs will be significant — obtain a formal valuation before proceeding.'
                              : 'Lease below 80 years — extension costs apply. Marriage value currently applies but is expected to be abolished under the Leasehold and Freehold Reform Act 2024 (implementation expected late 2026 or later).'}
                          </p>
                        )}
                      </div>
                      {remainingLeaseYears !== '' && (remainingLeaseYears as number) < 999 && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1">
                            <Label>Est. Extension Cost (£)</Label>
                            <InfoIcon id="lease-ext-cost" text="Obtain a formal quote from a solicitor or surveyor. This cost is added to your Cash Invested and reduces your ROI and yield figures accordingly. Typical ranges: 90+ years £1,000–£3,000 | 80–90 years £3,000–£8,000 | 70–80 years £8,000–£20,000 | under 70 years — obtain formal valuation." />
                          </div>
                          <Input type="number" min={0} placeholder="Enter solicitor estimate" value={leaseExtensionCost === '' ? '' : leaseExtensionCost} onChange={(e) => setLeaseExtensionCost(e.target.value === '' ? '' : Number(e.target.value))} />
                        </div>
                      )}
                    </>
                  )}
                  {dealType !== 'R2R' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1"><Label>Purchase Price (£)</Label><InfoIcon id="shared-pp" text={TT.purchasePrice} /></div>
                        <Input type="number" placeholder="Enter purchase price" value={sharedInputs.purchasePrice || ''} onChange={(e) => handleSharedChange('purchasePrice', e.target.value)} data-testid="input-purchase-price" />
                      </div>
                      <TaxSection
                        country={taxCountry}
                        buyerType={buyerType}
                        onCountry={setTaxCountry}
                        onBuyerType={setBuyerType}
                        calculatedAmount={sharedTax}
                        overrideActive={taxOverrideActive}
                        overrideEditing={taxOverrideEditing}
                        manualValue={manualTaxValue}
                        onStartOverride={() => { setManualTaxValue(sharedTax); setTaxOverrideEditing(true); setTaxOverrideActive(false); }}
                        onConfirmOverride={(v) => { setManualTaxValue(v); setTaxOverrideActive(true); setTaxOverrideEditing(false); }}
                        onResetOverride={() => { setTaxOverrideActive(false); setTaxOverrideEditing(false); setManualTaxValue(0); }}
                      />
                      <div className="space-y-2">
                        <div className="flex items-center gap-1"><Label>Refurb Cost (£)</Label><InfoIcon id="shared-refurb" text={TT.refurbCost} /></div>
                        <Input type="number" placeholder="Enter refurb cost" value={sharedInputs.refurbCost || ''} onChange={(e) => handleSharedChange('refurbCost', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1"><Label>Other Costs (Legal, Broker) (£)</Label><InfoIcon id="shared-other" text={TT.otherCosts} /></div>
                        <Input type="number" placeholder="Enter other costs" value={sharedInputs.otherCosts || ''} onChange={(e) => handleSharedChange('otherCosts', e.target.value)} />
                      </div>
                    </>
                  )}
                  {(['BTL', 'HMO', 'SA', 'SOCIAL'] as const).includes(dealType as 'BTL' | 'HMO' | 'SA' | 'SOCIAL') && (
                    <>
                      <div className="md:col-span-2 space-y-3 pt-1">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="cash-buyer"
                            checked={isCashBuyer}
                            onChange={(e) => { if (!isUninhabitable) setIsCashBuyer(e.target.checked); }}
                            disabled={isUninhabitable}
                            className="h-4 w-4 rounded border-slate-300 text-[#1B3A6B] cursor-pointer disabled:cursor-not-allowed"
                          />
                          <label htmlFor="cash-buyer" className="text-sm font-medium text-slate-700 flex items-center gap-1 cursor-pointer">
                            Cash purchase (no mortgage)
                            <InfoIcon id="cash-buyer-info" text="Cash purchases use the full purchase price as capital deployed. ROI is calculated on total cash invested including purchase price, tax, and all costs." />
                          </label>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id="uninhabitable"
                            checked={isUninhabitable}
                            onChange={(e) => setIsUninhabitable(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-[#1B3A6B] cursor-pointer"
                          />
                          <label htmlFor="uninhabitable" className="text-sm font-medium text-slate-700 cursor-pointer">
                            Uninhabitable property
                          </label>
                        </div>
                        {isUninhabitable && (
                          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 leading-relaxed">
                            Uninhabitable properties cannot be mortgaged on standard terms. Bridging finance or cash purchase is required. SDLT may not apply if the property has no value as a dwelling — seek advice.
                          </p>
                        )}
                      </div>
                      {!isCashBuyer && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1"><Label>Deposit (%)</Label><InfoIcon id="shared-dep" text={TT.deposit} /></div>
                          <Input type="number" value={sharedInputs.depositPercent} onChange={(e) => handleSharedChange('depositPercent', e.target.value)} />
                        </div>
                      )}
                      {!isCashBuyer && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1"><Label>Mortgage Rate (%)</Label><InfoIcon id="shared-mr" text={TT.mortgageRate} /></div>
                          <Input type="number" step="0.1" placeholder="Enter mortgage rate" value={sharedInputs.mortgageRate || ''} onChange={(e) => handleSharedChange('mortgageRate', e.target.value)} />
                          <MortgageTypeToggle
                            value={sharedInputs.mortgageType}
                            onChange={(v) => setSharedInputs(prev => ({ ...prev, mortgageType: v }))}
                          />
                        </div>
                      )}
                      {!isCashBuyer && sharedInputs.mortgageType === 'REPAYMENT' && (
                        <div className="space-y-2">
                          <Label>Mortgage Term (years)</Label>
                          <Input type="number" value={sharedInputs.mortgageTerm} onChange={(e) => handleSharedChange('mortgageTerm', e.target.value)} />
                        </div>
                      )}
                    </>
                  )}

                  {/* Auction Purchase — universal across all strategies */}
                  <div className="md:col-span-2 space-y-3 pt-3 border-t border-slate-100 mt-1">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="auction-purchase"
                        checked={isAuctionPurchase}
                        onChange={(e) => setIsAuctionPurchase(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-[#1B3A6B] cursor-pointer"
                      />
                      <label htmlFor="auction-purchase" className="text-sm font-medium text-slate-700 cursor-pointer">
                        Auction purchase
                      </label>
                    </div>
                    {isAuctionPurchase && (
                      <>
                        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-2 leading-relaxed">
                          Auction purchases require exchange on the fall of the hammer. Ensure bridging finance or cash funds are pre-arranged before bidding. You cannot renegotiate after the gavel falls.
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 pt-1">
                          <div className="space-y-1.5">
                            <Label className="text-xs">Auction date</Label>
                            <Input type="date" value={auctionDate} onChange={(e) => setAuctionDate(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">Completion deadline</Label>
                              <InfoIcon id="auction-completion" text="Traditional auction: completion typically required within 28 days of the auction date. Modern Method of Auction (MMoA): typically 56 days. Exchange occurs on the fall of the hammer — ensure finance is pre-arranged before bidding." />
                            </div>
                            <Input type="date" value={auctionCompletionDate} onChange={(e) => setAuctionCompletionDate(e.target.value)} />
                            <p className="text-xs text-slate-400">Traditional auction: 28 days from auction date. Modern Method of Auction: 56 days.</p>
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">Buyer's premium</Label>
                              <InfoIcon id="buyers-premium" text="Auction houses charge the buyer a fee on top of the purchase price. Typically 1.5–3% + VAT for traditional auctions. Always check the legal pack before bidding — this cost is non-negotiable once the hammer falls." />
                            </div>
                            <div className="flex gap-2 items-center">
                              <button
                                type="button"
                                onClick={() => setBuyersPremiumMode('pct')}
                                className={`px-2.5 py-1.5 text-xs rounded font-medium transition-colors ${buyersPremiumMode === 'pct' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >%</button>
                              <button
                                type="button"
                                onClick={() => setBuyersPremiumMode('fixed')}
                                className={`px-2.5 py-1.5 text-xs rounded font-medium transition-colors ${buyersPremiumMode === 'fixed' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                              >£</button>
                              {buyersPremiumMode === 'pct' ? (
                                <Input
                                  type="number"
                                  min={0}
                                  max={10}
                                  step={0.1}
                                  placeholder="e.g. 2.5"
                                  value={buyersPremiumPct === '' ? '' : buyersPremiumPct}
                                  onChange={(e) => setBuyersPremiumPct(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="flex-1"
                                />
                              ) : (
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="e.g. 4500"
                                  value={buyersPremiumAmount === '' ? '' : buyersPremiumAmount}
                                  onChange={(e) => setBuyersPremiumAmount(e.target.value === '' ? '' : Number(e.target.value))}
                                  className="flex-1"
                                />
                              )}
                            </div>
                            {buyersPremiumValue > 0 && (
                              <p className="text-xs text-slate-500">= {formatCurrency(buyersPremiumValue)}</p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-1">
                              <Label className="text-xs">Reservation fee (if MMoA)</Label>
                              <InfoIcon id="reservation-fee" text="Modern Method of Auction charges a non-refundable reservation fee (typically £5,000–£6,000 inc VAT) payable on acceptance of the winning bid. This is in addition to any buyer's premium." />
                            </div>
                            <Input
                              type="number"
                              min={0}
                              placeholder="e.g. 5000"
                              value={auctionReservationFee === '' ? '' : auctionReservationFee}
                              onChange={(e) => setAuctionReservationFee(e.target.value === '' ? '' : Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Tab-specific inputs */}
                {dealType === 'BTL' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-border">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Monthly Rental Income (£)</Label><InfoIcon id="btl-rent" text={TT.monthlyRent} /></div>
                      <Input type="number" placeholder="Enter monthly rent" value={btlInputs.monthlyRent || ''} onChange={(e) => handleBtlChange('monthlyRent', e.target.value)} />
                    </div>
                  </div>
                )}

                {dealType === 'HMO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-border">
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">One-off Costs</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>HMO Licence Cost (£)</Label><InfoIcon id="hmo-licence" text="The cost of the mandatory HMO licence from your local council. Required for properties with 5 or more occupants forming 2 or more households (mandatory licensing). Many councils also apply additional licensing schemes to smaller HMOs — check with your local authority. Typical range: £500–£1,500 for a 5-year licence. This cost is added to your total Cash Invested and spread across 60 months to give an accurate monthly cost impact." /></div>
                      <Input type="number" placeholder="e.g. 800" value={hmoInputs.licenceCost || ''} onChange={(e) => handleHmoChange('licenceCost', e.target.value)} />
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Room Income</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Number of Rooms</Label><InfoIcon id="hmo-rooms" text={TT.numRooms} /></div>
                      <Input type="number" placeholder="Enter number of rooms" value={hmoInputs.rooms || ''} onChange={(e) => handleHmoChange('rooms', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Rent Per Room (£/mo)</Label><InfoIcon id="hmo-rpr" text={TT.rentPerRoom} /></div>
                      <Input type="number" placeholder="Enter rent per room" value={hmoInputs.rentPerRoom || ''} onChange={(e) => handleHmoChange('rentPerRoom', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Occupancy Rate (%)</Label><InfoIcon id="hmo-occ" text={TT.occupancyRate} /></div>
                      <Input type="number" value={hmoInputs.occupancyRate} onChange={(e) => handleHmoChange('occupancyRate', e.target.value)} />
                    </div>
                  </div>
                )}

                {dealType === 'FLIP' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-border">
                    <div className="col-span-1 md:col-span-2 space-y-2">
                      <Label>Financing Method</Label>
                      <div className="flex w-full rounded-md overflow-hidden border border-input">
                        {(['Cash', 'Bridging', 'Mortgage'] as const).map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setFlipInputs(prev => ({ ...prev, financingMethod: m }))}
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${
                              flipInputs.financingMethod === m
                                ? 'bg-[#1B3A6B] text-white'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>
                    {flipInputs.financingMethod === 'Mortgage' && (
                      <>
                        <div className="md:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Mortgage Finance</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1"><Label>Deposit (%)</Label><InfoIcon id="flip-mort-dep" text="Percentage of purchase price paid as deposit." /></div>
                          <Input type="number" step="1" placeholder="e.g. 25" value={flipInputs.flipMortgageDeposit || ''} onChange={(e) => handleFlipChange('flipMortgageDeposit', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1"><Label>Mortgage Rate (%)</Label><InfoIcon id="flip-mort-rate" text="Annual mortgage interest rate." /></div>
                          <Input type="number" step="0.1" placeholder="e.g. 5.5" value={flipInputs.flipMortgageRate || ''} onChange={(e) => handleFlipChange('flipMortgageRate', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1"><Label>Mortgage Term (years)</Label><InfoIcon id="flip-mort-term" text="Length of mortgage in years." /></div>
                          <Input type="number" step="1" placeholder="e.g. 25" value={flipInputs.flipMortgageTerm || ''} onChange={(e) => handleFlipChange('flipMortgageTerm', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1"><Label>Repayment Type</Label><InfoIcon id="flip-mort-type" text="Interest Only keeps monthly payments lower during the project. Repayment reduces the loan balance over time." /></div>
                          <div className="flex w-full rounded-md overflow-hidden border border-input">
                            {(['IO', 'Repayment'] as const).map((t) => (
                              <button key={t} type="button"
                                onClick={() => setFlipInputs(prev => ({ ...prev, flipMortgageType: t }))}
                                className={`flex-1 py-2 text-sm font-medium transition-colors ${flipInputs.flipMortgageType === t ? 'bg-[#1B3A6B] text-white' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
                                {t === 'IO' ? 'Interest Only' : 'Repayment'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                    {flipInputs.financingMethod === 'Cash' && (
                      <div className="md:col-span-2">
                        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Cash purchase</p>
                        <p className="text-xs text-muted-foreground">No financing costs — purchase price and costs paid in full. Refurb, holding costs, and other costs still apply.</p>
                      </div>
                    )}
                    {flipInputs.financingMethod === 'Bridging' && (
                      <>
                        <div className="md:col-span-2">
                          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bridging Finance</p>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1"><Label>Bridging Rate (% per month)</Label><InfoIcon id="flip-bridge-rate" text="The monthly interest rate charged by your bridging lender. Typical UK bridging rates: 0.5–1.5% per month. Interest is charged on the loan amount for the full bridging term." /></div>
                          <Input type="number" step="0.1" placeholder="e.g. 0.85" value={flipInputs.flipBridgingRate || ''} onChange={(e) => handleFlipChange('flipBridgingRate', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1"><Label>Bridging Term (months)</Label><InfoIcon id="flip-bridge-term" text="How long you will hold the bridging loan — from purchase to sale completion. Should match your project length. Typical range: 3–12 months." /></div>
                          <Input type="number" step="1" placeholder="e.g. 6" value={flipInputs.flipBridgingTermMonths || ''} onChange={(e) => handleFlipChange('flipBridgingTermMonths', e.target.value)} />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-1"><Label>Bridging LTV (%)</Label><InfoIcon id="flip-bridge-ltv" text="The loan-to-value your bridging lender will advance against the purchase price. Typically 65–75% for standard residential bridging." /></div>
                          <Input type="number" step="1" value={flipInputs.flipBridgingLTV} onChange={(e) => handleFlipChange('flipBridgingLTV', e.target.value)} />
                        </div>
                      </>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Holding Costs/mo (£)</Label><InfoIcon id="flip-hold" text={TT.holdingCosts} /></div>
                      <Input type="number" placeholder="Enter monthly holding costs" value={flipInputs.holdingCostsPerMonth || ''} onChange={(e) => handleFlipChange('holdingCostsPerMonth', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Project Length (months)</Label><InfoIcon id="flip-proj" text={TT.projectLength} /></div>
                      <Input type="number" placeholder="Enter project length in months" value={flipInputs.projectLengthMonths || ''} onChange={(e) => handleFlipChange('projectLengthMonths', e.target.value)} />
                    </div>
                    <div className="col-span-1 md:col-span-2">
                      <div className="h-px w-full bg-border my-2" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Expected Sale Price / GDV (£)</Label><InfoIcon id="flip-sale" text={TT.salePrice} /></div>
                      <Input type="number" placeholder="Enter expected sale price" value={flipInputs.expectedSalePrice || ''} onChange={(e) => handleFlipChange('expectedSalePrice', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Selling Costs (%)</Label><InfoIcon id="flip-sell" text={TT.sellingCosts} /></div>
                      <Input type="number" step="0.1" value={flipInputs.sellingCostsPercent} onChange={(e) => handleFlipChange('sellingCostsPercent', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Contingency (%)</Label><InfoIcon id="flip-contingency" text="A buffer added to your refurb cost to account for unexpected works. 10% is a standard minimum — experienced developers often use 15–20% on older or larger properties." /></div>
                      <Input type="number" step="1" value={flipInputs.contingencyPercent} onChange={(e) => handleFlipChange('contingencyPercent', e.target.value)} />
                    </div>
                  </div>
                )}

                {dealType === 'SA' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-border">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Nightly Rate (£)</Label><InfoIcon id="sa-night" text={TT.nightlyRate} /></div>
                      <Input type="number" placeholder="Enter nightly rate" value={saInputs.nightlyRate || ''} onChange={(e) => handleSaChange('nightlyRate', e.target.value)} data-testid="input-sa-nightly-rate" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Avg Occupancy (%)</Label><InfoIcon id="sa-occ" text={TT.avgOccupancy} /></div>
                      <Input type="number" value={saInputs.occupancyPercent} onChange={(e) => handleSaChange('occupancyPercent', e.target.value)} data-testid="input-sa-occupancy" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Platform Fees (%)</Label><InfoIcon id="sa-pfees" text={TT.platformFees} /></div>
                      <Input type="number" step="0.5" placeholder="Enter platform fees %" value={saInputs.platformFeesPercent || ''} onChange={(e) => handleSaChange('platformFeesPercent', e.target.value)} data-testid="input-sa-platform-fees" />
                    </div>
                  </div>
                )}

                {dealType === 'BRRR' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-border">
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Phase 1 — Bridging Finance</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Bridging Rate (% per month)</Label><InfoIcon id="brrr-bridge-rate" text="The monthly interest rate charged by your bridging lender during the acquisition and refurbishment period. Typical UK bridging rates: 0.5–1.5% per month. Interest is charged on the loan amount for the full bridging term." /></div>
                      <Input type="number" step="0.1" placeholder="e.g. 0.85" value={brrrInputs.bridgingRate || ''} onChange={(e) => handleBrrrChange('bridgingRate', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Bridging Term (months)</Label><InfoIcon id="brrr-bridge-term" text="How long you will hold the bridging loan before refinancing onto a standard BTL mortgage. Should cover your full refurbishment period plus time to arrange the refinance. Typical range: 3–12 months." /></div>
                      <Input type="number" step="1" placeholder="e.g. 6" value={brrrInputs.bridgingTermMonths || ''} onChange={(e) => handleBrrrChange('bridgingTermMonths', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Bridging LTV (%)</Label><InfoIcon id="brrr-bridge-ltv" text="The loan-to-value your bridging lender will advance against the purchase price. Typically 65–75% for standard residential bridging. The remaining percentage is your cash deposit for phase 1." /></div>
                      <Input type="number" step="1" value={brrrInputs.bridgingLTV} onChange={(e) => handleBrrrChange('bridgingLTV', e.target.value)} />
                    </div>
                    <div className="md:col-span-2 pt-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Phase 2 — Refinance &amp; Rental</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Post-Refurb Value / GDV (£)</Label><InfoIcon id="brrr-gdv" text={TT.postRefurbValue} /></div>
                      <Input type="number" placeholder="Enter post-refurb value" value={brrrInputs.postRefurbValue || ''} onChange={(e) => handleBrrrChange('postRefurbValue', e.target.value)} data-testid="input-brrr-gdv" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Refinance % (typically 75%)</Label><InfoIcon id="brrr-ref" text={TT.refinancePct} /></div>
                      <Input type="number" step="1" value={brrrInputs.refinancePercent} onChange={(e) => handleBrrrChange('refinancePercent', e.target.value)} data-testid="input-brrr-refinance-pct" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>New Mortgage Rate (%)</Label><InfoIcon id="brrr-nmr" text={TT.newMortgageRate} /></div>
                      <Input type="number" step="0.1" placeholder="Enter new mortgage rate" value={brrrInputs.newMortgageRate || ''} onChange={(e) => handleBrrrChange('newMortgageRate', e.target.value)} data-testid="input-brrr-mortgage-rate" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Monthly Rental Income (£)</Label><InfoIcon id="brrr-rent" text={TT.monthlyRent} /></div>
                      <Input type="number" placeholder="Enter monthly rent" value={brrrInputs.monthlyRent || ''} onChange={(e) => handleBrrrChange('monthlyRent', e.target.value)} data-testid="input-brrr-monthly-rent" />
                    </div>
                  </div>
                )}

                {dealType === 'R2R' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-border">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Monthly Rent to Landlord (£)</Label><InfoIcon id="r2r-rtl" text={TT.rentToLandlord} /></div>
                      <Input type="number" placeholder="Enter rent paid to landlord" value={r2rInputs.monthlyRentPaid || ''} onChange={(e) => handleR2rChange('monthlyRentPaid', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Setup Costs (£)</Label><InfoIcon id="r2r-setup" text={TT.setupCosts} /></div>
                      <Input type="number" placeholder="Enter setup costs" value={r2rInputs.setupCosts || ''} onChange={(e) => handleR2rChange('setupCosts', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <Label>Landlord Deposit (months)</Label>
                        <InfoIcon id="r2r-deposit-months" text="Number of months rent held as deposit by the landlord. Typically 1–2 months. This is included in your Total Upfront calculation." />
                      </div>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        placeholder="e.g. 1"
                        value={r2rLandlordDepositMonths || ''}
                        onChange={(e) => setR2rLandlordDepositMonths(Math.max(0, Number(e.target.value)))}
                        data-testid="input-r2r-deposit-months"
                      />
                      <p className="text-[10px] text-muted-foreground mt-1">Months of rent held as deposit by the landlord</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Number of Rooms</Label><InfoIcon id="r2r-rooms" text={TT.numRooms} /></div>
                      <Input type="number" placeholder="Enter number of rooms" value={r2rInputs.rooms || ''} onChange={(e) => handleR2rChange('rooms', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Rent per Room / month (£)</Label><InfoIcon id="r2r-rpr" text={TT.rentPerRoom} /></div>
                      <Input type="number" placeholder="Enter rent per room" value={r2rInputs.rentPerRoom || ''} onChange={(e) => handleR2rChange('rentPerRoom', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Occupancy Rate (%)</Label><InfoIcon id="r2r-occ" text={TT.occupancyRate} /></div>
                      <Input type="number" value={r2rInputs.occupancyRate} onChange={(e) => handleR2rChange('occupancyRate', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Platform / Management Fees (%)</Label><InfoIcon id="r2r-mgmt" text={TT.mgmtFees} /></div>
                      <Input type="number" step="0.5" placeholder="Enter management fees %" value={r2rInputs.managementFeesPercent || ''} onChange={(e) => handleR2rChange('managementFeesPercent', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Monthly Running Costs (£)</Label><InfoIcon id="r2r-run" text={TT.runningCosts} /></div>
                      <Input type="number" placeholder="Enter monthly running costs" value={r2rInputs.monthlyRunningCosts || ''} onChange={(e) => handleR2rChange('monthlyRunningCosts', e.target.value)} />
                    </div>
                  </div>
                )}

                {dealType === 'SOCIAL' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-border">
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Guaranteed Lease Income / month (£)</Label><InfoIcon id="soc-lease" text={TT.leaseIncome} /></div>
                      <Input type="number" placeholder="Enter monthly lease income" value={socialInputs.leaseIncomePerMonth || ''} onChange={(e) => handleSocialChange('leaseIncomePerMonth', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Lease Length (years)</Label><InfoIcon id="soc-ll" text={TT.socialLeaseLength} /></div>
                      <Input type="number" placeholder="Enter lease length in years" value={socialInputs.leaseLengthYears || ''} onChange={(e) => handleSocialChange('leaseLengthYears', e.target.value)} />
                    </div>
                  </div>
                )}

                {(['BTL', 'HMO', 'SA', 'BRRR', 'SOCIAL'] as const).includes(dealType as 'BTL' | 'HMO' | 'SA' | 'BRRR' | 'SOCIAL') && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5 mt-5 pt-5 border-t border-border">
                    <div className="md:col-span-2">
                      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Monthly Costs</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Management Fee (%)</Label><InfoIcon id="shared-mgmt-fee" text="Letting agent management fee as a percentage of effective rent (after void). Typical range 8–15%." /></div>
                      <Input type="number" step="0.5" placeholder="e.g. 10" value={managementFeePercent === 0 ? '' : managementFeePercent} onChange={(e) => setManagementFeePercent(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Void Allowance (%)</Label><InfoIcon id="shared-void" text="Percentage of gross rent lost to void periods between tenancies. 5% ≈ 3 weeks per year." /></div>
                      <Input type="number" step="0.5" placeholder="e.g. 5" value={voidAllowancePercent === 0 ? '' : voidAllowancePercent} onChange={(e) => setVoidAllowancePercent(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Maintenance Reserve (£/mo)</Label><InfoIcon id="shared-maint" text="Monthly allowance for repairs and maintenance. Typical range £50–£150/mo." /></div>
                      <Input type="number" placeholder="e.g. 75" value={maintenanceReserve === 0 ? '' : maintenanceReserve} onChange={(e) => setMaintenanceReserve(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Buildings Insurance (£/mo)</Label><InfoIcon id="shared-bldg-ins" text="Monthly buildings insurance cost. Typical range £20–£50/mo." /></div>
                      <Input type="number" placeholder="e.g. 30" value={buildingsInsurance === 0 ? '' : buildingsInsurance} onChange={(e) => setBuildingsInsurance(parseFloat(e.target.value) || 0)} />
                    </div>
                    {tenure === 'Leasehold' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1"><Label>Service Charge (£/mo)</Label><InfoIcon id="shared-svc-chg" text="Monthly service charge for leasehold properties. Enter 0 for freehold." /></div>
                        <Input type="number" placeholder="0" value={serviceCharge || ''} onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)} />
                      </div>
                    )}
                    {tenure === 'Leasehold' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1"><Label>Ground Rent (£/yr)</Label><InfoIcon id="shared-grd-rent" text="Annual ground rent for leasehold properties. Enter 0 for freehold." /></div>
                        <Input type="number" placeholder="0" value={groundRentAnnual || ''} onChange={(e) => setGroundRentAnnual(parseFloat(e.target.value) || 0)} />
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-6 pt-5 border-t border-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {dealType !== 'R2R' && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-1"><Label htmlFor="market-value">Market Value (£)</Label><InfoIcon id="shared-mv" text={TT.marketValue} /></div>
                        <Input
                          id="market-value"
                          type="number"
                          placeholder="Enter market value"
                          value={marketValue || ''}
                          onChange={(e) => setMarketValue(Number(e.target.value) || 0)}
                          data-testid="input-market-value"
                        />
                      </div>
                    )}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label htmlFor="sourcing-fee">Sourcing Fee (£)</Label><InfoIcon id="shared-sf" text={TT.sourcingFee} /></div>
                      <Input
                        id="sourcing-fee"
                        type="number"
                        placeholder="Enter sourcing fee"
                        value={sourcingFee || ''}
                        onChange={(e) => setSourcingFee(Number(e.target.value) || 0)}
                        data-testid="input-sourcing-fee"
                      />
                    </div>
                  </div>
                  {sourcingFee > 0 && (
                    <div className="space-y-2 mt-5">
                      <Label htmlFor="sourcing-fee-disclaimer">Sourcing Fee Disclaimer</Label>
                      <Textarea
                        id="sourcing-fee-disclaimer"
                        rows={dealType === 'R2R' ? 17 : 14}
                        value={effectiveDisclaimer}
                        onChange={(e) => setSourcingFeeDisclaimer(e.target.value)}
                        data-testid="input-sourcing-fee-disclaimer"
                      />
                    </div>
                  )}
                  {/* Payment terms collapsible */}
                  <div className="mt-4 w-full border-t border-border pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        const opening = !paymentTermsExpanded;
                        setPaymentTermsExpanded(opening);
                        if (opening && paymentTerms === '') {
                          const feeStr = sourcingFee > 0 ? `£${sourcingFee.toLocaleString('en-GB')}` : '[sourcing fee]';
                          setPaymentTerms(
                            `A sourcing fee of ${feeStr} is payable upon exchange of contracts. Payment is required in full prior to release of the full property address and vendor contact details. A 14-day cooling off period applies from the date of this investor pack. Should you choose not to proceed within this period, no fee will be charged. After 14 days, the reservation fee of [50% of sourcing fee or a fixed amount — edit as required] becomes non-refundable. Full terms available on request.`
                          );
                        }
                      }}
                      className="w-full flex items-center justify-between py-2 hover:bg-slate-50 focus:outline-none focus:ring-0 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-slate-700">Payment terms &amp; cooling off period</span>
                        <InfoIcon id="payment-terms-info" text="Payment terms are shown on the legal page of your investor pack. The 14-day cooling off period is standard practice recommended by the Property Ombudsman for deal sourcers." />
                      </div>
                      <ChevronDown
                        size={16}
                        style={{ color: '#1B3A6B', transform: paymentTermsExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                      />
                    </button>
                    {paymentTermsExpanded && (
                      <div className="space-y-2 mt-3">
                        <Label className="text-xs">Payment terms (shown on legal page of investor pack)</Label>
                        <Textarea
                          rows={4}
                          placeholder="Enter payment terms..."
                          value={paymentTerms}
                          onChange={(e) => setPaymentTerms(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 w-full pb-0 mb-0">
                  <button
                    type="button"
                    onClick={() => setStrategyOpen((v) => !v)}
                    aria-expanded={strategyOpen}
                    className="w-full flex items-center justify-between py-3 border-t border-border hover:bg-slate-50 focus:outline-none focus:ring-0 transition-colors"
                    data-testid="toggle-strategy"
                  >
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#1B3A6B]">
                      Recommended Strategy
                    </span>
                    <ChevronDown
                      className="h-4 w-4 transition-transform duration-200"
                      style={{
                        color: '#1B3A6B',
                        transform: strategyOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                </div>
                {strategyOpen && (
                <div className="pb-6 space-y-5">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="strategy-notes" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Why This Strategy?</Label>
                      {tierOverride === 'free' && aiGenCount >= 3 ? (
                        <p className="text-xs text-amber-600 font-medium text-right">
                          You've used your 3 free AI generations. Upgrade to Pro for unlimited.
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerateStrategy}
                          disabled={strategyAiGenerating}
                          className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-60 transition-colors"
                          style={{ backgroundColor: '#1B3A6B' }}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {strategyAiGenerating ? 'Generating…' : 'Generate with AI'}
                        </button>
                      )}
                    </div>
                    <Textarea
                      id="strategy-notes"
                      placeholder="Explain why this strategy fits the deal — e.g. strong rental demand, room to add value, exit options, etc."
                      value={strategyNotes[dealType] ?? ''}
                      onChange={(e) => setStrategyNotes(prev => ({ ...prev, [dealType]: e.target.value }))}
                      rows={4}
                      data-testid="input-strategy-notes"
                    />
                  </div>
                </div>
                )}

                <div className="w-full pb-2 mb-0">
                  <button
                    type="button"
                    onClick={() => setDealNotesOpen((v) => !v)}
                    aria-expanded={dealNotesOpen}
                    className="w-full flex items-center justify-between py-4 border-t border-border hover:bg-slate-50 focus:outline-none focus:ring-0 transition-colors"
                    data-testid="toggle-deal-notes"
                  >
                    <span className="text-xs font-semibold uppercase tracking-widest text-[#1B3A6B]">
                      Deal Notes
                    </span>
                    <ChevronDown
                      className="h-4 w-4 transition-transform duration-200"
                      style={{
                        color: '#1B3A6B',
                        transform: dealNotesOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}
                    />
                  </button>
                </div>
                {dealNotesOpen && (
                <div className="pb-6 space-y-5">

                  {/* Executive Summary */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <Label htmlFor="executive-summary" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Executive Summary</Label>
                      {tierOverride === 'free' && aiGenCount >= 3 ? (
                        <p className="text-xs text-amber-600 font-medium text-right">
                          You've used your 3 free AI generations. Upgrade to Pro for unlimited.
                        </p>
                      ) : (
                        <button
                          type="button"
                          onClick={handleGenerateSummary}
                          disabled={aiGenerating}
                          className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg text-white disabled:opacity-60 transition-colors"
                          style={{ backgroundColor: '#1B3A6B' }}
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          {aiGenerating ? 'Generating…' : 'Generate with AI'}
                        </button>
                      )}
                    </div>
                    <Textarea
                      id="executive-summary"
                      placeholder="A professional overview of this deal for investors — click 'Generate with AI' to auto-write, or type your own."
                      value={executiveSummary[dealType] ?? ''}
                      onChange={(e) => setExecutiveSummary((prev) => ({ ...prev, [dealType]: e.target.value }))}
                      rows={4}
                    />
                  </div>

                  {/* Property Description */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1"><Label htmlFor="property-description" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Property Description</Label><InfoIcon id="shared-propdesc" text={TT.propDescription} /></div>
                    <Textarea
                      id="property-description"
                      placeholder="e.g. 3-bed mid-terrace, 90 sqm, double glazing, gas central heating, west-facing garden, off-road parking…"
                      value={propertyDescription}
                      onChange={(e) => setPropertyDescription(e.target.value)}
                      rows={3}
                      data-testid="input-property-description"
                    />
                  </div>

                  {/* Vendor Situation */}
                  {dealType !== 'R2R' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label htmlFor="vendor-situation" className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Vendor Situation</Label><InfoIcon id="shared-vendor" text="Describe the seller's motivation and circumstances. This helps investors understand the deal context and negotiating position." /></div>
                      <Textarea
                        id="vendor-situation"
                        placeholder="e.g. Motivated seller — relocating for work, needs quick completion within 6 weeks, open to offers…"
                        value={vendorSituation}
                        onChange={(e) => setVendorSituation(e.target.value)}
                        rows={3}
                        data-testid="input-vendor-situation"
                      />
                    </div>
                  )}

                  {/* Refurb Scope */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1"><Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Refurb Scope</Label><InfoIcon id="shared-refurb-scope" text="Brief description of planned refurbishment works. Shown on the Deal Rationale page of the investor pack." /></div>
                    <Textarea
                      placeholder="e.g. Full kitchen and bathroom replacement, redecoration throughout"
                      value={refurbScope}
                      onChange={(e) => setRefurbScope(e.target.value)}
                      rows={3}
                    />
                  </div>

                  {/* Area Average Yield */}
                  {dealType !== 'R2R' && dealType !== 'FLIP' && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Area Average Yield (%)</Label><InfoIcon id="shared-area-yield" text="Average gross yield for comparable BTL properties in this area. Used for market context in the investor pack. Leave blank to omit." /></div>
                      <Input
                        type="number"
                        placeholder="e.g. 5.8"
                        value={areaAverageYield || ''}
                        onChange={(e) => setAreaAverageYield(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  )}

                  {/* Investment Timeline */}
                  <div className="space-y-2">
                    <div>
                      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Investment Timeline</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">Optional — leave blank to omit from investor pack</p>
                    </div>
                    <div className="space-y-2">
                      {timelineStages.map((stage, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <Input
                            type="text"
                            className="flex-grow text-xs"
                            placeholder="Stage label"
                            value={stage.label}
                            onChange={(e) => {
                              const next = timelineStages.map((s, j) => j === i ? { ...s, label: e.target.value } : s);
                              setTimelineStages(next);
                            }}
                          />
                          <Input
                            type="number"
                            className="w-20 text-xs"
                            placeholder="Month"
                            value={stage.month}
                            onChange={(e) => {
                              const next = timelineStages.map((s, j) => j === i ? { ...s, month: parseInt(e.target.value) || 0 } : s);
                              setTimelineStages(next);
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Comparable Properties — card-based rows */}
                  {dealType !== 'R2R' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comparable Properties</Label>
                      <InfoIcon id="comp-info" text={TT.comparables} />
                    </div>
                    <div className="space-y-3">
                      {comparables.map((row, i) => {
                        const upd = <K extends keyof ComparableRow>(field: K, value: ComparableRow[K]) => {
                          const next = [...comparables];
                          next[i] = { ...next[i], [field]: value };
                          setComparables(next);
                        };

                        // Live score — recomputed whenever any field on this row or subject context changes
                        const score = scoreComparable(row, subjectCtx);

                        // Default includeInPdf: Strong/Fair → true, Weak → false (only when still null)
                        const isIncluded = row.includeInPdf !== null
                          ? row.includeInPdf
                          : score.overall !== 'Weak';

                        const badgeColor = score.overall === 'Strong' ? '#16a34a'
                          : score.overall === 'Fair' ? '#d97706'
                          : '#dc2626';
                        const badgeBg = score.overall === 'Strong' ? '#f0fdf4'
                          : score.overall === 'Fair' ? '#fffbeb'
                          : '#fef2f2';

                        const statusIcon = (s: string) =>
                          s === 'strong' ? '✅' : s === 'fair' ? '⚠️' : s === 'weak' ? '❌' : '○';

                        const isExpanded = !!expandedComps[row.id];

                        return (
                          <div key={row.id} className="border border-border rounded-lg p-3 space-y-2 bg-white">
                            {/* Sale / Let toggle + Comparable N label + badge + delete */}
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex rounded-md border overflow-hidden flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => upd('type', 'sale')}
                                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${row.type === 'sale' ? 'bg-[#1B3A6B] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                >Sale</button>
                                <button
                                  type="button"
                                  onClick={() => upd('type', 'let')}
                                  className={`px-3 py-1.5 text-xs font-semibold transition-colors ${row.type === 'let' ? 'bg-[#1B3A6B] text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                >Let</button>
                              </div>

                              {/* Centre: label + traffic light badge */}
                              <div className="flex items-center gap-1.5 flex-1 justify-center">
                                <span className="text-xs text-muted-foreground font-medium">Comparable {i + 1}</span>
                                <button
                                  type="button"
                                  title="Click to see scoring breakdown"
                                  onClick={() => setExpandedComps(prev => ({ ...prev, [row.id]: !prev[row.id] }))}
                                  style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4,
                                    padding: '2px 8px', borderRadius: 99,
                                    background: badgeBg, border: `1px solid ${badgeColor}33`,
                                    color: badgeColor, fontSize: 11, fontWeight: 600,
                                    cursor: 'pointer', lineHeight: 1.4,
                                  }}
                                >
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: badgeColor, display: 'inline-block', flexShrink: 0 }} />
                                  {score.overall}
                                  <span style={{ fontSize: 9, opacity: 0.6, marginLeft: 1 }}>{isExpanded ? '▲' : '▼'}</span>
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => setComparables(comparables.filter((_, j) => j !== i))}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1 flex-shrink-0"
                                title="Remove"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Expanded score breakdown */}
                            {isExpanded && (
                              <div style={{
                                background: '#f8fafc', borderRadius: 6, padding: '8px 10px',
                                border: '1px solid #e2e8f0', fontSize: 12,
                              }}>
                                {score.gateFailed ? (
                                  <div style={{ color: '#dc2626', fontWeight: 600 }}>
                                    ❌ {score.gateFailed}
                                    <span style={{ fontWeight: 400, color: '#64748b', marginLeft: 6 }}>— comparable excluded from evidence</span>
                                  </div>
                                ) : (
                                  <>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      {score.factors.map((f, fi) => (
                                        <div key={fi} style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                                          <span style={{ flexShrink: 0, width: 18 }}>{statusIcon(f.status)}</span>
                                          <span style={{ color: '#334155', fontWeight: 500, minWidth: 120 }}>{f.label}:</span>
                                          <span style={{ color: '#64748b' }}>{f.detail}</span>
                                        </div>
                                      ))}
                                    </div>
                                    {score.overallNumeric >= 0 && (
                                      <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #e2e8f0', color: '#475569', fontWeight: 600 }}>
                                        Overall: {score.overallNumeric}/100 — {score.overall}
                                      </div>
                                    )}
                                  </>
                                )}
                                {score.distanceUnverified && (
                                  <div style={{ marginTop: 4, color: '#92400e', fontSize: 11 }}>
                                    ⚠️ Distance unverified — postcode not geocoded yet
                                  </div>
                                )}
                                {score.rentMetricUnavailable && (
                                  <div style={{ marginTop: 4, color: '#6d28d9', fontSize: 11 }}>
                                    ℹ️ Rent comparison not available for Serviced Accommodation deals
                                  </div>
                                )}
                                {score.priceMetricUnavailable && (
                                  <div style={{ marginTop: 4, color: '#6d28d9', fontSize: 11 }}>
                                    ℹ️ Price comparison not applicable for Rent-to-Rent deals
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Address — with Places autocomplete dropdown */}
                            <div style={{ position: 'relative' }}>
                              <Input
                                type="text"
                                autoComplete="off"
                                placeholder="Address"
                                value={row.address}
                                onChange={(e) => {
                                  upd('address', e.target.value);
                                  fetchCompSuggestions(row.id, e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  const suggs = compSuggestions[row.id] || [];
                                  const hi = compHighlightedIndex[row.id] ?? -1;
                                  if (!compShowSuggestions[row.id] || suggs.length === 0) return;
                                  if (e.key === 'ArrowDown') {
                                    e.preventDefault();
                                    setCompHighlightedIndex(prev => ({ ...prev, [row.id]: Math.min(hi + 1, suggs.length - 1) }));
                                  } else if (e.key === 'ArrowUp') {
                                    e.preventDefault();
                                    setCompHighlightedIndex(prev => ({ ...prev, [row.id]: Math.max(hi - 1, 0) }));
                                  } else if (e.key === 'Enter') {
                                    if (hi >= 0) { e.preventDefault(); selectCompSuggestion(row.id, suggs[hi]); }
                                  } else if (e.key === 'Escape') {
                                    setCompShowSuggestions(prev => ({ ...prev, [row.id]: false }));
                                    setCompSuggestions(prev => ({ ...prev, [row.id]: [] }));
                                    setCompHighlightedIndex(prev => ({ ...prev, [row.id]: -1 }));
                                  }
                                }}
                                onBlur={(e) => {
                                  const related = e.relatedTarget as HTMLElement | null;
                                  if (related && related.closest(`[data-comp-suggestions="${row.id}"]`)) return;
                                  setTimeout(() => setCompShowSuggestions(prev => ({ ...prev, [row.id]: false })), 200);
                                }}
                                className="h-9 text-xs"
                              />
                              {compShowSuggestions[row.id] && (compSuggestions[row.id] || []).length > 0 && (
                                <div
                                  data-comp-suggestions={row.id}
                                  tabIndex={-1}
                                  style={{
                                    position: 'absolute',
                                    zIndex: 1000,
                                    background: '#fff',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '0 0 6px 6px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                    width: '100%',
                                    maxHeight: 180,
                                    overflowY: 'auto',
                                  }}
                                >
                                  {(compSuggestions[row.id] || []).map((suggestion, si) => {
                                    const hi = compHighlightedIndex[row.id] ?? -1;
                                    return (
                                      <div
                                        key={si}
                                        onPointerDown={(e) => { e.preventDefault(); selectCompSuggestion(row.id, suggestion); }}
                                        style={{
                                          padding: '8px 12px',
                                          fontSize: 12,
                                          cursor: 'pointer',
                                          borderBottom: si < (compSuggestions[row.id] || []).length - 1 ? '1px solid #f1f5f9' : 'none',
                                          color: '#1a1a1a',
                                          background: si === hi ? '#e8edf5' : '#fff',
                                        }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = si === hi ? '#e8edf5' : '#fff')}
                                      >
                                        {suggestion.description}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            {/* Postcode | Property Type | Beds | Floor Area */}
                            <div className="grid grid-cols-4 gap-2">
                              <Input
                                type="text"
                                placeholder="Postcode"
                                value={row.postcode}
                                onChange={(e) => {
                                  setComparables(prev => prev.map((r, j) => j === i ? { ...r, postcode: e.target.value, lat: null, lng: null, geocodeFailed: false } : r));
                                }}
                                onBlur={async (e) => {
                                  const pc = e.target.value.trim().replace(/\s+/g, '').toUpperCase();
                                  if (!pc) return;
                                  const currentRow = comparables[i];
                                  if (!currentRow.lat || !currentRow.lng) {
                                    try {
                                      const res = await fetch(`https://api.postcodes.io/postcodes/${pc}`).then(r => r.json());
                                      const lat: number | null = res?.result?.latitude ?? null;
                                      const lng: number | null = res?.result?.longitude ?? null;
                                      setComparables(prev => prev.map((r, j) => j === i ? { ...r, lat, lng, geocodeFailed: !lat } : r));
                                    } catch {
                                      setComparables(prev => prev.map((r, j) => j === i ? { ...r, lat: null, lng: null, geocodeFailed: true } : r));
                                    }
                                  }
                                  if (currentRow.address) fetchCompEpc(row.id, pc, currentRow.address);
                                }}
                                className="h-9 text-xs"
                              />
                              <select
                                value={row.propertyType}
                                onChange={(e) => upd('propertyType', e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                              >
                                <option value="">Type</option>
                                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                              <Input
                                type="number"
                                min={0}
                                max={20}
                                step={1}
                                placeholder="Beds"
                                value={row.bedrooms === '' ? '' : row.bedrooms}
                                onChange={(e) => upd('bedrooms', e.target.value === '' ? '' : Number(e.target.value))}
                                className="h-9 text-xs"
                              />
                              <Input
                                type="number"
                                min={1}
                                step={1}
                                placeholder="m²"
                                value={row.floorArea === '' ? '' : row.floorArea}
                                onChange={(e) => upd('floorArea', e.target.value === '' ? '' : Number(e.target.value))}
                                className="h-9 text-xs"
                              />
                            </div>

                            {/* Date | Price — labels switch on type */}
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type="text"
                                placeholder={row.type === 'sale' ? 'Date Sold (e.g. Jan 2025)' : 'Date Let (e.g. Jan 2025)'}
                                value={row.date}
                                onChange={(e) => upd('date', e.target.value)}
                                className="h-9 text-xs"
                              />
                              <Input
                                type="text"
                                placeholder={row.type === 'sale' ? 'Sale Price (e.g. £210,000)' : 'Monthly Rent (e.g. £1,200)'}
                                value={row.price}
                                onChange={(e) => upd('price', e.target.value)}
                                className="h-9 text-xs"
                              />
                            </div>

                            {/* Include in PDF checkbox */}
                            <div className="flex items-center gap-2 pt-0.5">
                              <input
                                id={`incpdf-${row.id}`}
                                type="checkbox"
                                checked={isIncluded}
                                onChange={(e) => upd('includeInPdf', e.target.checked)}
                                className="w-3.5 h-3.5 accent-[#1B3A6B] cursor-pointer"
                              />
                              <label
                                htmlFor={`incpdf-${row.id}`}
                                className="text-xs text-muted-foreground cursor-pointer select-none"
                              >
                                Include in PDF report
                                {row.includeInPdf === null && (
                                  <span style={{ color: '#94a3b8', marginLeft: 4 }}>(auto)</span>
                                )}
                              </label>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-[#1B3A6B]/40 text-xs font-semibold text-[#1B3A6B] hover:bg-[#1B3A6B]/5 hover:border-[#1B3A6B] transition-colors cursor-pointer"
                      onClick={() => setComparables([...comparables, { id: crypto.randomUUID(), type: 'sale', address: '', postcode: '', propertyType: '', bedrooms: '', floorArea: '', date: '', price: '', includeInPdf: null, lat: null, lng: null }])}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                  </div>
                  )}

                  {/* Listing Links */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1"><Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Listing Links</Label><InfoIcon id="shared-listing-links" text="Link to the property listing for investor due diligence. Only include if the deal is already under offer or exchanged — sharing an active listing may allow investors to approach the agent directly and bypass the sourcing fee." /></div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="grid gap-2 bg-slate-100 border-b border-border text-xs font-semibold text-muted-foreground px-3 py-2" style={{ gridTemplateColumns: '1fr 2fr auto' }}>
                        <span>Label</span>
                        <span>URL</span>
                        <span />
                      </div>
                      {listingLinks.map((row, i) => (
                        <div key={i} className="grid gap-2 px-3 py-2 border-b border-border last:border-b-0 items-center" style={{ gridTemplateColumns: '1fr 2fr auto' }}>
                          <Input
                            type="text"
                            placeholder='e.g. "Rightmove"'
                            value={row.label}
                            onChange={(e) => {
                              const next = [...listingLinks];
                              next[i] = { ...next[i], label: e.target.value };
                              setListingLinks(next);
                            }}
                            className="h-9 text-xs"
                          />
                          <Input
                            type="url"
                            placeholder="https://..."
                            value={row.url}
                            onChange={(e) => {
                              const url = e.target.value;
                              const next = [...listingLinks];
                              const PLATFORM_MAP: Record<string, string> = {
                                'rightmove.co.uk': 'Rightmove',
                                'zoopla.co.uk': 'Zoopla',
                                'onthemarket.com': 'OnTheMarket',
                                'primelocation.com': 'PrimeLocation',
                                'propertypal.com': 'PropertyPal',
                              };
                              const PLATFORM_VALUES = new Set(Object.values(PLATFORM_MAP));
                              let detectedLabel = '';
                              try {
                                const hostname = new URL(url).hostname.replace(/^www\./, '');
                                detectedLabel = PLATFORM_MAP[hostname] ?? '';
                              } catch { /* invalid URL — ignore */ }
                              const currentLabel = next[i].label.trim();
                              const shouldAutoFill = !currentLabel || PLATFORM_VALUES.has(currentLabel);
                              next[i] = {
                                ...next[i],
                                url,
                                ...(shouldAutoFill && detectedLabel ? { label: detectedLabel } : {}),
                              };
                              setListingLinks(next);
                            }}
                            className="h-9 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setListingLinks(listingLinks.filter((_, j) => j !== i))}
                            className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            title="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-[#1B3A6B]/40 text-xs font-semibold text-[#1B3A6B] hover:bg-[#1B3A6B]/5 hover:border-[#1B3A6B] transition-colors cursor-pointer"
                      onClick={() => setListingLinks([...listingLinks, { label: '', url: '' }])}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Link
                    </button>
                  </div>

                  {/* Property Photos */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1"><Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Property Photos</Label><InfoIcon id="photos-upload" text={TT.photoUpload} /></div>
                    <label className="block w-full border-2 border-dashed border-[#1B3A6B]/30 rounded-xl p-8 text-center cursor-pointer hover:border-[#1B3A6B] hover:bg-[#1B3A6B]/5 transition-colors">
                      <input
                        type="file"
                        accept="image/jpeg,image/png"
                        multiple
                        className="hidden"
                        onChange={async (e) => {
                          setPhotoLimitError(false);
                          const incoming = Array.from(e.target.files ?? []);
                          e.target.value = '';
                          if (incoming.length === 0) return;
                          const slots = 11 - photoFiles.length;
                          if (slots <= 0) {
                            setPhotoLimitError(true);
                            return;
                          }
                          if (incoming.length > slots) {
                            setPhotoLimitError(true);
                          }
                          const filesToAdd = incoming.slice(0, slots);
                          const compressed = await Promise.all(filesToAdd.map(compressImage));
                          const valid = compressed.filter(s => s.length > 0);
                          setPhotoFiles((prev) => [...prev, ...valid]);
                        }}
                      />
                      <span className="text-sm font-medium text-[#1B3A6B]/70">Click to upload photos (JPG / PNG, multiple allowed)</span>
                    </label>
                    {photoLimitError && (
                      <p className="text-xs text-amber-600 font-medium">Maximum 11 photos allowed.</p>
                    )}
                    {photoFiles.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        {photoFiles.map((src, i) => (
                          <div key={i} className="relative group">
                            <img src={src} alt={`Photo ${i + 1}`} className="w-full h-20 object-cover rounded-lg cursor-pointer" onClick={() => setLightboxPhoto(src)} />
                            {/* Hero badge */}
                            {heroPhotoIndex === i ? (
                              <span className="absolute top-1 left-1 bg-amber-400 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded pointer-events-none">
                                ★ Hero
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setHeroPhotoIndex(i)}
                                className="absolute top-1 left-1 bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Set as hero photo"
                              >
                                ☆ Hero
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoLimitError(false);
                                setPhotoFiles((prev) => {
                                  const next = prev.filter((_, j) => j !== i);
                                  if (heroPhotoIndex === i) setHeroPhotoIndex(0);
                                  else if (heroPhotoIndex > i) setHeroPhotoIndex((h) => h - 1);
                                  return next;
                                });
                              }}
                              className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Remove photo"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-5 lg:sticky lg:top-[160px]">
            <div className="bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 16px rgba(27, 58, 107, 0.08)', borderTop: '3px solid #1B3A6B' }}>
            <div className="bg-white overflow-hidden">
              <div className="px-6 pt-5 pb-4 flex flex-col items-center justify-center w-full space-y-4">
                <div className="flex items-center justify-center gap-1">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: '#1B3A6B' }} />Deal Score
                  </h2>
                </div>
                {missingFields.length === 0 && dealType === 'BTL' && (<>
                  {renderScoreBadge(btlResults.score)}
                  <p className="text-xs text-muted-foreground italic px-6 pb-2 leading-relaxed">{btlResults.score === 'Strong' ? 'Strong cash flow and ROI — this deal stacks.' : btlResults.score === 'Average' ? `CoC ROI at ${formatPercent(btlResults.cashOnCashROI)} — below the 5% strong threshold. Cash flow is positive but marginal.` : `Negative cash flow of ${formatCurrency(btlResults.monthlyCashFlow)}/mo. CoC ROI at ${formatPercent(btlResults.cashOnCashROI)} — below minimum investor threshold.`}</p>
                  <button type="button" onClick={() => setWhyScoreOpen(v => !v)} className="flex items-center gap-1.5 px-6 pt-1 pb-2 text-[10px] font-medium uppercase tracking-wider text-[#1B3A6B]/70 hover:bg-slate-50 rounded-lg transition-colors w-full text-left">
                    Score Breakdown
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" style={{ transform: whyScoreOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  {whyScoreOpen && (<div className="pb-3 space-y-1">
                    <div className="flex items-center justify-between px-6 py-0.5"><span className="text-xs text-muted-foreground">CoC ROI ≥ 5% (Strong) / ≥ 3% (Average)</span><span style={{ color: btlResults.cashOnCashROI >= 3 ? '#10B981' : '#EF4444' }}>{btlResults.cashOnCashROI >= 3 ? '✓' : '✗'}</span></div>
                    <div className="flex items-center justify-between px-6 py-0.5 pb-3"><span className="text-xs text-muted-foreground">Monthly CF ≥ £100</span><span style={{ color: btlResults.monthlyCashFlow >= 100 ? '#10B981' : '#EF4444' }}>{btlResults.monthlyCashFlow >= 100 ? '✓' : '✗'}</span></div>
                  </div>)}
                </>)}
                {missingFields.length === 0 && dealType === 'HMO' && (<>
                  {renderScoreBadge(hmoResults.score)}
                  <p className="text-xs text-muted-foreground italic px-6 pb-2 leading-relaxed">{hmoResults.score === 'Strong' ? 'Strong yield and cash flow — good room-level returns.' : hmoResults.score === 'Average' ? `Gross yield at ${formatPercent(hmoResults.grossYield)} — below the 10% strong threshold but above the 7% average minimum.` : `Gross yield at ${formatPercent(hmoResults.grossYield)} — below the 7% HMO minimum. Review room rates or purchase price.`}</p>
                  <button type="button" onClick={() => setWhyScoreOpen(v => !v)} className="flex items-center gap-1.5 px-6 pt-1 pb-2 text-[10px] font-medium uppercase tracking-wider text-[#1B3A6B]/70 hover:bg-slate-50 rounded-lg transition-colors w-full text-left">
                    Score Breakdown
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" style={{ transform: whyScoreOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  {whyScoreOpen && (<div className="pb-3 space-y-1">
                    <div className="flex items-center justify-between px-6 py-0.5"><span className="text-xs text-muted-foreground">Gross Yield ≥ 10% (Strong) / ≥ 7% (Average)</span><span style={{ color: hmoResults.grossYield >= 7 ? '#10B981' : '#EF4444' }}>{hmoResults.grossYield >= 7 ? '✓' : '✗'}</span></div>
                    <div className="flex items-center justify-between px-6 py-0.5 pb-3"><span className="text-xs text-muted-foreground">Positive cash flow</span><span style={{ color: hmoResults.monthlyCashFlow > 0 ? '#10B981' : '#EF4444' }}>{hmoResults.monthlyCashFlow > 0 ? '✓' : '✗'}</span></div>
                  </div>)}
                </>)}
                {missingFields.length === 0 && dealType === 'FLIP' && (<>
                  {renderScoreBadge(flipResults.score)}
                  <p className="text-xs text-muted-foreground italic px-6 pb-2 leading-relaxed">{flipResults.score === 'Strong' ? 'Strong profit margin — flip stacks at current numbers.' : flipResults.score === 'Average' ? `Profit on cost at ${formatPercent(flipResults.profitOnCost)} — below the 18% planning benchmark. Thin margin for this deal.` : `Net profit ${formatCurrency(flipResults.netProfit)} — below minimum threshold. Review purchase price or refurb costs.`}</p>
                  <button type="button" onClick={() => setWhyScoreOpen(v => !v)} className="flex items-center gap-1.5 px-6 pt-1 pb-2 text-[10px] font-medium uppercase tracking-wider text-[#1B3A6B]/70 hover:bg-slate-50 rounded-lg transition-colors w-full text-left">
                    Score Breakdown
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" style={{ transform: whyScoreOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  {whyScoreOpen && (<div className="pb-3 space-y-1">
                    <div className="flex items-center justify-between px-6 py-0.5"><span className="text-xs text-muted-foreground">ROI ≥ 12% (Strong) / ≥ 8% (Average)</span><span style={{ color: flipResults.roi >= 8 ? '#10B981' : '#EF4444' }}>{flipResults.roi >= 8 ? '✓' : '✗'}</span></div>
                    <div className="flex items-center justify-between px-6 py-0.5 pb-3"><span className="text-xs text-muted-foreground">Net Profit ≥ £18k (Strong)</span><span style={{ color: flipResults.netProfit >= 18000 ? '#10B981' : '#EF4444' }}>{flipResults.netProfit >= 18000 ? '✓' : '✗'}</span></div>
                  </div>)}
                </>)}
                {missingFields.length === 0 && dealType === 'SA' && (<>
                  {renderScoreBadge(saResults.score)}
                  <p className="text-xs text-muted-foreground italic px-6 pb-2 leading-relaxed">{saResults.score === 'Strong' ? 'Strong SA yield and cash flow — good occupancy combination.' : saResults.score === 'Average' ? `Net yield at ${formatPercent(saResults.netYield)} — below the 10% average threshold. Increase nightly rate or occupancy to improve.` : `SA yield below threshold or negative cash flow of ${formatCurrency(saResults.monthlyCashFlow)}/mo. Review nightly rate and occupancy assumptions.`}</p>
                  <button type="button" onClick={() => setWhyScoreOpen(v => !v)} className="flex items-center gap-1.5 px-6 pt-1 pb-2 text-[10px] font-medium uppercase tracking-wider text-[#1B3A6B]/70 hover:bg-slate-50 rounded-lg transition-colors w-full text-left">
                    Score Breakdown
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" style={{ transform: whyScoreOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  {whyScoreOpen && (<div className="pb-3 space-y-1">
                    <div className="flex items-center justify-between px-6 py-0.5"><span className="text-xs text-muted-foreground">Net Yield ≥ 15% (Strong) / ≥ 10% (Average)</span><span style={{ color: saResults.netYield >= 10 ? '#10B981' : '#EF4444' }}>{saResults.netYield >= 10 ? '✓' : '✗'}</span></div>
                    <div className="flex items-center justify-between px-6 py-0.5 pb-3"><span className="text-xs text-muted-foreground">Positive cash flow</span><span style={{ color: saResults.monthlyCashFlow > 0 ? '#10B981' : '#EF4444' }}>{saResults.monthlyCashFlow > 0 ? '✓' : '✗'}</span></div>
                  </div>)}
                </>)}
                {missingFields.length === 0 && dealType === 'BRRR' && (<>
                  {renderScoreBadge(brrrResults.score)}
                  <p className="text-xs text-muted-foreground italic px-6 pb-2 leading-relaxed">{brrrResults.score === 'Strong' ? 'Capital recycled efficiently with positive cash flow.' : brrrResults.score === 'Average' ? `£${Math.round(brrrResults.cashLeftInDeal).toLocaleString()} left in deal — over £25,000 tied up limits capital recycling efficiency.` : `Too much capital left in deal or negative cash flow of ${formatCurrency(brrrResults.monthlyCashFlow)}/mo. Review post-refurb value or refinance terms.`}</p>
                  <button type="button" onClick={() => setWhyScoreOpen(v => !v)} className="flex items-center gap-1.5 px-6 pt-1 pb-2 text-[10px] font-medium uppercase tracking-wider text-[#1B3A6B]/70 hover:bg-slate-50 rounded-lg transition-colors w-full text-left">
                    Score Breakdown
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" style={{ transform: whyScoreOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  {whyScoreOpen && (<div className="pb-3 space-y-1">
                    <div className="flex items-center justify-between px-6 py-0.5"><span className="text-xs text-muted-foreground">Positive cash flow</span><span style={{ color: brrrResults.monthlyCashFlow > 0 ? '#10B981' : '#EF4444' }}>{brrrResults.monthlyCashFlow > 0 ? '✓' : '✗'}</span></div>
                    <div className="flex items-center justify-between px-6 py-0.5 pb-3"><span className="text-xs text-muted-foreground">Cash Left In ≤ £10k (Strong) / ≤ £25k (Average)</span><span style={{ color: (brrrResults.moneyOut || brrrResults.cashLeftInDeal <= 25000) ? '#10B981' : '#EF4444' }}>{(brrrResults.moneyOut || brrrResults.cashLeftInDeal <= 25000) ? '✓' : '✗'}</span></div>
                  </div>)}
                </>)}
                {missingFields.length === 0 && dealType === 'R2R' && (<>
                  {renderScoreBadge(r2rResults.score)}
                  <p className="text-xs text-muted-foreground italic px-6 pb-2 leading-relaxed">{r2rResults.score === 'Strong' ? 'Strong margins — setup costs recovered quickly.' : r2rResults.score === 'Average' ? `Monthly profit at ${formatCurrency(r2rResults.monthlyProfit)}/mo — below the £500 strong threshold. One void month would significantly impact returns.` : `Monthly profit at ${formatCurrency(r2rResults.monthlyProfit)}/mo — below £200 minimum threshold. Review landlord rent or room rates.`}</p>
                  <button type="button" onClick={() => setWhyScoreOpen(v => !v)} className="flex items-center gap-1.5 px-6 pt-1 pb-2 text-[10px] font-medium uppercase tracking-wider text-[#1B3A6B]/70 hover:bg-slate-50 rounded-lg transition-colors w-full text-left">
                    Score Breakdown
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" style={{ transform: whyScoreOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  {whyScoreOpen && (<div className="pb-3 space-y-1">
                    <div className="flex items-center justify-between px-6 py-0.5"><span className="text-xs text-muted-foreground">Monthly Profit ≥ £500 (Strong) / ≥ £200 (Average)</span><span style={{ color: r2rResults.monthlyProfit >= 200 ? '#10B981' : '#EF4444' }}>{r2rResults.monthlyProfit >= 200 ? '✓' : '✗'}</span></div>
                    <div className="flex items-center justify-between px-6 py-0.5 pb-3"><span className="text-xs text-muted-foreground">ROI on Setup ≥ 50% (Strong) / ≥ 25% (Average)</span><span style={{ color: r2rResults.roi >= 25 ? '#10B981' : '#EF4444' }}>{r2rResults.roi >= 25 ? '✓' : '✗'}</span></div>
                  </div>)}
                </>)}
                {missingFields.length === 0 && dealType === 'SOCIAL' && (<>
                  {renderScoreBadge(socialResults.score)}
                  <p className="text-xs text-muted-foreground italic px-6 pb-2 leading-relaxed">{socialResults.score === 'Strong' ? 'Stable lease income with strong ROI — long-term low-management investment.' : socialResults.score === 'Average' ? `CoC ROI at ${formatPercent(socialResults.cashOnCashROI)} — below the 5% strong threshold. Stable income but limited return on capital.` : `Lease income does not cover costs — negative cash flow of ${formatCurrency(socialResults.monthlyCashFlow)}/mo. Review lease terms or purchase price.`}</p>
                  <button type="button" onClick={() => setWhyScoreOpen(v => !v)} className="flex items-center gap-1.5 px-6 pt-1 pb-2 text-[10px] font-medium uppercase tracking-wider text-[#1B3A6B]/70 hover:bg-slate-50 rounded-lg transition-colors w-full text-left">
                    Score Breakdown
                    <ChevronDown className="w-3.5 h-3.5 transition-transform duration-200" style={{ transform: whyScoreOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  </button>
                  {whyScoreOpen && (<div className="pb-3 space-y-1">
                    <div className="flex items-center justify-between px-6 py-0.5"><span className="text-xs text-muted-foreground">CoC ROI ≥ 5% (Strong) / ≥ 2% (Average)</span><span style={{ color: socialResults.cashOnCashROI >= 2 ? '#10B981' : '#EF4444' }}>{socialResults.cashOnCashROI >= 2 ? '✓' : '✗'}</span></div>
                    <div className="flex items-center justify-between px-6 py-0.5 pb-3"><span className="text-xs text-muted-foreground">Monthly CF ≥ £100</span><span style={{ color: socialResults.monthlyCashFlow >= 100 ? '#10B981' : '#EF4444' }}>{socialResults.monthlyCashFlow >= 100 ? '✓' : '✗'}</span></div>
                  </div>)}
                </>)}


                {marketValue > 0 && dealType !== 'R2R' && (
                  <div
                    className="w-full mt-2 rounded-xl px-4 py-3 flex items-center justify-between"
                    style={{
                      backgroundColor: bmvAmount >= 0 ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                      border: `1px solid ${bmvAmount >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                    }}
                    data-testid="bmv-banner"
                  >
                    <div className="text-left">
                      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-0.5">
                        Below Market Value
                        <InfoIcon id="bmv-banner" text={TT.bmv} />
                      </div>
                      <div className="text-lg font-bold" style={{ color: bmvAmount >= 0 ? '#047857' : '#b91c1c' }}>
                        {formatCurrency(bmvAmount)}
                      </div>
                    </div>
                    <div
                      className="text-2xl font-extrabold"
                      style={{ color: bmvAmount >= 0 ? '#047857' : '#b91c1c' }}
                      data-testid="bmv-percent"
                    >
                      {bmvPercent.toFixed(1)}%
                    </div>
                  </div>
                )}
              </div>

              {(pricePerSqFt != null || pricePerSqM != null) && (
                <div className="mx-6 mb-3 flex items-center justify-between rounded-lg px-4 py-2.5"
                  style={{ background: 'rgba(27,58,107,0.06)', border: '1px solid rgba(27,58,107,0.18)' }}>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {floorAreaUnit === 'sqft' ? 'Price / sq ft' : 'Price / m²'}
                  </span>
                  <span className="text-base font-bold text-[#1B3A6B]">
                    {floorAreaUnit === 'sqft' && pricePerSqFt != null
                      ? `£${Math.round(pricePerSqFt).toLocaleString('en-GB')}/ft²`
                      : pricePerSqM != null
                      ? `£${Math.round(pricePerSqM).toLocaleString('en-GB')}/m²`
                      : '—'}
                  </span>
                </div>
              )}

              <div className="px-6 pb-3">
                <ResultsModeToggle
                  value={resultsMode[dealType]}
                  onChange={(v) => setResultsMode(prev => ({ ...prev, [dealType]: v }))}
                />
              </div>

              <div className="px-6 pb-4">
                {resultsMode[dealType] === 'analyse' ? (<>
                {missingFields.length === 0 && dealType === 'BTL' && (
                  <div className="space-y-3">
                    <RiskFlags flags={[
                      tenure === 'Leasehold' && leaseLengthYears > 0 && leaseLengthYears < 85
                        ? btlResults.score === 'Strong' || btlResults.score === 'Average'
                          ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
                          : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property'
                        : null,
                      tenure === 'Leasehold' && leaseLengthYears >= 85 && leaseLengthYears < 125
                        ? '⚠️ Leasehold under 125 years — check lender requirements before proceeding'
                        : null,
                      sharedInputs.purchasePrice > 0 && btlResults.monthlyCashFlow < 0
                        ? '⚠️ Negative cash flow — this deal costs you money every month'
                        : null,
                      sharedInputs.purchasePrice > 0 && btlResults.grossYield < 5
                        ? btlResults.score === 'Strong'
                          ? '⚠️ Gross yield at ' + btlResults.grossYield.toFixed(1) + '% — below the 5% BTL benchmark. Strong ROI is driven by leverage — be prepared to justify the yield to investors.'
                          : '⚠️ Gross yield at ' + btlResults.grossYield.toFixed(1) + '% — below the 5% BTL benchmark. Most investors expect 5%+ on a BTL.'
                        : null,
                      sharedInputs.purchasePrice > 0 && btlResults.cashOnCashROI < 3
                        ? '⚠️ Cash-on-Cash ROI below 3% — does not meet typical investor threshold'
                        : null,
                      propertyData?.floodRisk && propertyData.floodRisk.includes('detected') && !propertyData.floodRisk.includes('No')
                        ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding'
                        : null,
                    ].filter(Boolean) as string[]} />
                    {/* Group 1 — WHAT I COMMIT */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">What I Commit</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Invested<InfoIcon id="g1-btl-cash" text="Total cash required to complete this purchase: deposit + stamp duty + refurb costs + other costs. This is your total capital at risk." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(btlResults.totalCashInvested)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 2 — MONTHLY · ANNUAL */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{showAnnual ? 'Annual figures' : 'Monthly figures'}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setShowAnnual(false)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${!showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Monthly</button>
                          <button type="button" onClick={() => setShowAnnual(true)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Annual</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Mortgage<InfoIcon id="g2-btl-mort" text="Monthly mortgage payment based on your rate, term and repayment type." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(btlResults.monthlyMortgageInterest * 12) : formatCurrency(btlResults.monthlyMortgageInterest)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(btlResults.monthlyMortgageInterest)}/mo` : `${formatCurrency(btlResults.monthlyMortgageInterest * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Operating Costs<InfoIcon id="g2-btl-ops" text="Total monthly running costs: management fees + maintenance reserve + buildings insurance + void allowance. Includes service charge and ground rent where applicable." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(btlResults.totalOperatingCosts * 12) : formatCurrency(btlResults.totalOperatingCosts)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(btlResults.totalOperatingCosts)}/mo` : `${formatCurrency(btlResults.totalOperatingCosts * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Flow<InfoIcon id="g2-btl-cf" text="Net monthly income after all costs and mortgage payments. This is what lands in your account." /></span>
                          <span className="text-lg font-bold" style={{ color: (showAnnual ? btlResults.annualCashFlow : btlResults.monthlyCashFlow) >= 0 ? '#10B981' : '#EF4444' }}>{showAnnual ? formatCurrency(btlResults.annualCashFlow) : formatCurrency(btlResults.monthlyCashFlow)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(btlResults.monthlyCashFlow)}/mo` : `${formatCurrency(btlResults.annualCashFlow)}/yr`}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 3 — RETURNS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Returns</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">CoC ROI<InfoIcon id="g3-btl-coc" text="Cash-on-Cash ROI: annual cash flow ÷ cash invested × 100. The most accurate measure of return on leveraged property. Benchmark: 5%+ strong, 3%+ average." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(btlResults.cashOnCashROI)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Gross Yield<InfoIcon id="g3-btl-gy" text="Annual rental income ÷ purchase price × 100. Used to compare properties regardless of financing. Benchmark: 5%+ for BTL." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(btlResults.grossYield)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-0">
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Net Yield<InfoIcon id="row-btl-nety" text="Net annual income after all operating costs ÷ purchase price × 100. More accurate than gross yield as it accounts for running costs." /></span>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{formatPercent(btlResults.netYield)}</span>
                      </div>
                      {marketValue > 0 && (
                        <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">Equity on Day One<InfoIcon id="row-btl-equity" text="Market value minus purchase price. Instant equity from buying below market value. Only shows when market value is entered." /></span>
                          <span className="text-sm font-medium" style={{ color: equityDayOne > 0 ? '#1B3A6B' : '#EF4444' }}>{formatCurrency(equityDayOne)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Payback Period<InfoIcon id="row-btl-payback" text="Years to recover your cash invested from net cash flow. Under 12 years = strong, under 20 years = acceptable. Shows — when cash flow is negative." /></span>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{btlResults.annualCashFlow > 0 ? `${(btlResults.totalCashInvested / btlResults.annualCashFlow).toFixed(1)} yrs` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Break-even Rent<InfoIcon id="row-btl-breakeven" text="Minimum monthly rent needed to cover all costs including mortgage. Useful for stress-testing void periods and setting minimum rental thresholds." /></span>
                        <span className="text-sm font-medium" style={{ color: '#F59E0B' }}>{formatCurrency(btlResults.monthlyMortgageInterest + btlResults.totalOperatingCosts)}/mo</span>
                      </div>
                    </div>
                  </div>
                )}

                {missingFields.length === 0 && dealType === 'HMO' && (
                  <div className="space-y-3">
                    <RiskFlags flags={[
                      tenure === 'Leasehold' && leaseLengthYears > 0 && leaseLengthYears < 85
                        ? hmoResults.score === 'Strong' || hmoResults.score === 'Average'
                          ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
                          : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property'
                        : null,
                      sharedInputs.purchasePrice > 0 && hmoResults.monthlyCashFlow < 0
                        ? '⚠️ Negative cash flow — this deal costs you money every month'
                        : null,
                      sharedInputs.purchasePrice > 0 && hmoResults.grossYield < 7
                        ? hmoResults.score === 'Average'
                          ? '⚠️ Gross yield at ' + hmoResults.grossYield.toFixed(1) + '% — borderline for an HMO. Positive cash flow keeps this in Average territory — watch running costs carefully.'
                          : '⚠️ Gross yield at ' + hmoResults.grossYield.toFixed(1) + '% — below the 7% HMO threshold. Most investors expect higher yield from an HMO.'
                        : null,
                      sharedInputs.purchasePrice > 0 && hmoInputs.occupancyRate < 75
                        ? '⚠️ Occupancy at ' + hmoInputs.occupancyRate + '% — projections may be optimistic. Most HMOs run at 85-90% in practice.'
                        : null,
                      propertyData?.floodRisk && propertyData.floodRisk.includes('detected') && !propertyData.floodRisk.includes('No')
                        ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding'
                        : null,
                    ].filter(Boolean) as string[]} />
                    {/* Group 1 — WHAT I COMMIT */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">What I Commit</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Invested<InfoIcon id="g1-hmo-cash" text="Total cash required: deposit + stamp duty + refurb + HMO licence + other costs." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(hmoResults.totalCashInvested)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 2 — MONTHLY · ANNUAL */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{showAnnual ? 'Annual figures' : 'Monthly figures'}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setShowAnnual(false)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${!showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Monthly</button>
                          <button type="button" onClick={() => setShowAnnual(true)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Annual</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Mortgage<InfoIcon id="g2-hmo-mort" text="Monthly mortgage payment." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(hmoResults.monthlyMortgageInterest * 12) : formatCurrency(hmoResults.monthlyMortgageInterest)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(hmoResults.monthlyMortgageInterest)}/mo` : `${formatCurrency(hmoResults.monthlyMortgageInterest * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Operating Costs<InfoIcon id="g2-hmo-ops" text="Total monthly running costs: management fees + maintenance reserve + buildings insurance + void allowance." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(hmoResults.totalOperatingCosts * 12) : formatCurrency(hmoResults.totalOperatingCosts)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(hmoResults.totalOperatingCosts)}/mo` : `${formatCurrency(hmoResults.totalOperatingCosts * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Flow<InfoIcon id="g2-hmo-cf" text="Net monthly income after all costs and mortgage." /></span>
                          <span className="text-lg font-bold" style={{ color: (showAnnual ? hmoResults.annualCashFlow : hmoResults.monthlyCashFlow) >= 0 ? '#10B981' : '#EF4444' }}>{showAnnual ? formatCurrency(hmoResults.annualCashFlow) : formatCurrency(hmoResults.monthlyCashFlow)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(hmoResults.monthlyCashFlow)}/mo` : `${formatCurrency(hmoResults.annualCashFlow)}/yr`}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 3 — RETURNS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Returns</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">CoC ROI<InfoIcon id="g3-hmo-coc" text="Annual cash flow ÷ cash invested × 100. Benchmark: 12%+ strong for HMO." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(hmoResults.cashOnCashROI)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Gross Yield<InfoIcon id="g3-hmo-gy" text="Annual room income ÷ purchase price × 100. Benchmark: 7%+ for HMO, 10%+ strong." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(hmoResults.grossYield)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Profit/Room<InfoIcon id="g3-hmo-ppr" text="Monthly cash flow divided by number of rooms. Benchmark: £100–£150+ per room minimum. Useful for comparing HMOs of different sizes." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(hmoResults.monthlyCashFlow / Math.max(hmoInputs.rooms, 1))}/rm</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-0">
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Net Yield<InfoIcon id="row-hmo-nety" text="Net annual income after all costs ÷ purchase price × 100." /></span>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{formatPercent(hmoResults.netYield)}</span>
                      </div>
                      {marketValue > 0 && (
                        <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">Equity on Day One<InfoIcon id="row-hmo-equity" text="Market value minus purchase price. Instant equity from buying below market value. Only shows when market value is entered." /></span>
                          <span className="text-sm font-medium" style={{ color: equityDayOne > 0 ? '#1B3A6B' : '#EF4444' }}>{formatCurrency(equityDayOne)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Payback Period<InfoIcon id="row-hmo-payback" text="Years to recover your cash invested from net cash flow. Under 12 years = strong, under 20 years = acceptable. Shows — when cash flow is negative." /></span>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{hmoResults.annualCashFlow > 0 ? `${(hmoResults.totalCashInvested / hmoResults.annualCashFlow).toFixed(1)} yrs` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Break-even Rent<InfoIcon id="row-hmo-breakeven" text="Minimum total room income needed to cover all costs including mortgage." /></span>
                        <span className="text-sm font-medium" style={{ color: '#F59E0B' }}>{formatCurrency(hmoResults.monthlyMortgageInterest + hmoResults.totalOperatingCosts)}/mo</span>
                      </div>
                    </div>
                  </div>
                )}

                {missingFields.length === 0 && dealType === 'FLIP' && (
                  <div className="space-y-3">
                    <RiskFlags flags={[
                      sharedInputs.purchasePrice > 0 && flipResults.netProfit < 0
                        ? '⚠️ Deal makes a loss at these numbers — review purchase price or refurb costs'
                        : null,
                      sharedInputs.purchasePrice > 0 && flipResults.roi < 8
                        ? '⚠️ ROI at ' + flipResults.roi.toFixed(1) + '% — below the 8% flip threshold. Most investors expect 12%+ on a flip to justify the risk.'
                        : null,
                      propertyData?.floodRisk && propertyData.floodRisk.includes('detected') && !propertyData.floodRisk.includes('No')
                        ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding'
                        : null,
                    ].filter(Boolean) as string[]} />
                    {/* Group 1 — WHAT I COMMIT */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">What I Commit</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Total Cost In<InfoIcon id="g1-flip-cost" text="All costs to acquire and refurbish: purchase price + stamp duty + refurb + bridging interest + other costs." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(flipResults.totalCost)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Net Profit<InfoIcon id="g1-flip-profit" text="Expected sale price minus all costs. This is your take-home from the deal." /></span>
                          <span className="text-lg font-bold" style={{ color: flipResults.netProfit >= 0 ? '#10B981' : '#EF4444' }}>{formatCurrency(flipResults.netProfit)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 2 — MONTHLY · ANNUAL */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{showAnnual ? 'Total figures' : 'Per month figures'}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setShowAnnual(false)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${!showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Monthly</button>
                          <button type="button" onClick={() => setShowAnnual(true)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Annual</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Holding Costs<InfoIcon id="g2-flip-hold" text="Monthly costs during the project: insurance, council tax, utilities, finance charges." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(flipInputs.holdingCostsPerMonth * Math.max(flipInputs.projectLengthMonths, 1)) : formatCurrency(flipInputs.holdingCostsPerMonth)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(flipInputs.holdingCostsPerMonth)}/mo` : `${formatCurrency(flipInputs.holdingCostsPerMonth * Math.max(flipInputs.projectLengthMonths, 1))} total`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Profit<InfoIcon id="g2-flip-prof" text="Net profit divided by project length in months. Switch to Total to see the full deal profit." /></span>
                          <span className="text-lg font-bold" style={{ color: (showAnnual ? flipResults.netProfit : flipResults.profitPerMonth) >= 0 ? '#10B981' : '#EF4444' }}>{showAnnual ? `${formatCurrency(flipResults.netProfit)} total` : `${formatCurrency(flipResults.profitPerMonth)}/mo`}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(flipResults.profitPerMonth)}/mo` : `${formatCurrency(flipResults.netProfit)} total`}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 3 — RETURNS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Returns</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Total ROI<InfoIcon id="g3-flip-roi" text="Net profit ÷ total cost × 100. Benchmark: 8%+ acceptable, 12%+ strong." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(flipResults.roi)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Ann. ROI<InfoIcon id="g3-flip-ann" text="Total ROI annualised based on project length. Allows comparison with buy-and-hold strategies." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(flipResults.annualisedROI)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Profit on Cost<InfoIcon id="g3-flip-poc" text="Net profit ÷ total cost. Developer benchmark: 18%+ with planning permission, 25%+ without planning." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(flipResults.profitOnCost)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-0">
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Break-even Sale Price<InfoIcon id="row-flip-breakeven" text="Minimum sale price to recover all costs. The gap between this and your GDV is your safety margin." /></span>
                        <span className="text-sm font-medium" style={{ color: '#F59E0B' }}>{formatCurrency(flipResults.totalCost + flipResults.sellingCosts)}</span>
                      </div>
                      {marketValue > 0 && (
                        <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">Equity on Day One<InfoIcon id="row-flip-equity" text="Market value minus purchase price. Enter market value above to calculate." /></span>
                          <span className="text-sm font-medium" style={{ color: equityDayOne > 0 ? '#1B3A6B' : '#EF4444' }}>{formatCurrency(equityDayOne)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {missingFields.length === 0 && dealType === 'SA' && (
                  <div className="space-y-3">
                    <RiskFlags flags={[
                      tenure === 'Leasehold' && leaseLengthYears > 0 && leaseLengthYears < 85
                        ? saResults.score === 'Strong' || saResults.score === 'Average'
                          ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
                          : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property'
                        : null,
                      sharedInputs.purchasePrice > 0 && saResults.monthlyCashFlow < 0
                        ? '⚠️ Negative cash flow — review nightly rate or occupancy assumptions'
                        : null,
                      sharedInputs.purchasePrice > 0 && saInputs.occupancyPercent < 60
                        ? '⚠️ Occupancy at ' + saInputs.occupancyPercent + '% — most SA deals require 70%+ to stack. Consider whether local demand supports this.'
                        : null,
                      propertyData?.floodRisk && propertyData.floodRisk.includes('detected') && !propertyData.floodRisk.includes('No')
                        ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding'
                        : null,
                    ].filter(Boolean) as string[]} />
                    {/* Group 1 — WHAT I COMMIT */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">What I Commit</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Invested<InfoIcon id="g1-sa-cash" text="Total cash required: deposit + stamp duty + refurb + other costs." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(saResults.totalCashInvested)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 2 — MONTHLY · ANNUAL */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{showAnnual ? 'Annual figures' : 'Monthly figures'}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setShowAnnual(false)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${!showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Monthly</button>
                          <button type="button" onClick={() => setShowAnnual(true)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Annual</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Mortgage<InfoIcon id="g2-sa-mort" text="Monthly mortgage payment." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(saResults.monthlyMortgage * 12) : formatCurrency(saResults.monthlyMortgage)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(saResults.monthlyMortgage)}/mo` : `${formatCurrency(saResults.monthlyMortgage * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Operating Costs<InfoIcon id="g2-sa-ops" text="Total monthly running costs: management fees + maintenance reserve + buildings insurance + platform fees (Airbnb/Booking.com)." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(saResults.totalOperatingCosts * 12) : formatCurrency(saResults.totalOperatingCosts)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(saResults.totalOperatingCosts)}/mo` : `${formatCurrency(saResults.totalOperatingCosts * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Flow<InfoIcon id="g2-sa-cf" text="Net monthly income after all costs and mortgage." /></span>
                          <span className="text-lg font-bold" style={{ color: (showAnnual ? saResults.annualCashFlow : saResults.monthlyCashFlow) >= 0 ? '#10B981' : '#EF4444' }}>{showAnnual ? formatCurrency(saResults.annualCashFlow) : formatCurrency(saResults.monthlyCashFlow)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(saResults.monthlyCashFlow)}/mo` : `${formatCurrency(saResults.annualCashFlow)}/yr`}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 3 — RETURNS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Returns</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">CoC ROI<InfoIcon id="g3-sa-coc" text="Annual cash flow ÷ cash invested × 100. Benchmark: 10%+ strong for SA." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(saResults.cashOnCashROI)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Gross Yield<InfoIcon id="g3-sa-gy" text="Annual gross revenue ÷ purchase price × 100." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(saResults.grossYield)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-0">
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Net Yield<InfoIcon id="row-sa-nety" text="Net annual income after all costs ÷ purchase price × 100." /></span>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{formatPercent(saResults.netYield)}</span>
                      </div>
                      {marketValue > 0 && (
                        <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">Equity on Day One<InfoIcon id="row-sa-equity" text="Market value minus purchase price. Instant equity from buying below market value. Only shows when market value is entered." /></span>
                          <span className="text-sm font-medium" style={{ color: equityDayOne > 0 ? '#1B3A6B' : '#EF4444' }}>{formatCurrency(equityDayOne)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Payback Period<InfoIcon id="row-sa-payback" text="Years to recover your cash invested from net cash flow. Under 12 years = strong, under 20 years = acceptable. Shows — when cash flow is negative." /></span>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{saResults.annualCashFlow > 0 ? `${(saResults.totalCashInvested / saResults.annualCashFlow).toFixed(1)} yrs` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Break-even Occupancy<InfoIcon id="row-sa-breakeven" text="Minimum occupancy rate needed to cover all costs. Compare against your local market average to assess risk." /></span>
                        <span className="text-sm font-medium" style={{ color: '#F59E0B' }}>{(() => { const totalCosts = saResults.monthlyMortgage + saResults.totalOperatingCosts; const grossDailyRate = saInputs.nightlyRate * 30.4; const pct = grossDailyRate > 0 ? (totalCosts / grossDailyRate) * 100 : 0; return pct > 0 ? formatPercent(Math.min(pct, 100)) : '—'; })()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {missingFields.length === 0 && dealType === 'BRRR' && (
                  <div className="space-y-3">
                    <RiskFlags flags={[
                      tenure === 'Leasehold' && leaseLengthYears > 0 && leaseLengthYears < 85
                        ? brrrResults.score === 'Strong' || brrrResults.score === 'Average'
                          ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
                          : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property'
                        : null,
                      sharedInputs.purchasePrice > 0 && brrrResults.monthlyCashFlow < 0
                        ? '⚠️ Negative cash flow after refinance — deal does not self-fund'
                        : null,
                      sharedInputs.purchasePrice > 0 && brrrResults.cashLeftInDeal > 25000
                        ? brrrResults.score === 'Average'
                          ? '⚠️ £' + Math.round(brrrResults.cashLeftInDeal).toLocaleString() + ' left in deal — capital not fully recycled. Average score reflects positive cash flow but limited BRRR efficiency.'
                          : '⚠️ £' + Math.round(brrrResults.cashLeftInDeal).toLocaleString() + ' left in deal — over £25,000 tied up limits your ability to repeat the strategy.'
                        : null,
                      propertyData?.floodRisk && propertyData.floodRisk.includes('detected') && !propertyData.floodRisk.includes('No')
                        ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding'
                        : null,
                    ].filter(Boolean) as string[]} />
                    {/* Group 1 — WHAT I COMMIT */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">What I Commit</span>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Invested<InfoIcon id="g1-brrr-cash" text="Total cash before refinance: purchase + stamp duty + refurb + bridging interest + other costs." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(brrrResults.totalCostIn)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Left In<InfoIcon id="g1-brrr-left" text="Cash remaining in deal after refinance. Target: as close to £0 as possible. £0 means capital fully recycled." /></span>
                          <span className="text-lg font-bold" style={{ color: brrrResults.moneyOut || brrrResults.cashLeftInDeal <= 10000 ? '#10B981' : brrrResults.cashLeftInDeal <= 25000 ? '#F59E0B' : '#EF4444' }}>{brrrResults.moneyOut ? '∞ recycled' : formatCurrency(brrrResults.cashLeftInDeal)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Refinance Loan<InfoIcon id="g1-brrr-refi" text="The new long-term mortgage taken out after refinancing. Calculated as refinance % × post-refurb value." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(brrrResults.refinanceLoan)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 2 — MONTHLY · ANNUAL */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{showAnnual ? 'Annual figures' : 'Monthly figures'}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setShowAnnual(false)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${!showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Monthly</button>
                          <button type="button" onClick={() => setShowAnnual(true)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Annual</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Mortgage<InfoIcon id="g2-brrr-mort" text="Monthly refinance mortgage payment on the new long-term mortgage." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(brrrResults.monthlyMortgage * 12) : formatCurrency(brrrResults.monthlyMortgage)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(brrrResults.monthlyMortgage)}/mo` : `${formatCurrency(brrrResults.monthlyMortgage * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Operating Costs<InfoIcon id="g2-brrr-ops" text="Total monthly running costs: management fees + maintenance reserve + buildings insurance + void allowance." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(brrrResults.totalOperatingCosts * 12) : formatCurrency(brrrResults.totalOperatingCosts)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(brrrResults.totalOperatingCosts)}/mo` : `${formatCurrency(brrrResults.totalOperatingCosts * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Flow<InfoIcon id="g2-brrr-cf" text="Net monthly income after all costs and refinance mortgage." /></span>
                          <span className="text-lg font-bold" style={{ color: (showAnnual ? brrrResults.annualCashFlow : brrrResults.monthlyCashFlow) >= 0 ? '#10B981' : '#EF4444' }}>{showAnnual ? formatCurrency(brrrResults.annualCashFlow) : formatCurrency(brrrResults.monthlyCashFlow)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(brrrResults.monthlyCashFlow)}/mo` : `${formatCurrency(brrrResults.annualCashFlow)}/yr`}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 3 — RETURNS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Returns</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">CoC ROI<InfoIcon id="g3-brrr-coc" text="Annual cash flow ÷ cash left in deal × 100. The lower the cash left in, the higher this number. Infinite when capital is fully recycled." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{brrrResults.moneyOut ? '∞ (money out!)' : formatPercent(brrrResults.cashOnCashROI)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Gross Yield<InfoIcon id="g3-brrr-gy" text="Annual rent ÷ post-refurb value × 100." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(brrrResults.grossYield)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-0">
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Net Yield<InfoIcon id="row-brrr-nety" text="Net annual income ÷ post-refurb value × 100." /></span>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{formatPercent(brrrResults.netYield)}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Equity Created<InfoIcon id="row-brrr-equity" text="Post-refurb value minus total cost in — equity created through the refurbishment process." /></span>
                        <span className="text-sm font-medium" style={{ color: brrrInputs.postRefurbValue > 0 ? (brrrInputs.postRefurbValue - brrrResults.totalCostIn > 0 ? '#1B3A6B' : '#EF4444') : 'var(--muted-foreground)' }}>{brrrInputs.postRefurbValue > 0 ? formatCurrency(brrrInputs.postRefurbValue - brrrResults.totalCostIn) : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Break-even Rent<InfoIcon id="row-brrr-breakeven" text="Minimum monthly rent to cover refinance mortgage and all operating costs." /></span>
                        <span className="text-sm font-medium" style={{ color: '#F59E0B' }}>{formatCurrency(brrrResults.monthlyMortgage + brrrResults.totalOperatingCosts)}/mo</span>
                      </div>
                    </div>
                  </div>
                )}

                {missingFields.length === 0 && dealType === 'R2R' && (
                  <div className="space-y-3">
                    <RiskFlags flags={[
                      r2rInputs.setupCosts > 0 && r2rResults.monthlyProfit < 200
                        ? r2rResults.score === 'Average'
                          ? '⚠️ Monthly profit at £' + Math.round(r2rResults.monthlyProfit).toLocaleString() + ' — thin margin for R2R. One void month would significantly impact returns.'
                          : '⚠️ Monthly profit below £200 — does not meet typical R2R threshold. Review rent paid to landlord or room rates.'
                        : null,
                      propertyData?.floodRisk && propertyData.floodRisk.includes('detected') && !propertyData.floodRisk.includes('No')
                        ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding'
                        : null,
                    ].filter(Boolean) as string[]} />
                    {/* Group 1 — WHAT I COMMIT */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">What I Commit</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Setup Costs<InfoIcon id="g1-r2r-setup" text="One-off costs to set up the R2R: furniture, furnishings, admin and legal fees." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(r2rInputs.setupCosts)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Total Upfront<InfoIcon id="g1-r2r-upfront" text={`True total cash required to start: setup costs + landlord deposit (${r2rLandlordDepositMonths} month${r2rLandlordDepositMonths !== 1 ? 's' : ''}) + first month rent paid before income begins.`} /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(r2rInputs.setupCosts + (r2rInputs.monthlyRentPaid * r2rLandlordDepositMonths) + r2rInputs.monthlyRentPaid)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 2 — MONTHLY · ANNUAL */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{showAnnual ? 'Annual figures' : 'Monthly figures'}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setShowAnnual(false)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${!showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Monthly</button>
                          <button type="button" onClick={() => setShowAnnual(true)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Annual</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Landlord Rent<InfoIcon id="g2-r2r-rent" text="Monthly rent paid to the property owner under the R2R agreement. Your primary fixed cost." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(r2rInputs.monthlyRentPaid * 12) : formatCurrency(r2rInputs.monthlyRentPaid)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(r2rInputs.monthlyRentPaid)}/mo` : `${formatCurrency(r2rInputs.monthlyRentPaid * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Running Costs<InfoIcon id="g2-r2r-run" text="Monthly running costs: management/platform fees + monthly expenses." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency((r2rResults.managementFees + (r2rInputs.monthlyRunningCosts || 0)) * 12) : formatCurrency(r2rResults.managementFees + (r2rInputs.monthlyRunningCosts || 0))}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(r2rResults.managementFees + (r2rInputs.monthlyRunningCosts || 0))}/mo` : `${formatCurrency((r2rResults.managementFees + (r2rInputs.monthlyRunningCosts || 0)) * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Profit<InfoIcon id="g2-r2r-prof" text="Net monthly profit after landlord rent and all running costs." /></span>
                          <span className="text-lg font-bold" style={{ color: (showAnnual ? r2rResults.annualProfit : r2rResults.monthlyProfit) >= 0 ? '#10B981' : '#EF4444' }}>{showAnnual ? formatCurrency(r2rResults.annualProfit) : formatCurrency(r2rResults.monthlyProfit)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(r2rResults.monthlyProfit)}/mo` : `${formatCurrency(r2rResults.annualProfit)}/yr`}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 3 — RETURNS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Returns</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">ROI on Setup<InfoIcon id="g3-r2r-roi" text="Annual profit ÷ setup costs × 100. Benchmark: 50%+ strong, 25%+ average." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(r2rResults.roi)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Monthly Spread<InfoIcon id="g3-r2r-spread" text="Gross room income minus landlord rent — your gross margin before other costs. Benchmark: £300+ comfortable, £500+ strong." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(r2rResults.grossMonthlyIncome - r2rInputs.monthlyRentPaid)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-0">
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Gross Income/mo<InfoIcon id="row-r2r-gross" text="Total room income before any costs — your top line revenue before landlord rent and running costs." /></span>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{formatCurrency(r2rResults.grossMonthlyIncome)}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Payback Period<InfoIcon id="row-r2r-payback" text="Months to recover total upfront cash (setup costs + deposit + first month rent) from monthly profit. Under 6 months = strong, under 12 = acceptable." /></span>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{(() => { const totalUpfront = r2rInputs.setupCosts + (r2rInputs.monthlyRentPaid * r2rLandlordDepositMonths) + r2rInputs.monthlyRentPaid; return r2rResults.monthlyProfit > 0 ? `${Math.round(totalUpfront / r2rResults.monthlyProfit)} months` : '—'; })()}</span>
                      </div>
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Break-even Landlord Rent<InfoIcon id="row-r2r-breakeven" text="Maximum landlord rent you could pay and still break even at zero profit. Useful for negotiating lease terms." /></span>
                        <span className="text-sm font-medium" style={{ color: '#F59E0B' }}>{(() => { const maxRent = r2rResults.grossMonthlyIncome - (r2rResults.managementFees + (r2rInputs.monthlyRunningCosts || 0)); return maxRent > 0 ? `${formatCurrency(maxRent)}/mo` : '—'; })()}</span>
                      </div>
                    </div>
                  </div>
                )}

                {missingFields.length === 0 && dealType === 'SOCIAL' && (
                  <div className="space-y-3">
                    <RiskFlags flags={[
                      tenure === 'Leasehold' && leaseLengthYears > 0 && leaseLengthYears < 85
                        ? socialResults.score === 'Strong' || socialResults.score === 'Average'
                          ? '⚠️ Leasehold under 85 years — strong returns but most lenders will not mortgage this property. Verify financing before proceeding.'
                          : '⚠️ Leasehold under 85 years — most lenders will not mortgage this property'
                        : null,
                      sharedInputs.purchasePrice > 0 && socialResults.monthlyCashFlow < 0
                        ? '⚠️ Negative cash flow — lease income does not cover mortgage and costs'
                        : null,
                      propertyData?.floodRisk && propertyData.floodRisk.includes('detected') && !propertyData.floodRisk.includes('No')
                        ? '⚠️ Flood risk area detected nearby — verify with Environment Agency before proceeding'
                        : null,
                    ].filter(Boolean) as string[]} />
                    {/* Group 1 — WHAT I COMMIT */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">What I Commit</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Invested<InfoIcon id="g1-soc-cash" text="Total cash required: deposit + stamp duty + refurb + other costs." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(socialResults.totalCashInvested)}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 2 — MONTHLY · ANNUAL */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{showAnnual ? 'Annual figures' : 'Monthly figures'}</span>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setShowAnnual(false)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${!showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Monthly</button>
                          <button type="button" onClick={() => setShowAnnual(true)} className={`text-[9px] px-2 py-0.5 rounded-md font-medium transition-colors ${showAnnual ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground hover:bg-slate-200'}`}>Annual</button>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Mortgage<InfoIcon id="g2-soc-mort" text="Monthly mortgage payment." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(socialResults.monthlyMortgage * 12) : formatCurrency(socialResults.monthlyMortgage)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(socialResults.monthlyMortgage)}/mo` : `${formatCurrency(socialResults.monthlyMortgage * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Operating Costs<InfoIcon id="g2-soc-ops" text="Total monthly running costs. Typically lower for social housing as the housing provider manages day-to-day maintenance." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{showAnnual ? formatCurrency(socialResults.totalOperatingCosts * 12) : formatCurrency(socialResults.totalOperatingCosts)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(socialResults.totalOperatingCosts)}/mo` : `${formatCurrency(socialResults.totalOperatingCosts * 12)}/yr`}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Cash Flow<InfoIcon id="g2-soc-cf" text="Net monthly income after all costs and mortgage." /></span>
                          <span className="text-lg font-bold" style={{ color: (showAnnual ? socialResults.annualCashFlow : socialResults.monthlyCashFlow) >= 0 ? '#10B981' : '#EF4444' }}>{showAnnual ? formatCurrency(socialResults.annualCashFlow) : formatCurrency(socialResults.monthlyCashFlow)}</span>
                          <span className="text-[11px] text-muted-foreground">{showAnnual ? `${formatCurrency(socialResults.monthlyCashFlow)}/mo` : `${formatCurrency(socialResults.annualCashFlow)}/yr`}</span>
                        </div>
                      </div>
                    </div>
                    {/* Group 3 — RETURNS */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">Returns</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">CoC ROI<InfoIcon id="g3-soc-coc" text="Annual cash flow ÷ cash invested × 100. Social housing trades lower return for long-term stability and zero void risk. Benchmark: 3%+ average, 5%+ strong." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(socialResults.cashOnCashROI)}</span>
                        </div>
                        <div className="bg-slate-50 rounded-xl border border-border/60 p-3 flex flex-col justify-between min-h-[72px]">
                          <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground h-8 flex items-start gap-1">Gross Yield<InfoIcon id="g3-soc-gy" text="Annual guaranteed lease income ÷ purchase price × 100." /></span>
                          <span className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(socialResults.grossYield)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 space-y-0">
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Net Yield<InfoIcon id="row-soc-nety" text="Net annual income after all costs ÷ purchase price × 100." /></span>
                        <span className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>{formatPercent(socialResults.netYield)}</span>
                      </div>
                      {marketValue > 0 && (
                        <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">Equity on Day One<InfoIcon id="row-soc-equity" text="Market value minus purchase price. Instant equity from buying below market value. Only shows when market value is entered." /></span>
                          <span className="text-sm font-medium" style={{ color: equityDayOne > 0 ? '#1B3A6B' : '#EF4444' }}>{formatCurrency(equityDayOne)}</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">Break-even Lease Income<InfoIcon id="row-soc-breakeven" text="Minimum guaranteed lease income needed to cover mortgage and all running costs. Any income above this is your cash flow." /></span>
                        <span className="text-sm font-medium" style={{ color: '#F59E0B' }}>{formatCurrency(socialResults.monthlyMortgage + socialResults.totalOperatingCosts)}/mo</span>
                      </div>
                    </div>
                  </div>
                )}
                </>) : (
                  <div className="space-y-4">
                    {dealType === 'BTL' && (
                      <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-border">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Optimise for</p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, BTL: 'roi' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['BTL'] === 'roi' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>ROI</button>
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, BTL: 'cf' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['BTL'] === 'cf' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>Cash Flow</button>
                        </div>
                        {optimiserTarget['BTL'] === 'roi'
                          ? <div><p className="text-xs font-medium mb-1">Target ROI (%)</p><Input type="number" min={1} max={50} step={0.5} value={btlOfferROI} onChange={e => setBtlOfferROI(Number(e.target.value))} className="h-8 text-sm" placeholder="8" /></div>
                          : <div><p className="text-xs font-medium mb-1">Target Cash Flow (£/mo)</p><Input type="number" min={0} max={5000} step={50} value={btlOfferCF} onChange={e => setBtlOfferCF(Number(e.target.value))} className="h-8 text-sm" placeholder="250" /></div>}
                      </div>
                    )}
                    {dealType === 'HMO' && (
                      <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-border">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Optimise for</p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, HMO: 'roi' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['HMO'] === 'roi' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>ROI</button>
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, HMO: 'cf' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['HMO'] === 'cf' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>Cash Flow</button>
                        </div>
                        {optimiserTarget['HMO'] === 'roi'
                          ? <div><p className="text-xs font-medium mb-1">Target ROI (%)</p><Input type="number" min={1} max={50} step={0.5} value={hmoOfferROI} onChange={e => setHmoOfferROI(Number(e.target.value))} className="h-8 text-sm" placeholder="12" /></div>
                          : <div><p className="text-xs font-medium mb-1">Target Cash Flow (£/mo)</p><Input type="number" min={0} max={10000} step={50} value={hmoOfferCF} onChange={e => setHmoOfferCF(Number(e.target.value))} className="h-8 text-sm" placeholder="500" /></div>}
                      </div>
                    )}
                    {dealType === 'FLIP' && (
                      <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-border">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Optimise for</p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, FLIP: 'roi' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['FLIP'] === 'roi' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>Margin on Cost</button>
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, FLIP: 'cf' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['FLIP'] === 'cf' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>Min Profit</button>
                        </div>
                        {optimiserTarget['FLIP'] === 'roi'
                          ? <div><p className="text-xs font-medium mb-1">Min margin on cost (%)</p><Input type="number" min={1} max={50} step={1} value={flipOfferMargin} onChange={e => setFlipOfferMargin(Number(e.target.value))} className="h-8 text-sm" placeholder="18" /></div>
                          : <div><p className="text-xs font-medium mb-1">Min profit (£)</p><Input type="number" min={0} max={500000} step={1000} value={flipOfferMinProfit} onChange={e => setFlipOfferMinProfit(Number(e.target.value))} className="h-8 text-sm" placeholder="25000" /></div>}
                      </div>
                    )}
                    {dealType === 'SA' && (
                      <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-border">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Optimise for</p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, SA: 'roi' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['SA'] === 'roi' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>ROI</button>
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, SA: 'cf' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['SA'] === 'cf' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>Cash Flow</button>
                        </div>
                        {optimiserTarget['SA'] === 'roi'
                          ? <div><p className="text-xs font-medium mb-1">Target ROI (%)</p><Input type="number" min={1} max={100} step={0.5} value={saOfferROI} onChange={e => setSaOfferROI(Number(e.target.value))} className="h-8 text-sm" placeholder="15" /></div>
                          : <div><p className="text-xs font-medium mb-1">Target Cash Flow (£/mo)</p><Input type="number" min={0} max={10000} step={50} value={saOfferProfit} onChange={e => setSaOfferProfit(Number(e.target.value))} className="h-8 text-sm" placeholder="500" /></div>}
                      </div>
                    )}
                    {dealType === 'BRRR' && (
                      <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-border">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Optimise for</p>
                        <div className="pt-1">
                          <p className="text-xs font-medium mb-1">Max cash left in deal £</p>
                          <Input type="number" min={0} max={200000} step={1000} value={brrrOfferCashLeft} onChange={e => setBrrrOfferCashLeft(Number(e.target.value))} className="h-8 text-sm" />
                        </div>
                      </div>
                    )}
                    {dealType === 'R2R' && (
                      <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-border">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Optimise for</p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, R2R: 'roi' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['R2R'] === 'roi' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>ROI on Setup</button>
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, R2R: 'cf' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['R2R'] === 'cf' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>Monthly Profit</button>
                        </div>
                        {optimiserTarget['R2R'] === 'roi'
                          ? <div><p className="text-xs font-medium mb-1">Target ROI on setup (%)</p><Input type="number" min={0} max={500} step={5} value={r2rOfferROI} onChange={e => setR2rOfferROI(Number(e.target.value))} className="h-8 text-sm" placeholder="50" /></div>
                          : <div><p className="text-xs font-medium mb-1">Target monthly profit (£/mo)</p><Input type="number" min={0} max={5000} step={50} value={r2rOfferProfit} onChange={e => setR2rOfferProfit(Number(e.target.value))} className="h-8 text-sm" placeholder="500" /></div>}
                      </div>
                    )}
                    {dealType === 'SOCIAL' && (
                      <div className="space-y-2 p-3 rounded-xl bg-slate-50 border border-border">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Optimise for</p>
                        <div className="flex gap-1">
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, SOCIAL: 'roi' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['SOCIAL'] === 'roi' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>ROI</button>
                          <button type="button" onClick={() => setOptimiserTarget(prev => ({ ...prev, SOCIAL: 'cf' }))} className={`px-3 py-1 rounded-lg text-xs font-medium ${optimiserTarget['SOCIAL'] === 'cf' ? 'bg-[#1B3A6B] text-white' : 'bg-slate-100 text-muted-foreground'}`}>Cash Flow</button>
                        </div>
                        {optimiserTarget['SOCIAL'] === 'roi'
                          ? <div><p className="text-xs font-medium mb-1">Target ROI (%)</p><Input type="number" min={1} max={50} step={0.5} value={socialOfferROI} onChange={e => setSocialOfferROI(Number(e.target.value))} className="h-8 text-sm" placeholder="8" /></div>
                          : <div><p className="text-xs font-medium mb-1">Target Cash Flow (£/mo)</p><Input type="number" min={0} max={5000} step={50} value={socialOfferCF} onChange={e => setSocialOfferCF(Number(e.target.value))} className="h-8 text-sm" placeholder="250" /></div>}
                      </div>
                    )}

                    {dealType !== 'R2R' && sharedInputs.purchasePrice === 0 ? (
                      <p className="text-sm text-center text-muted-foreground py-3">Enter a purchase price above to calculate your maximum offer.</p>
                    ) : optimalOffer?.type === 'already_meets' ? (
                      <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                        <p className="text-sm font-semibold text-emerald-700">✓ Current price already meets all targets</p>
                        <p className="text-xs text-emerald-600">This deal stacks at {formatCurrency(sharedInputs.purchasePrice)}.</p>
                        <div className="pt-1 space-y-1">
                          <Row label="Cash-on-Cash ROI" value={formatPercent(optimalOffer.currentROI)} isBold />
                          <Row label={dealType === 'FLIP' ? 'Net Profit' : 'Monthly Cash Flow'} value={formatCurrency(optimalOffer.currentCF)} isBold />
                        </div>
                      </div>
                    ) : optimalOffer?.type === 'found' ? (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl border-2" style={{ borderColor: '#1B3A6B', background: 'rgba(27,58,107,0.04)' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                            {isAuctionPurchase ? "Maximum bid (excl. buyer's premium)" : 'Maximum purchase price'}
                          </p>
                          {isAuctionPurchase && (
                            <p className="text-xs text-amber-700 mt-1">Do not exceed this bid at auction — factor in buyer's premium separately.</p>
                          )}
                          <p className="text-3xl font-extrabold mt-1" style={{ color: '#1B3A6B' }}>{formatCurrency(optimalOffer.maxPrice)}</p>
                          <div className="mt-3 grid grid-cols-3 gap-1 text-center">
                            {dealType !== 'BRRR' && (
                              <div>
                                <p className="text-[10px] text-muted-foreground">{dealType === 'FLIP' ? 'Margin on cost' : 'Achieved ROI'}</p>
                                <p className="text-sm font-bold" style={{ color: '#1B3A6B' }}>{formatPercent(optimalOffer.achievedROI)}</p>
                              </div>
                            )}
                            {dealType !== 'BRRR' && (
                              <div>
                                <p className="text-[10px] text-muted-foreground">{dealType === 'FLIP' ? 'Net profit' : 'Monthly CF'}</p>
                                <p className="text-sm font-bold" style={{ color: '#1B3A6B' }}>
                                  {dealType === 'FLIP'
                                    ? formatCurrency(optimalOffer.achievedCF * Math.max(flipInputs.projectLengthMonths, 1))
                                    : formatCurrency(optimalOffer.achievedCF)}
                                </p>
                              </div>
                            )}
                            {dealType === 'BRRR' && 'brrrCashLeft' in optimalOffer && (
                              <div>
                                <p className="text-[10px] text-muted-foreground">Cash left in</p>
                                <p className="text-sm font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(optimalOffer.brrrCashLeft as number)}</p>
                              </div>
                            )}
                            {dealType !== 'FLIP' && dealType !== 'BRRR' && (
                              <div>
                                <p className="text-[10px] text-muted-foreground">Gross yield</p>
                                <p className="text-sm font-bold">{formatPercent(optimalOffer.achievedYield)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                        {sharedInputs.purchasePrice > 0 && optimalOffer.gap !== 0 && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-border space-y-1">
                            <Row label="Current price" value={formatCurrency(sharedInputs.purchasePrice)} />
                            <Row
                              label={optimalOffer.gap > 0 ? 'Negotiate down by' : 'Current price headroom'}
                              value={formatCurrency(Math.abs(optimalOffer.gap))}
                              isBold
                            />
                            <p className="text-[10px] text-muted-foreground pt-0.5">
                              {optimalOffer.gap > 0
                                ? 'Vendor needs to accept a reduction for this deal to stack at your targets.'
                                : 'Current price is already at or below your maximum offer.'}
                            </p>
                          </div>
                        )}
                        {(() => {
                          let line: string | null = null;
                          if (dealType === 'BTL' || dealType === 'HMO' || dealType === 'SA' || dealType === 'SOCIAL') {
                            const roi = dealType === 'BTL' ? btlOfferROI : dealType === 'HMO' ? hmoOfferROI : dealType === 'SA' ? saOfferROI : socialOfferROI;
                            const cf  = dealType === 'BTL' ? btlOfferCF  : dealType === 'HMO' ? hmoOfferCF  : dealType === 'SA' ? saOfferProfit : socialOfferCF;
                            line = optimiserTarget[dealType] === 'roi'
                              ? `At this price the deal hits your ${roi}% ROI target. Lead with a cash offer or short completion to justify the reduction.`
                              : `At this price the deal generates £${cf.toLocaleString()}/mo cash flow. Negotiate on price or agree a below-market rent review clause.`;
                          } else if (dealType === 'FLIP') {
                            line = optimiserTarget['FLIP'] === 'roi'
                              ? `At this price the deal hits your ${flipOfferMargin}% margin. Factor in 4-6 weeks of agent time when presenting your offer.`
                              : `At this price the deal generates ${formatCurrency(flipOfferMinProfit)} profit. Present a clean offer with minimal conditions to strengthen your position.`;
                          } else if (dealType === 'BRRR') {
                            const cashLeft = 'brrrCashLeft' in optimalOffer ? (optimalOffer.brrrCashLeft as number) : 0;
                            line = `At this price you leave ${formatCurrency(cashLeft)} in the deal. The stronger your refurb numbers, the more you can justify to the vendor.`;
                          }
                          return line ? <p className="text-xs text-muted-foreground italic mt-2">{line}</p> : null;
                        })()}
                      </div>
                    ) : optimalOffer?.type === 'r2r' ? (
                      <div className="space-y-3">
                        <div className="p-4 rounded-xl border-2" style={{ borderColor: '#1B3A6B', background: 'rgba(27,58,107,0.04)' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Max landlord rent</p>
                          <p className="text-3xl font-extrabold mt-1" style={{ color: '#1B3A6B' }}>{formatCurrency(Math.max(optimalOffer.maxLandlordRent, 0))}/mo</p>
                          {optimalOffer.maxLandlordRent < 0 && (
                            <p className="text-xs text-red-600 mt-1">Income is too low to hit this profit target. Increase room rates or reduce running costs.</p>
                          )}
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-border space-y-1">
                          <Row label="Your current landlord rent" value={formatCurrency(optimalOffer.currentLandlordRent)} />
                          <Row
                            label={optimalOffer.currentLandlordRent > optimalOffer.maxLandlordRent ? 'Negotiate down by' : 'Rent headroom'}
                            value={formatCurrency(Math.abs(optimalOffer.currentLandlordRent - optimalOffer.maxLandlordRent))}
                            isBold
                          />
                        </div>
                        <div className="p-3 bg-slate-50 rounded-xl border border-border">
                          <p className="text-xs font-medium text-muted-foreground mb-1">Max setup costs (from ROI target)</p>
                          <p className="text-lg font-bold" style={{ color: '#1B3A6B' }}>{formatCurrency(optimalOffer.maxSetupCosts)}</p>
                        </div>
                        <p className="text-xs text-muted-foreground italic mt-2">
                          {optimiserTarget['R2R'] === 'roi'
                            ? `At this rent the deal hits your ${r2rOfferROI}% ROI on setup. Offer a longer contract term to justify the lower rent.`
                            : `At this rent the deal generates £${r2rOfferProfit.toLocaleString()}/mo profit. Offer a longer contract term to justify the lower rent.`}
                        </p>
                      </div>
                    ) : optimalOffer?.type === 'no_solution' ? (
                      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                        <p className="text-sm font-semibold text-amber-800">No viable price found</p>
                        <p className="text-xs text-amber-700 mt-1">No purchase price satisfies your targets with these numbers. Try reducing your ROI or cash flow targets, or increasing income.</p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </div>

            {stressSupported && (
              <div className="bg-white overflow-hidden">
                <div className="mx-6 border-t border-border" />
                <button
                  type="button"
                  onClick={() => setStressTestOpen((v) => !v)}
                  aria-expanded={stressTestOpen}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 focus:outline-none focus:ring-0 transition-colors"
                  data-testid="toggle-stress-test"
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#1B3A6B] flex items-center gap-1.5">
                    Sensitivity Analysis
                    <InfoIcon id="sensitivity-analysis" text={TT.sensitivityAnalysis} />
                  </span>
                  <ChevronDown
                    className="h-4 w-4 transition-transform duration-200"
                    style={{ color: '#1B3A6B', transform: stressTestOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                  />
                </button>
                {stressTestOpen && (
                  <div className="border-t border-border">
                    {hasMinimumData ? (
                      <>
                        <div className="grid grid-cols-4 px-4 py-2 border-b border-border bg-slate-50">
                          <span className="text-xs text-muted-foreground col-span-1" />
                          <span className="text-xs font-semibold text-foreground text-right">Base Case</span>
                          <span className="text-xs font-semibold text-foreground text-right">Rent −10%</span>
                          <span className="text-xs font-semibold text-foreground text-right">Rate +1.5%</span>
                        </div>
                        <div className="grid grid-cols-4 px-4 py-2.5 border-b border-border">
                          <span className="text-sm text-muted-foreground col-span-1">Monthly CF</span>
                          {([
                            dealType === 'BTL' ? btlResults.monthlyCashFlow : dealType === 'HMO' ? hmoResults.monthlyCashFlow : dealType === 'SA' ? saResults.monthlyCashFlow : dealType === 'BRRR' ? brrrResults.monthlyCashFlow : socialResults.monthlyCashFlow,
                            stressRentDown.monthlyCashFlow,
                            stressRateUp.monthlyCashFlow,
                          ] as number[]).map((v, i) => (
                            <span key={i} className={`text-sm font-semibold tabular-nums text-right ${v > 0 ? 'text-emerald-600' : v < 0 ? 'text-destructive' : 'text-foreground'}`}>
                              {formatCurrency(v)}
                            </span>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 px-4 py-2.5">
                          <span className="text-sm text-muted-foreground col-span-1">CoC ROI</span>
                          {([
                            dealType === 'BTL' ? btlResults.cashOnCashROI : dealType === 'HMO' ? hmoResults.cashOnCashROI : dealType === 'SA' ? saResults.cashOnCashROI : dealType === 'BRRR' ? brrrResults.cashOnCashROI : socialResults.cashOnCashROI,
                            stressRentDown.cashOnCashROI,
                            stressRateUp.cashOnCashROI,
                          ] as number[]).map((v, i) => (
                            <span key={i} className={`text-sm font-semibold tabular-nums text-right ${v > 0 ? 'text-emerald-600' : v < 0 ? 'text-destructive' : 'text-foreground'}`}>
                              {i === 0 && dealType === 'BRRR' && brrrResults.moneyOut ? '\u221E' : isFinite(v) ? formatPercent(v) : '\u221E'}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">Enter deal numbers to see sensitivity analysis</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Show Workings Panel */}
            <div className="bg-white overflow-hidden pb-2">
              <div className="mx-6 border-t border-border" />
              <button
                type="button"
                onClick={() => setShowWorkingsOpen((v) => !v)}
                aria-expanded={showWorkingsOpen}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 focus:outline-none focus:ring-0 transition-colors"
                data-testid="toggle-show-workings"
              >
                <span className="text-xs font-semibold uppercase tracking-widest text-[#1B3A6B] flex items-center gap-1.5">
                  Show Workings
                  <InfoIcon id="show-workings" text={TT.showWorkings} />
                </span>
                <ChevronDown
                  className="h-4 w-4 transition-transform duration-200"
                  style={{ color: '#1B3A6B', transform: showWorkingsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
                />
              </button>
              {showWorkingsOpen && (
                <div className="border-t border-border p-4">
                  {hasMinimumData ? (
                    <>
                  {/* BTL */}
                  {dealType === 'BTL' && (
                    <>
                      <WSec title="A  CASH INVESTED" />
                      <WRow label={`Deposit (${sharedInputs.depositPercent}% of ${formatCurrency(sharedInputs.purchasePrice)})`} value={formatCurrency(sharedInputs.purchasePrice * sharedInputs.depositPercent / 100)} />
                      <WRow label="Stamp Duty / Tax" value={formatCurrency(effectiveTax)} />
                      <WRow label="Refurb Cost" value={formatCurrency(sharedInputs.refurbCost)} />
                      <WRow label="Other Costs" value={formatCurrency(sharedInputs.otherCosts)} />
                      {leaseExtensionCost !== '' && (leaseExtensionCost as number) > 0 && <WRow label="Lease Extension Cost" value={formatCurrency(leaseExtensionCost as number)} />}
                      {buyersPremiumValue > 0 && <WRow label="Buyer's Premium" value={formatCurrency(buyersPremiumValue)} />}
                      {auctionReservationFeeValue > 0 && <WRow label="Reservation Fee" value={formatCurrency(auctionReservationFeeValue)} />}
                      {sourcingFee > 0 && <WRow label="Sourcing Fee" value={formatCurrency(sourcingFee)} />}
                      <WRow label="TOTAL CASH INVESTED" value={formatCurrency(btlResults.totalCashInvested + (leaseExtensionCost === '' ? 0 : leaseExtensionCost as number) + buyersPremiumValue + auctionReservationFeeValue)} bold />
                      <WSec title="B  MONTHLY CASH FLOW" />
                      <WRow label="Monthly Rental Income" value={formatCurrency(btlInputs.monthlyRent)} />
                      <WRow label={`Void Allowance (${voidAllowancePercent}%)`} value={`(${formatCurrency(btlResults.voidAllowanceAmount)})`} />
                      <WRow label="Effective Rent" value={formatCurrency(btlResults.effectiveRent)} bold />
                      <WRow label={`Mgmt Fee (${managementFeePercent}%)`} value={`(${formatCurrency(btlResults.managementFeeAmount)})`} />
                      <WRow label="Maintenance Reserve" value={`(${formatCurrency(maintenanceReserve)})`} />
                      <WRow label="Buildings Insurance" value={`(${formatCurrency(buildingsInsurance)})`} />
                      {serviceCharge > 0 && <WRow label="Service Charge" value={`(${formatCurrency(serviceCharge)})`} />}
                      {groundRentAnnual > 0 && <WRow label="Ground Rent (monthly)" value={`(${formatCurrency(groundRentAnnual / 12)})`} />}
                      <WRow label="Total Operating Costs" value={`(${formatCurrency(btlResults.totalOperatingCosts)})`} bold />
                      <WRow label="Less: Mortgage" value={`(${formatCurrency(btlResults.monthlyMortgageInterest)})`} />
                      <WRow label="MONTHLY CASH FLOW" value={formatCurrency(btlResults.monthlyCashFlow)} bold color={btlResults.monthlyCashFlow < 0 ? '#EF4444' : '#22C55E'} />
                      <WSec title="C  KEY METRICS" />
                      <WRow label={`Gross Yield  (${formatCurrency(btlInputs.monthlyRent)} × 12) ÷ ${formatCurrency(sharedInputs.purchasePrice)} × 100`} value={formatPercent(btlResults.grossYield)} />
                      <WRow label="Net Yield" value={formatPercent(btlResults.netYield)} />
                      <WRow label={`CoC ROI  ${formatCurrency(btlResults.annualCashFlow)} ÷ ${formatCurrency(btlResults.totalCashInvested)} × 100`} value={formatPercent(btlResults.cashOnCashROI)} bold color='#1B3A6B' />
                    </>
                  )}
                  {/* HMO */}
                  {dealType === 'HMO' && (
                    <>
                      <WSec title="A  CASH INVESTED" />
                      <WRow label={`Deposit (${sharedInputs.depositPercent}% of ${formatCurrency(sharedInputs.purchasePrice)})`} value={formatCurrency(sharedInputs.purchasePrice * sharedInputs.depositPercent / 100)} />
                      <WRow label="Stamp Duty / Tax" value={formatCurrency(effectiveTax)} />
                      <WRow label="Refurb Cost" value={formatCurrency(sharedInputs.refurbCost)} />
                      <WRow label="Other Costs" value={formatCurrency(sharedInputs.otherCosts)} />
                      {hmoInputs.licenceCost > 0 && (
                        <WRow label="HMO Licence Cost" value={formatCurrency(hmoInputs.licenceCost)} />
                      )}
                      {leaseExtensionCost !== '' && (leaseExtensionCost as number) > 0 && <WRow label="Lease Extension Cost" value={formatCurrency(leaseExtensionCost as number)} />}
                      {buyersPremiumValue > 0 && <WRow label="Buyer's Premium" value={formatCurrency(buyersPremiumValue)} />}
                      {auctionReservationFeeValue > 0 && <WRow label="Reservation Fee" value={formatCurrency(auctionReservationFeeValue)} />}
                      {sourcingFee > 0 && <WRow label="Sourcing Fee" value={formatCurrency(sourcingFee)} />}
                      <WRow label="TOTAL CASH INVESTED" value={formatCurrency(hmoResults.totalCashInvested + (leaseExtensionCost === '' ? 0 : leaseExtensionCost as number) + buyersPremiumValue + auctionReservationFeeValue)} bold />
                      <WSec title="B  MONTHLY CASH FLOW" />
                      <WRow label="Total Room Income" value={formatCurrency(hmoResults.grossMonthlyRent)} />
                      <WRow label={`Void Allowance (${voidAllowancePercent}%)`} value={`(${formatCurrency(hmoResults.voidAllowanceAmount)})`} />
                      <WRow label="Effective Rent" value={formatCurrency(hmoResults.effectiveRent)} bold />
                      <WRow label={`Mgmt Fee (${managementFeePercent}%)`} value={`(${formatCurrency(hmoResults.managementFeeAmount)})`} />
                      <WRow label="Maintenance Reserve" value={`(${formatCurrency(maintenanceReserve)})`} />
                      <WRow label="Buildings Insurance" value={`(${formatCurrency(buildingsInsurance)})`} />
                      {serviceCharge > 0 && <WRow label="Service Charge" value={`(${formatCurrency(serviceCharge)})`} />}
                      {groundRentAnnual > 0 && <WRow label="Ground Rent (monthly)" value={`(${formatCurrency(groundRentAnnual / 12)})`} />}
                      <WRow label="Total Operating Costs" value={`(${formatCurrency(hmoResults.totalOperatingCosts)})`} bold />
                      <WRow label="Less: Mortgage" value={`(${formatCurrency(hmoResults.monthlyMortgageInterest)})`} />
                      <WRow label="MONTHLY CASH FLOW" value={formatCurrency(hmoResults.monthlyCashFlow)} bold color={hmoResults.monthlyCashFlow < 0 ? '#EF4444' : '#22C55E'} />
                      <WSec title="C  KEY METRICS" />
                      <WRow label={`Gross Yield  (${formatCurrency(hmoResults.grossMonthlyRent)} × 12) ÷ ${formatCurrency(sharedInputs.purchasePrice)} × 100`} value={formatPercent(hmoResults.grossYield)} />
                      <WRow label="Net Yield" value={formatPercent(hmoResults.netYield)} />
                      <WRow label={`CoC ROI  ${formatCurrency(hmoResults.annualCashFlow)} ÷ ${formatCurrency(hmoResults.totalCashInvested)} × 100`} value={formatPercent(hmoResults.cashOnCashROI)} bold color='#1B3A6B' />
                    </>
                  )}
                  {/* FLIP */}
                  {dealType === 'FLIP' && (
                    <>
                      <WSec title="A  TOTAL COSTS" />
                      <WRow label="Purchase Price" value={formatCurrency(sharedInputs.purchasePrice)} />
                      <WRow label="Stamp Duty / Tax" value={formatCurrency(effectiveTax)} />
                      <WRow label="Refurb Cost" value={formatCurrency(sharedInputs.refurbCost)} />
                      {flipInputs.contingencyPercent > 0 && (
                        <WRow label={`Contingency (${flipInputs.contingencyPercent}%)`} value={formatCurrency(sharedInputs.refurbCost * flipInputs.contingencyPercent / 100)} />
                      )}
                      {flipInputs.contingencyPercent > 0 && (
                        <WRow label="Adjusted Refurb Cost" value={formatCurrency(sharedInputs.refurbCost * (1 + flipInputs.contingencyPercent / 100))} bold />
                      )}
                      <WRow label="Other Costs" value={formatCurrency(sharedInputs.otherCosts)} />
                      {flipInputs.financingMethod === 'Bridging' && flipInputs.flipBridgingRate > 0 && flipInputs.flipBridgingTermMonths > 0 && (
                        <WRow label={`Bridging Interest (${flipInputs.flipBridgingLTV}% LTV × ${flipInputs.flipBridgingRate}%/mo × ${flipInputs.flipBridgingTermMonths} months)`} value={formatCurrency((sharedInputs.purchasePrice * (flipInputs.flipBridgingLTV / 100)) * (flipInputs.flipBridgingRate / 100) * flipInputs.flipBridgingTermMonths)} />
                      )}
                      <WRow label={`Holding Costs (${flipInputs.projectLengthMonths} months × ${formatCurrency(flipInputs.holdingCostsPerMonth)})`} value={formatCurrency(flipInputs.holdingCostsPerMonth * flipInputs.projectLengthMonths)} />
                      {sourcingFee > 0 && <WRow label="Sourcing Fee" value={formatCurrency(sourcingFee)} />}
                      <WRow label="TOTAL COST IN" value={formatCurrency(flipResults.totalCost)} bold />
                      <WSec title="B  PROFIT CALCULATION" />
                      <WRow label="Expected Sale Price (GDV)" value={formatCurrency(flipInputs.expectedSalePrice)} />
                      <WRow label="Less: Total Cost In" value={`(${formatCurrency(flipResults.totalCost)})`} />
                      <WRow label={`Less: Selling Costs (${flipInputs.sellingCostsPercent}%)`} value={`(${formatCurrency(flipResults.sellingCosts)})`} />
                      <WRow label="NET PROFIT" value={formatCurrency(flipResults.netProfit)} bold color={flipResults.netProfit < 0 ? '#EF4444' : '#22C55E'} />
                      <WSec title="C  KEY METRICS" />
                      <WRow label={`Profit per Month  ${formatCurrency(flipResults.netProfit)} ÷ ${flipInputs.projectLengthMonths} months`} value={formatCurrency(flipResults.profitPerMonth)} />
                      <WRow label={`Total ROI  ${formatCurrency(flipResults.netProfit)} ÷ ${formatCurrency(flipResults.totalCost)} × 100`} value={formatPercent(flipResults.roi)} bold />
                      <WRow label={`Annualised ROI  ${formatPercent(flipResults.roi)} × 12 ÷ ${flipInputs.projectLengthMonths}`} value={formatPercent(flipResults.annualisedROI)} bold color='#1B3A6B' />
                    </>
                  )}
                  {/* SA */}
                  {dealType === 'SA' && (
                    <>
                      <WSec title="A  CASH INVESTED" />
                      <WRow label={`Deposit (${sharedInputs.depositPercent}% of ${formatCurrency(sharedInputs.purchasePrice)})`} value={formatCurrency(sharedInputs.purchasePrice * sharedInputs.depositPercent / 100)} />
                      <WRow label="Stamp Duty / Tax" value={formatCurrency(effectiveTax)} />
                      <WRow label="Refurb Cost" value={formatCurrency(sharedInputs.refurbCost)} />
                      <WRow label="Other Costs" value={formatCurrency(sharedInputs.otherCosts)} />
                      {leaseExtensionCost !== '' && (leaseExtensionCost as number) > 0 && <WRow label="Lease Extension Cost" value={formatCurrency(leaseExtensionCost as number)} />}
                      {buyersPremiumValue > 0 && <WRow label="Buyer's Premium" value={formatCurrency(buyersPremiumValue)} />}
                      {auctionReservationFeeValue > 0 && <WRow label="Reservation Fee" value={formatCurrency(auctionReservationFeeValue)} />}
                      {sourcingFee > 0 && <WRow label="Sourcing Fee" value={formatCurrency(sourcingFee)} />}
                      <WRow label="TOTAL CASH INVESTED" value={formatCurrency(saResults.totalCashInvested + (leaseExtensionCost === '' ? 0 : leaseExtensionCost as number) + buyersPremiumValue + auctionReservationFeeValue)} bold />
                      <WSec title="B  MONTHLY CASH FLOW" />
                      <WRow label={`Monthly Revenue  ${formatCurrency(saInputs.nightlyRate)} nightly × ${saInputs.occupancyPercent}% occupancy`} value={formatCurrency(saResults.grossMonthlyRevenue)} />
                      <WRow label="Less: Platform Fees" value={`(${formatCurrency(saResults.platformFees)})`} />
                      <WRow label="Net Revenue (after platform fees)" value={formatCurrency(saResults.netMonthlyRevenue)} bold />
                      <WRow label={`Void Allowance (${voidAllowancePercent}%)`} value={`(${formatCurrency(saResults.voidAllowanceAmount)})`} />
                      <WRow label="Effective Revenue" value={formatCurrency(saResults.effectiveRent)} bold />
                      <WRow label={`Mgmt Fee (${managementFeePercent}%)`} value={`(${formatCurrency(saResults.managementFeeAmount)})`} />
                      <WRow label="Maintenance Reserve" value={`(${formatCurrency(maintenanceReserve)})`} />
                      <WRow label="Buildings Insurance" value={`(${formatCurrency(buildingsInsurance)})`} />
                      {serviceCharge > 0 && <WRow label="Service Charge" value={`(${formatCurrency(serviceCharge)})`} />}
                      {groundRentAnnual > 0 && <WRow label="Ground Rent (monthly)" value={`(${formatCurrency(groundRentAnnual / 12)})`} />}
                      <WRow label="Total Operating Costs" value={`(${formatCurrency(saResults.totalOperatingCosts)})`} bold />
                      <WRow label="Less: Mortgage" value={`(${formatCurrency(saResults.monthlyMortgage)})`} />
                      <WRow label="MONTHLY CASH FLOW" value={formatCurrency(saResults.monthlyCashFlow)} bold color={saResults.monthlyCashFlow < 0 ? '#EF4444' : '#22C55E'} />
                      <WSec title="C  KEY METRICS" />
                      <WRow label="Net Yield" value={formatPercent(saResults.netYield)} />
                      <WRow label={`CoC ROI  ${formatCurrency(saResults.annualCashFlow)} ÷ ${formatCurrency(saResults.totalCashInvested)} × 100`} value={formatPercent(saResults.cashOnCashROI)} bold color='#1B3A6B' />
                    </>
                  )}
                  {/* BRRR */}
                  {dealType === 'BRRR' && (
                    <>
                      <WSec title="A  CASH IN" />
                      <WRow label="Purchase Price" value={formatCurrency(sharedInputs.purchasePrice)} />
                      <WRow label="Stamp Duty / Tax" value={formatCurrency(effectiveTax)} />
                      <WRow label="Refurb Cost" value={formatCurrency(sharedInputs.refurbCost)} />
                      <WRow label="Other Costs" value={formatCurrency(sharedInputs.otherCosts)} />
                      {brrrInputs.bridgingRate > 0 && brrrInputs.bridgingTermMonths > 0 && (
                        <WRow label={`Bridging Interest (${brrrInputs.bridgingLTV}% LTV × ${brrrInputs.bridgingRate}%/mo × ${brrrInputs.bridgingTermMonths} months)`} value={formatCurrency((sharedInputs.purchasePrice * (brrrInputs.bridgingLTV / 100)) * (brrrInputs.bridgingRate / 100) * brrrInputs.bridgingTermMonths)} />
                      )}
                      {sourcingFee > 0 && <WRow label="Sourcing Fee" value={formatCurrency(sourcingFee)} />}
                      <WRow label="TOTAL COST IN" value={formatCurrency(brrrResults.totalCostIn)} bold />
                      <WSec title="B  REFINANCE" />
                      <WRow label="Post-Refurb Value (GDV)" value={formatCurrency(brrrInputs.postRefurbValue)} />
                      <WRow label="Refinance %" value={`${brrrInputs.refinancePercent}%`} />
                      <WRow label="Refinance Loan" value={formatCurrency(brrrResults.refinanceLoan)} />
                      <WRow label={brrrResults.moneyOut ? 'MONEY OUT' : 'CASH LEFT IN DEAL'} value={formatCurrency(Math.abs(brrrResults.cashLeftInDeal))} bold color={brrrResults.moneyOut ? '#22C55E' : undefined} />
                      <WSec title="C  MONTHLY CASH FLOW" />
                      <WRow label="Monthly Rental Income" value={formatCurrency(brrrInputs.monthlyRent)} />
                      <WRow label={`Void Allowance (${voidAllowancePercent}%)`} value={`(${formatCurrency(brrrResults.voidAllowanceAmount)})`} />
                      <WRow label="Effective Rent" value={formatCurrency(brrrResults.effectiveRent)} bold />
                      <WRow label={`Mgmt Fee (${managementFeePercent}%)`} value={`(${formatCurrency(brrrResults.managementFeeAmount)})`} />
                      <WRow label="Maintenance Reserve" value={`(${formatCurrency(maintenanceReserve)})`} />
                      <WRow label="Buildings Insurance" value={`(${formatCurrency(buildingsInsurance)})`} />
                      {serviceCharge > 0 && <WRow label="Service Charge" value={`(${formatCurrency(serviceCharge)})`} />}
                      {groundRentAnnual > 0 && <WRow label="Ground Rent (monthly)" value={`(${formatCurrency(groundRentAnnual / 12)})`} />}
                      <WRow label="Less: Refi Mortgage" value={`(${formatCurrency(brrrResults.monthlyMortgage)})`} />
                      <WRow label="MONTHLY CASH FLOW" value={formatCurrency(brrrResults.monthlyCashFlow)} bold color={brrrResults.monthlyCashFlow < 0 ? '#EF4444' : '#22C55E'} />
                      <WSec title="D  KEY METRICS" />
                      <WRow label="Gross Yield" value={formatPercent(brrrResults.grossYield)} />
                      <WRow label={`CoC ROI  ${formatCurrency(brrrResults.annualCashFlow)} ÷ ${brrrResults.moneyOut ? 'Money Out' : formatCurrency(brrrResults.cashLeftInDeal)} × 100`} value={brrrResults.moneyOut ? '\u221E' : formatPercent(brrrResults.cashOnCashROI)} bold color='#1B3A6B' />
                    </>
                  )}
                  {/* R2R */}
                  {dealType === 'R2R' && (
                    <>
                      <WSec title="A  CASH INVESTED" />
                      <WRow label="Setup Costs" value={formatCurrency(r2rInputs.setupCosts)} />
                      {r2rLandlordDepositMonths > 0 && <WRow label={`Landlord Deposit (${r2rLandlordDepositMonths} month${r2rLandlordDepositMonths !== 1 ? 's' : ''})`} value={formatCurrency(r2rInputs.monthlyRentPaid * r2rLandlordDepositMonths)} />}
                      {sourcingFee > 0 && <WRow label="Sourcing Fee" value={formatCurrency(sourcingFee)} />}
                      <WRow label="TOTAL CASH INVESTED" value={formatCurrency(r2rResults.totalCashInvested)} bold />
                      <WSec title="B  MONTHLY CASH FLOW" />
                      <WRow label="Gross Monthly Income" value={formatCurrency(r2rResults.grossMonthlyIncome)} />
                      <WRow label="Less: Landlord Rent" value={`(${formatCurrency(r2rInputs.monthlyRentPaid)})`} />
                      <WRow label="Monthly Spread" value={formatCurrency(r2rResults.grossMonthlyIncome - r2rInputs.monthlyRentPaid)} />
                      <WRow label="Less: Management Fees" value={`(${formatCurrency(r2rResults.managementFees)})`} />
                      <WRow label="Less: Running Costs" value={`(${formatCurrency(r2rInputs.monthlyRunningCosts)})`} />
                      <WRow label="MONTHLY PROFIT" value={formatCurrency(r2rResults.monthlyProfit)} bold color={r2rResults.monthlyProfit < 0 ? '#EF4444' : '#22C55E'} />
                      <WSec title="C  KEY METRICS" />
                      <WRow label={`ROI  ${formatCurrency(r2rResults.annualProfit)} ÷ ${formatCurrency(r2rResults.totalCashInvested)} × 100`} value={formatPercent(r2rResults.roi)} bold color='#1B3A6B' />
                    </>
                  )}
                  {/* SOCIAL */}
                  {dealType === 'SOCIAL' && (
                    <>
                      <WSec title="A  CASH INVESTED" />
                      <WRow label={`Deposit (${sharedInputs.depositPercent}% of ${formatCurrency(sharedInputs.purchasePrice)})`} value={formatCurrency(sharedInputs.purchasePrice * sharedInputs.depositPercent / 100)} />
                      <WRow label="Stamp Duty / Tax" value={formatCurrency(effectiveTax)} />
                      {sharedInputs.refurbCost > 0 && <WRow label="Refurb Cost" value={formatCurrency(sharedInputs.refurbCost)} />}
                      <WRow label="Other Costs" value={formatCurrency(sharedInputs.otherCosts)} />
                      {leaseExtensionCost !== '' && (leaseExtensionCost as number) > 0 && <WRow label="Lease Extension Cost" value={formatCurrency(leaseExtensionCost as number)} />}
                      {buyersPremiumValue > 0 && <WRow label="Buyer's Premium" value={formatCurrency(buyersPremiumValue)} />}
                      {auctionReservationFeeValue > 0 && <WRow label="Reservation Fee" value={formatCurrency(auctionReservationFeeValue)} />}
                      {sourcingFee > 0 && <WRow label="Sourcing Fee" value={formatCurrency(sourcingFee)} />}
                      <WRow label="TOTAL CASH INVESTED" value={formatCurrency(socialResults.totalCashInvested + (leaseExtensionCost === '' ? 0 : leaseExtensionCost as number) + buyersPremiumValue + auctionReservationFeeValue)} bold />
                      <WSec title="B  MONTHLY CASH FLOW" />
                      <WRow label="Monthly Lease Income" value={formatCurrency(socialInputs.leaseIncomePerMonth)} />
                      <WRow label={`Void Allowance (${voidAllowancePercent}%)`} value={`(${formatCurrency(socialResults.voidAllowanceAmount)})`} />
                      <WRow label="Effective Income" value={formatCurrency(socialResults.effectiveRent)} bold />
                      <WRow label={`Mgmt Fee (${managementFeePercent}%)`} value={`(${formatCurrency(socialResults.managementFeeAmount)})`} />
                      <WRow label="Maintenance Reserve" value={`(${formatCurrency(maintenanceReserve)})`} />
                      <WRow label="Buildings Insurance" value={`(${formatCurrency(buildingsInsurance)})`} />
                      {serviceCharge > 0 && <WRow label="Service Charge" value={`(${formatCurrency(serviceCharge)})`} />}
                      {groundRentAnnual > 0 && <WRow label="Ground Rent (monthly)" value={`(${formatCurrency(groundRentAnnual / 12)})`} />}
                      <WRow label="Total Operating Costs" value={`(${formatCurrency(socialResults.totalOperatingCosts)})`} bold />
                      <WRow label="Less: Mortgage" value={`(${formatCurrency(socialResults.monthlyMortgage)})`} />
                      <WRow label="MONTHLY CASH FLOW" value={formatCurrency(socialResults.monthlyCashFlow)} bold color={socialResults.monthlyCashFlow < 0 ? '#EF4444' : '#22C55E'} />
                      <WSec title="C  KEY METRICS" />
                      <WRow label="Gross Yield" value={formatPercent(socialResults.grossYield)} />
                      <WRow label={`CoC ROI  ${formatCurrency(socialResults.annualCashFlow)} ÷ ${formatCurrency(socialResults.totalCashInvested)} × 100`} value={formatPercent(socialResults.cashOnCashROI)} bold color='#1B3A6B' />
                    </>
                  )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">Enter deal numbers to see calculation workings</p>
                  )}
                </div>
              )}
            </div>
            </div>
          </div>
        </div>

        <div
          className="mt-8 bg-white rounded-2xl overflow-hidden p-6"
          style={{ boxShadow: '0 4px 16px rgba(27, 58, 107, 0.08)' }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">
            PREPARED BY
          </h3>
          {tierOverride === 'pro_plus' && (
          <div className="mb-4 space-y-1.5">
            <Label htmlFor="prepared-company" className="text-xs">Company / Trading Name</Label>
            <Input
              id="prepared-company"
              type="text"
              placeholder="Your company or trading name (optional)"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              data-testid="input-prepared-company"
            />
          </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="prepared-name" className="text-xs">Name</Label>
              <Input
                id="prepared-name"
                type="text"
                placeholder="Enter your name"
                value={preparedBy.name}
                onChange={(e) => setPreparedBy(prev => ({ ...prev, name: e.target.value }))}
                data-testid="input-prepared-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prepared-email" className="text-xs">Email</Label>
              <Input
                id="prepared-email"
                type="email"
                placeholder="Enter your email"
                value={preparedBy.email}
                onChange={(e) => setPreparedBy(prev => ({ ...prev, email: e.target.value }))}
                data-testid="input-prepared-email"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prepared-phone" className="text-xs">Phone Number</Label>
              <Input
                id="prepared-phone"
                type="tel"
                placeholder="Enter your phone number"
                value={preparedBy.phone}
                onChange={(e) => setPreparedBy(prev => ({ ...prev, phone: e.target.value }))}
                data-testid="input-prepared-phone"
              />
            </div>
          </div>

          {/* Address Protection */}
          <div className="mt-4 space-y-2 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="protect-address"
                checked={protectAddress}
                onChange={(e) => {
                  const on = e.target.checked;
                  setProtectAddress(on);
                  if (on && protectedAddressDescription === '') {
                    const inlinePostcode = /\b[A-Z]{1,2}\d{1,2}[A-Z]?\s*\d[A-Z]{2}\b/i;
                    const streetSuffix = /\b(Cl|Close|Rd|Road|St|Street|Ave|Avenue|Dr|Drive|Lane|Ln|Way|Terrace|Ter|Place|Pl|Crescent|Cres|Grove|Gv|Court|Ct|Row|Hill|View|Gardens|Gdns)\b/i;
                    const flatPrefix = /^(flat|apartment|unit|suite)\s+\d/i;
                    const cleaned = propertyAddress.split(',').map(s => s.trim()).filter(Boolean)
                      .map(s => s.replace(inlinePostcode, '').trim());
                    const nonPostcode = cleaned.filter(s =>
                      s.length >= 3 &&
                      !/^\d+[a-zA-Z]?$/.test(s) &&
                      !flatPrefix.test(s) &&
                      !((/\d/).test(s) && streetSuffix.test(s))
                    );
                    const cityParts = nonPostcode.slice(-2);
                    const city = cityParts.join(', ');
                    const stratLabels: Record<string, string> = {
                      BTL: 'Buy-to-Let', HMO: 'HMO', SA: 'Serviced Accommodation',
                      BRRR: 'BRRR', FLIP: 'Flip / Refurb', R2R: 'Rent to Rent', SOCIAL: 'Social Housing',
                    };
                    const strategyLabel = stratLabels[dealType] ?? dealType;
                    const descriptorParts: string[] = [];
                    if (bedrooms && Number(bedrooms) > 0) descriptorParts.push(`${bedrooms}-bed`);
                    if (propertyType) descriptorParts.push(propertyType);
                    if (city) descriptorParts.push(city);
                    const descriptor = descriptorParts.join(' ');
                    setProtectedAddressDescription(descriptor ? `${descriptor} — ${strategyLabel}` : strategyLabel);
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-[#1B3A6B] cursor-pointer"
              />
              <label htmlFor="protect-address" className="text-sm font-medium text-slate-700 flex items-center gap-1 cursor-pointer">
                Protect address on investor pack
                <InfoIcon id="protect-address-info" text="Protects you from investors approaching the vendor directly. The full address is replaced with an area description on the investor pack. Share the full address only after the sourcing fee is paid." />
              </label>
            </div>
            <p className="text-xs text-slate-400 pl-6">
              {protectAddress ? 'Address hidden — area description shown instead' : 'Full address shown on PDF'}
            </p>
            {protectAddress && (
              <div className="space-y-1.5 pl-0">
                <Label className="text-xs">Area description (shown on PDF instead of address)</Label>
                <input
                  type="text"
                  placeholder="e.g. Birmingham — 3-bed HMO, city centre"
                  value={protectedAddressDescription}
                  onChange={(e) => setProtectedAddressDescription(e.target.value)}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            )}
          </div>

          {/* Offer Deadline */}
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs">Offer Deadline</Label>
            <p className="text-xs text-slate-400 -mt-0.5">Optional — shown on last page of investor pack</p>
            <Input
              type="date"
              value={offerDeadline}
              onChange={(e) => setOfferDeadline(e.target.value)}
            />
          </div>

          {/* Viewing Available */}
          {dealType !== 'FLIP' && (
            <div className="mt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={viewingAvailable}
                  onChange={(e) => setViewingAvailable(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#1B3A6B]"
                />
                <span className="text-xs text-slate-600">Viewing available — include on investor pack</span>
              </label>
            </div>
          )}

          {/* Dev Tier Testing */}
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">🛠 Dev Tier Testing</p>
            <div className="flex gap-2">
              {(['free', 'pro', 'pro_plus'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTierOverride(t)}
                  className={`px-3 py-1 rounded text-xs font-medium border transition ${
                    tierOverride === t
                      ? 'bg-slate-600 text-white border-slate-600'
                      : 'bg-white text-slate-500 border-slate-300 hover:border-slate-500'
                  }`}
                >
                  {t === 'free' ? 'Free' : t === 'pro' ? 'Pro' : 'Pro Plus'}
                </button>
              ))}
            </div>
          </div>

          {/* Pack Format (Portrait / Landscape) */}
          {tierOverride === 'pro_plus' && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-1">
              <Label className="text-xs">Pack Format</Label>
              <InfoIcon id="pack-format" text="Portrait (A4) — 8-page investor pack optimised for email and print. Landscape (A4) — 10-page Pro Plus pack with SVG charts and glossary, optimised for screen sharing and presentations." />
            </div>
            <div className="inline-flex w-full p-1 rounded-lg bg-muted border border-border" role="radiogroup" aria-label="Pack format">
              <button
                type="button"
                role="radio"
                aria-checked={pdfOrientation === 'portrait'}
                onClick={() => setPdfOrientation('portrait')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${pdfOrientation === 'portrait' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <div>Portrait</div>
                <div className="text-[10px] font-normal text-muted-foreground">8 pages · Print &amp; email</div>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={pdfOrientation === 'landscape'}
                onClick={() => setPdfOrientation('landscape')}
                className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${pdfOrientation === 'landscape' ? 'bg-white shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <div>Landscape</div>
                <div className="text-[10px] font-normal text-muted-foreground">10 pages · Charts &amp; glossary</div>
              </button>
            </div>
          </div>
          )}

          {/* Cover Style */}
          {tierOverride === 'pro_plus' && (
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs">Cover Style <span className="text-slate-400 font-normal">(choose your {pdfOrientation} pack cover style)</span></Label>
            <div className="flex flex-wrap gap-4">

              {/* Classic */}
              <button
                type="button"
                onClick={() => setCoverStyle('classic')}
                className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg border-2 transition ${coverStyle === 'classic' ? 'border-[#1B3A6B]' : 'border-slate-200 hover:border-slate-300'}`}
              >
                {pdfOrientation === 'portrait' ? (
                  <svg width="60" height="80" viewBox="0 0 80 104" xmlns="http://www.w3.org/2000/svg">
                    <rect width="80" height="104" rx="3" fill={brandColour} />
                    <rect x="18" y="46" width="44" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
                    <rect x="22" y="54" width="36" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
                    <rect x="20" y="62" width="40" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
                  </svg>
                ) : (
                  <svg width="80" height="60" viewBox="0 0 120 88" xmlns="http://www.w3.org/2000/svg">
                    <rect width="120" height="88" rx="3" fill={brandColour} />
                    <rect x="28" y="36" width="64" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
                    <rect x="34" y="44" width="52" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
                    <rect x="31" y="52" width="58" height="3" rx="1.5" fill="rgba(255,255,255,0.5)" />
                  </svg>
                )}
                <span className="text-[10px] text-slate-600 font-medium">Classic</span>
              </button>

              {/* Clean */}
              <button
                type="button"
                onClick={() => setCoverStyle('clean')}
                className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg border-2 transition ${coverStyle === 'clean' ? 'border-[#1B3A6B]' : 'border-slate-200 hover:border-slate-300'}`}
              >
                {pdfOrientation === 'portrait' ? (
                  <svg width="60" height="80" viewBox="0 0 80 104" xmlns="http://www.w3.org/2000/svg">
                    <rect width="80" height="104" rx="3" fill="#F3F4F6" />
                    <rect x="0" y="0" width="4" height="104" fill={brandColour} />
                    <rect x="12" y="44" width="44" height="3" rx="1.5" fill="#CBD5E1" />
                    <rect x="12" y="52" width="36" height="3" rx="1.5" fill="#CBD5E1" />
                    <rect x="12" y="60" width="40" height="3" rx="1.5" fill="#CBD5E1" />
                    <rect x="12" y="88" width="56" height="1" fill={brandColour} fillOpacity="0.4" />
                  </svg>
                ) : (
                  <svg width="80" height="60" viewBox="0 0 120 88" xmlns="http://www.w3.org/2000/svg">
                    <rect width="120" height="88" rx="3" fill="#F3F4F6" />
                    <rect x="0" y="0" width="5" height="88" fill={brandColour} />
                    <rect x="14" y="34" width="68" height="3" rx="1.5" fill="#CBD5E1" />
                    <rect x="14" y="42" width="56" height="3" rx="1.5" fill="#CBD5E1" />
                    <rect x="14" y="50" width="62" height="3" rx="1.5" fill="#CBD5E1" />
                    <rect x="14" y="74" width="92" height="1" fill={brandColour} fillOpacity="0.4" />
                  </svg>
                )}
                <span className="text-[10px] text-slate-600 font-medium">Clean</span>
              </button>

              {/* Bold */}
              <button
                type="button"
                onClick={() => setCoverStyle('bold')}
                className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg border-2 transition ${coverStyle === 'bold' ? 'border-[#1B3A6B]' : 'border-slate-200 hover:border-slate-300'}`}
              >
                {pdfOrientation === 'portrait' ? (
                  <svg width="60" height="80" viewBox="0 0 80 104" xmlns="http://www.w3.org/2000/svg">
                    <rect width="80" height="104" rx="3" fill="#F3F4F6" />
                    <rect x="0" y="0" width="30" height="104" fill={brandColour} />
                    <rect x="36" y="52" width="32" height="3" rx="1.5" fill="#CBD5E1" />
                    <rect x="36" y="62" width="24" height="3" rx="1.5" fill="#CBD5E1" />
                  </svg>
                ) : (
                  <svg width="80" height="60" viewBox="0 0 120 88" xmlns="http://www.w3.org/2000/svg">
                    <rect width="120" height="88" rx="3" fill="#F3F4F6" />
                    <rect x="0" y="0" width="42" height="88" fill={brandColour} />
                    <rect x="52" y="40" width="52" height="3" rx="1.5" fill="#CBD5E1" />
                    <rect x="52" y="50" width="40" height="3" rx="1.5" fill="#CBD5E1" />
                  </svg>
                )}
                <span className="text-[10px] text-slate-600 font-medium">Bold</span>
              </button>

            </div>
          </div>
          )}

          {/* Brand Colour */}
          {tierOverride === 'pro_plus' && (
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs">Brand Colour</Label>
            <p className="text-xs text-slate-400 -mt-0.5">Used for cover background and section headers</p>
            <div className="flex items-center gap-3">
              <div
                className="relative h-10 w-10 rounded-lg border border-border shadow-sm cursor-pointer overflow-hidden flex-shrink-0"
                style={{ backgroundColor: brandColourDraft }}
              >
                <input
                  type="color"
                  value={brandColourDraft}
                  onChange={(e) => setBrandColourDraft(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  data-testid="input-brand-colour"
                />
              </div>
              <input
                type="text"
                value={brandColourDraft}
                onChange={(e) => setBrandColourDraft(e.target.value)}
                onBlur={(e) => {
                  if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                    setBrandColourDraft('#1B3A6B');
                    setBrandColour('#1B3A6B');
                  }
                }}
                className="font-mono text-xs border border-border rounded-md px-2 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]"
                maxLength={7}
                placeholder="#1B3A6B"
              />
              <button
                type="button"
                onClick={() => { setBrandColourDraft('#1B3A6B'); setBrandColour('#1B3A6B'); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                Reset to default
              </button>
            </div>
          </div>
          )}

          {/* Accent Colour */}
          {tierOverride === 'pro_plus' && (
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs">Accent Colour</Label>
            <p className="text-xs text-slate-400 -mt-0.5">Used for decorative rules and highlights</p>
            <div className="flex items-center gap-3">
              <div
                className="relative h-10 w-10 rounded-lg border border-border shadow-sm cursor-pointer overflow-hidden flex-shrink-0"
                style={{ backgroundColor: accentColourDraft }}
              >
                <input
                  type="color"
                  value={accentColourDraft}
                  onChange={(e) => setAccentColourDraft(e.target.value)}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                  data-testid="input-accent-colour"
                />
              </div>
              <input
                type="text"
                value={accentColourDraft}
                onChange={(e) => {
                  setAccentColourDraft(e.target.value);
                  if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) setAccentColour(e.target.value);
                }}
                onBlur={(e) => {
                  if (!/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                    setAccentColourDraft('#00C896');
                    setAccentColour('#00C896');
                  }
                }}
                className="font-mono text-xs border border-border rounded-md px-2 py-1.5 w-24 focus:outline-none focus:ring-1 focus:ring-[#1B3A6B]"
                maxLength={7}
                placeholder="#00C896"
              />
              <button
                type="button"
                onClick={() => { setAccentColourDraft('#00C896'); setAccentColour('#00C896'); }}
                className="text-xs text-slate-400 hover:text-slate-600 transition"
              >
                Reset to default
              </button>
            </div>
          </div>
          )}

          {/* Your Logo */}
          {tierOverride === 'pro_plus' && (
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs">Your Logo <span className="text-slate-400 font-normal">(appears on PDF cover)</span></Label>
            {logoBase64 ? (
              <div>
                <div className="flex items-center gap-3 p-2 border border-border rounded-lg bg-muted/30">
                  <img src={logoBase64} alt="Logo" className="h-10 object-contain max-w-[120px]" />
                  <button
                    type="button"
                    onClick={() => setLogoBase64(null)}
                    className="text-xs text-slate-400 hover:text-red-500 transition ml-auto"
                  >
                    ✕ Remove
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500">Logo Size:</span>
                  {(['S', 'M', 'L'] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setLogoSize(s)}
                      className={`w-8 h-7 rounded text-xs font-semibold border transition ${
                        logoSize === s
                          ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]'
                          : 'bg-white text-slate-600 border-border hover:border-[#1B3A6B]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <label className="flex items-center gap-2 p-2 border border-dashed border-border rounded-lg cursor-pointer hover:border-[#1B3A6B] transition bg-muted/20">
                <span className="text-xs text-slate-500">Click to upload PNG or JPG</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleLogoUpload}
                  className="hidden"
                  data-testid="input-logo-upload"
                />
              </label>
            )}
          </div>
          )}

          {/* Buttons */}
          <div className="mt-6 flex flex-col gap-3">
            {tierOverride !== 'free' && (
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeWorkingsInPDF}
                  onChange={(e) => setIncludeWorkingsInPDF(e.target.checked)}
                  className="w-3.5 h-3.5 accent-[#1B3A6B]"
                  data-testid="checkbox-include-workings"
                />
                <span className="text-xs text-slate-600">Include full calculation workings as a PDF appendix</span>
              </label>
            )}
            {tierOverride !== 'free' && (
              <button
                type="button"
                onClick={isIOS ? handlePreviewIOS : () => setPdfPreviewOpen(true)}
                disabled={iosGenerating}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm border-2 border-[#1B3A6B] text-[#1B3A6B] bg-white hover:bg-[#1B3A6B]/5 active:scale-[0.99] transition w-full disabled:opacity-60"
                data-testid="button-preview-pdf"
              >
                {iosGenerating ? 'Generating…' : 'Preview PDF'}
              </button>
            )}
            {tierOverride !== 'free' && (
              <PdfDownloadButton
                pdfProps={pdfProps}
                fileName={`DealScore-${(propertyAddress || 'Property').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)}-${dealLabel.replace(/[\s/]+/g, '-')}.pdf`}
                orientation={pdfOrientation}
              />
            )}
            <button
              type="button"
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-muted-foreground border border-border hover:bg-slate-100 transition-colors cursor-pointer"
              data-testid="button-reset"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </main>
    </div>

    {/* PDF Preview Modal */}
    {pdfPreviewOpen && createPortal(
      <div className="fixed inset-0 z-50 flex flex-col bg-black/80">
        <div className="flex items-center justify-between px-6 py-3 bg-[#1B3A6B] flex-shrink-0">
          <span className="text-white font-semibold text-sm">PDF Preview</span>
          <div className="flex items-center gap-4">
            <PdfDownloadButton
              pdfProps={pdfProps}
              fileName={`DealScore-${(propertyAddress || 'Property').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)}-${dealLabel.replace(/[\s/]+/g, '-')}.pdf`}
              orientation={pdfOrientation}
            />
            <button
              type="button"
              onClick={() => setPdfPreviewOpen(false)}
              className="text-white/70 hover:text-white text-2xl font-bold leading-none"
              aria-label="Close preview"
            >
              ×
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          {(() => {
            const ViewerComponent = pdfProps.tierOverride === 'pro_plus' && pdfOrientation === 'landscape' ? DealScorePDFProPlus : DealScorePDF;
            return (
              <PDFViewer width="100%" height="100%" showToolbar={false}>
                <ViewerComponent {...pdfProps} />
              </PDFViewer>
            );
          })()}
        </div>
      </div>,
      document.body
    )}

    {lightboxPhoto && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80"
        onClick={() => setLightboxPhoto(null)}
      >
        <div className="relative max-w-4xl max-h-[90vh] mx-4" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute -top-9 right-0 text-white hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-7 h-7" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Property photo"
            className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
          />
        </div>
      </div>,
      document.body
    )}
    </>
  );
}

function MetricBox({ label, value, highlight = false, tooltip }: { label: string, value: string, highlight?: boolean, tooltip?: string | { text: string; formula: string } }) {
  return (
    <div className="p-4 rounded-xl flex flex-col justify-center" style={{ backgroundColor: '#F0F4F8', border: '1px solid #E2E8F0' }}>
      <span className="text-xs text-muted-foreground mb-1 flex items-center gap-0.5">
        {label}
        {tooltip && <InfoIcon id={`mb-${label.replace(/[^a-z0-9]/gi, '')}`} text={tooltip} />}
      </span>
      <span className={`text-2xl font-bold tracking-tight ${highlight ? 'text-destructive' : 'text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

const PROPERTY_TYPES = ['Terraced', 'End of Terrace', 'Semi-Detached', 'Detached', 'Flat/Apartment', 'Bungalow', 'HMO', 'Commercial Conversion', 'Mixed Use'] as const;

function PropertyTypeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid="select-property-type"><SelectValue /></SelectTrigger>
      <SelectContent>
        {PROPERTY_TYPES.map((t) => (
          <SelectItem key={t} value={t}>{t}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function TenureSection({
  tenure,
  onChange,
  leaseLength,
  onLeaseLength,
  hint,
}: {
  tenure: 'Freehold' | 'Leasehold';
  onChange: (v: 'Freehold' | 'Leasehold') => void;
  leaseLength: number;
  onLeaseLength: (v: number) => void;
  hint?: string;
}) {
  return (
    <>
      <div className="space-y-2 md:col-span-2">
        <div className="flex items-center gap-1"><Label>Tenure</Label><InfoIcon id="ten-tenure" text={TT.tenure} /></div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onChange('Freehold')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${tenure === 'Freehold' ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3A6B]'}`}
          >
            Freehold
          </button>
          <button
            type="button"
            onClick={() => onChange('Leasehold')}
            className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors ${tenure === 'Leasehold' ? 'bg-[#1B3A6B] text-white border-[#1B3A6B]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#1B3A6B]'}`}
          >
            Leasehold
          </button>
        </div>
        {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      </div>
      {tenure === 'Leasehold' && (
        <>
          <div className="space-y-2">
            <div className="flex items-center gap-1"><Label>Remaining Lease Length (years)</Label><InfoIcon id="ten-ll" text={TT.leaseLength} /></div>
            <Input
              type="number"
              placeholder="Enter remaining lease length"
              value={leaseLength || ''}
              onChange={(e) => onLeaseLength(Number(e.target.value) || 0)}
              data-testid="input-lease-length"
            />
          </div>
          <div className="md:col-span-2 rounded-xl bg-amber-50 border border-amber-200 p-3">
            <p className="text-xs text-amber-800">
              Most mortgage lenders require 70+ years remaining on a lease. Ground rent over £250/year may affect mortgageability and lender eligibility.
            </p>
          </div>
        </>
      )}
    </>
  );
}

function TaxSection({
  country,
  buyerType,
  onCountry,
  onBuyerType,
  calculatedAmount,
  overrideActive,
  overrideEditing,
  manualValue,
  onStartOverride,
  onConfirmOverride,
  onResetOverride,
}: {
  country: Country;
  buyerType: BuyerType;
  onCountry: (v: Country) => void;
  onBuyerType: (v: BuyerType) => void;
  calculatedAmount: number;
  overrideActive: boolean;
  overrideEditing: boolean;
  manualValue: number;
  onStartOverride: () => void;
  onConfirmOverride: (v: number) => void;
  onResetOverride: () => void;
}) {
  const label = TAX_LABEL[country];
  const fmt = (n: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(n);
  const [taxDraft, setTaxDraft] = useState('');

  useEffect(() => {
    if (overrideEditing) {
      setTaxDraft(manualValue > 0 ? String(manualValue) : '');
    }
  }, [overrideEditing]);

  const commitDraft = () => {
    const parsed = parseFloat(taxDraft);
    onConfirmOverride(isNaN(parsed) ? 0 : parsed);
  };

  const handleCountryChange = (v: Country) => {
    onCountry(v);
    if (v === 'WALES' && (buyerType === 'FTB' || buyerType === 'NON_UK_RESIDENT')) {
      onBuyerType('STANDARD');
    }
    if (v === 'SCOTLAND' && buyerType === 'NON_UK_RESIDENT') {
      onBuyerType('STANDARD');
    }
  };

  const showFTB = country !== 'WALES';
  const showNonUK = country === 'ENGLAND';
  const displayAmount = overrideActive ? manualValue : calculatedAmount;

  return (
    <div className="md:col-span-2 rounded-xl bg-muted/40 border border-border p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 shrink-0">
          <Label className="text-sm font-semibold" style={{ color: '#1B3A6B' }}>
            Property Tax ({label})
          </Label>
          <InfoIcon id="tax-info" text={TT.propTax} />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          {overrideEditing ? (
            <>
              <Input
                type="text"
                inputMode="decimal"
                className="w-32 h-7 text-sm text-right font-semibold"
                style={{ color: '#1B3A6B' }}
                value={taxDraft}
                onChange={(e) => setTaxDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitDraft(); } }}
                autoFocus
              />
              <button
                type="button"
                onClick={commitDraft}
                className="text-xs font-medium text-green-700 hover:text-green-900 whitespace-nowrap"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={onResetOverride}
                className="text-xs text-slate-400 hover:text-slate-600 whitespace-nowrap"
              >
                Cancel
              </button>
            </>
          ) : (
            <>
              <span className="text-base font-bold" style={{ color: '#1B3A6B' }} data-testid="tax-amount">
                {fmt(displayAmount)}
                {overrideActive && <span className="text-xs font-normal text-slate-400 ml-1">(manual)</span>}
              </span>
              {overrideActive ? (
                <button
                  type="button"
                  onClick={onResetOverride}
                  className="text-xs text-slate-400 hover:text-slate-600 whitespace-nowrap"
                >
                  Reset to calculated
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onStartOverride}
                  className="text-xs text-[#1B3A6B] hover:underline whitespace-nowrap opacity-60 hover:opacity-100"
                >
                  Override
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Country</Label>
          <Select value={country} onValueChange={(v) => handleCountryChange(v as Country)}>
            <SelectTrigger data-testid="select-country"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ENGLAND">England / N. Ireland (SDLT)</SelectItem>
              <SelectItem value="WALES">Wales (LTT)</SelectItem>
              <SelectItem value="SCOTLAND">Scotland (LBTT)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Buyer Type</Label>
          <Select value={buyerType} onValueChange={(v) => onBuyerType(v as BuyerType)}>
            <SelectTrigger data-testid="select-buyer-type"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="STANDARD">Standard Buyer</SelectItem>
              {showFTB && <SelectItem value="FTB">First-Time Buyer</SelectItem>}
              <SelectItem value="ADDITIONAL">Additional Property / Buy-to-Let</SelectItem>
              <SelectItem value="COMPANY">Company / SPV Purchase</SelectItem>
              {showNonUK && <SelectItem value="NON_UK_RESIDENT">Non-UK Resident (+2%)</SelectItem>}
            </SelectContent>
          </Select>
        </div>
      </div>
      {country === 'WALES' && (
        <p className="text-xs text-muted-foreground italic">Wales has no first-time buyer relief</p>
      )}
    </div>
  );
}

function ResultsModeToggle({ value, onChange }: { value: 'analyse' | 'offer', onChange: (v: 'analyse' | 'offer') => void }) {
  const baseBtn = 'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors';
  const active = 'bg-white shadow-sm text-foreground';
  const inactive = 'text-muted-foreground hover:text-foreground';
  return (
    <div className="inline-flex w-full p-1 rounded-lg bg-muted border border-border" role="radiogroup" aria-label="Results mode">
      <button type="button" role="radio" aria-checked={value === 'analyse'} onClick={() => onChange('analyse')}
        className={`${baseBtn} ${value === 'analyse' ? active : inactive}`}>
        Deal Analyser
      </button>
      <button type="button" role="radio" aria-checked={value === 'offer'} onClick={() => onChange('offer')}
        className={`${baseBtn} ${value === 'offer' ? active : inactive}`}>
        Deal Optimiser
      </button>
    </div>
  );
}

function MortgageTypeToggle({ value, onChange }: { value: 'IO' | 'REPAYMENT', onChange: (v: 'IO' | 'REPAYMENT') => void }) {
  const baseBtn = 'flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-colors';
  const active = 'bg-white shadow-sm text-foreground';
  const inactive = 'text-muted-foreground hover:text-foreground';
  return (
    <div className="inline-flex w-full p-1 rounded-lg bg-muted border border-border" role="radiogroup" aria-label="Mortgage type">
      <button
        type="button"
        role="radio"
        aria-checked={value === 'IO'}
        onClick={() => onChange('IO')}
        className={`${baseBtn} ${value === 'IO' ? active : inactive}`}
        data-testid="toggle-mortgage-io"
      >
        Interest Only
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === 'REPAYMENT'}
        onClick={() => onChange('REPAYMENT')}
        className={`${baseBtn} ${value === 'REPAYMENT' ? active : inactive}`}
        data-testid="toggle-mortgage-repayment"
      >
        Repayment
      </button>
    </div>
  );
}

function Row({ label, value, isBold = false, tooltip }: { label: string, value: string, isBold?: boolean, tooltip?: string | { text: string; formula: string } }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-border/40 last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-0.5">
        {label}
        {tooltip && <InfoIcon id={`row-${label.replace(/[^a-z0-9]/gi, '')}`} text={tooltip} />}
      </span>
      <span className={`text-sm ${isBold ? 'font-bold text-[#1B3A6B]' : 'font-medium text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

const TT = {
  propAddress: 'The full address of the property being analysed. This appears on the investor PDF.',
  propType: 'The type of property — affects lender appetite and mortgage options.',
  tenure: 'Auto-detected from Land Registry where available. Verify against the title register before including in an investor pack.',
  leaseLength: 'Auto-populated from Land Registry where available. Always verify with the solicitor — Land Registry data may not reflect recent lease extensions.',
  purchasePrice: 'The price you are paying to buy the property. This is the starting point for all calculations.',
  propTax: 'Stamp Duty (England & Northern Ireland), LTT (Wales), or LBTT (Scotland). Automatically calculated based on country, buyer type, and purchase price.',
  refurbCost: 'The total cost of any renovation or refurbishment work needed before the property can be let or sold.',
  otherCosts: 'All other purchase costs — legal fees, survey, broker fees, and any other one-off costs.',
  deposit: 'The percentage of the purchase price you are putting in as a cash deposit. Most BTL lenders require 25%.',
  mortgageRate: 'The annual interest rate on your mortgage. Check with your broker for current BTL rates.',
  marketValue: 'The true open market value of the property — used to calculate BMV (Below Market Value) and equity on day one.',
  propDescription: 'Pre-filled with basic property details from the address lookup. Edit this to add condition, specification, and any details relevant to the investor.',
  comparables: 'Recent sold prices near this property, fetched from HM Land Registry. Data typically lags 2–6 months. Review and edit before including in the investor pack.',
  sourcingFee: 'The fee you are charging the investor for finding and packaging this deal. Appears prominently on the PDF.\n\nCommon benchmarks:\n• 2–3% of purchase price\n• 3–6 months of the investor\'s projected net monthly profit\n\nExample: On a £150,000 purchase at 2.5%, fee = £3,750. On a deal producing £350/mo net profit, 6 months = £2,100.\n\nAlways ask: would I happily pay this fee for this deal if I were the investor?',
  photoUpload: 'Upload up to 11 photos. The hero photo (★) appears as a preview on the executive summary page alongside your deal figures. All 11 photos — including the hero — then appear full-page in the Property Photos section of the investor pack, one photo per page.\n\nTo set a hero photo: click the ★ icon on any thumbnail. The hero defaults to your first uploaded photo.',
  monthlyRent: 'The monthly rental income you expect to receive from the tenant or tenants.',
  monthlyExpenses: 'All monthly running costs — insurance, maintenance reserve, letting agent fees, and any other regular costs. Do not include the mortgage payment.',
  numRooms: 'The total number of lettable rooms in the HMO.',
  rentPerRoom: 'The monthly rent charged per room. Multiplied by rooms and occupancy to get gross income.',
  occupancyRate: 'The percentage of time the rooms are occupied. 90% is a typical realistic assumption for a well-managed HMO.',
  nightlyRate: 'The nightly price you charge guests on Airbnb or Booking.com.',
  avgOccupancy: 'The percentage of nights per month the property is booked. 70% is a typical starting assumption — higher in cities, lower in seasonal locations.',
  platformFees: 'The commission charged by Airbnb or Booking.com. Airbnb typically charges 3% host fee; Booking.com charges 15%.',
  runningCosts: 'All monthly costs of running the SA — cleaning, consumables, utilities, and management fees.',
  postRefurbValue: 'The estimated market value of the property after the refurbishment is complete. Get this from a local estate agent or RICS surveyor.',
  refinancePct: 'The loan-to-value percentage your mortgage lender will offer against the post-refurb value. Most BTL lenders offer 75%.',
  newMortgageRate: 'The interest rate on the refinance mortgage you take out after the refurbishment.',
  holdingCosts: 'Monthly costs while you own the property during the refurbishment — utilities, council tax, insurance, and any other ongoing monthly costs.',
  projectLength: 'How many months from purchase to sale completion. Be realistic — most flips take longer than expected.',
  salePrice: 'The price you expect to achieve when selling the refurbished property. Base this on comparable sold prices nearby.',
  sellingCosts: 'Estate agent fees plus legal costs on the sale. Typically 1.5–2.5% of the sale price.',
  rentToLandlord: 'The fixed monthly rent you pay to the landlord. This is your biggest fixed cost and continues whether rooms are occupied or not.',
  setupCosts: 'One-off costs to set up the R2R — furniture, light works, landlord deposit, and any initial costs. This is what your ROI is calculated against.',
  mgmtFees: 'If you use a lettings agent or management company, their fee as a percentage of gross rent collected.',
  leaseIncome: 'The fixed monthly payment you receive from the council or housing association. This is guaranteed regardless of occupancy.',
  socialLeaseLength: 'The length of the guaranteed lease agreement with the council or housing association. Typically 3–5 years.',
  mgmtCosts: 'Any monthly costs for managing the property under the social housing lease. Often minimal as the council manages the tenants.',
  tabBtl: 'Buy-to-Let: Buy a property and rent it to a single household. The most straightforward rental strategy.',
  tabHmo: 'House in Multiple Occupation: Rent individual rooms to separate tenants. Higher income but more management and licensing required.',
  tabFlip: 'Flip / Refurb: Buy below market value, renovate, and sell for a profit. Active strategy with no ongoing rental income.',
  tabSa: 'Serviced Accommodation: Short-term letting via Airbnb or Booking.com. Highest income potential but most management intensive.',
  tabBrrr: 'Buy, Refurb, Refinance, Rent, Repeat: Add value through renovation, refinance to pull your money back out, then hold and rent. Best for scaling a portfolio.',
  tabR2r: 'Rent to Rent: Rent a property from a landlord and sublet it at a higher rate. No mortgage or purchase required — low entry cost.',
  tabSocial: 'Social Housing: Lease your property to a council or housing association on a guaranteed fixed-term contract. No voids, lower management, stable income.',
  dealScore: { text: 'The overall rating of this deal based on UK investor standards.', formula: 'Recommended = excellent returns\nConditional = acceptable but room for improvement\nNot Recommended = does not meet investment criteria' },
  cashInvested: { text: 'The total cash you need to deploy to complete this deal — deposit plus stamp duty/LTT plus refurb costs plus other costs.', formula: '(Purchase Price × Deposit%) + Property Tax + Refurb Cost + Other Costs' },
  mortgageAmount: { text: 'The mortgage loan required — purchase price minus your deposit.', formula: 'Purchase Price − Deposit' },
  monthlyFlow: { text: 'What you actually receive each month after paying the mortgage and all running costs. This is your net monthly income from the deal.', formula: 'Monthly Rent − Mortgage Payment − Monthly Expenses' },
  annualFlow: { text: 'Your total net income from the deal over 12 months after all costs including mortgage.', formula: 'Monthly Cash Flow × 12' },
  grossYield: { text: 'Annual rental income as a percentage of the purchase price. A quick benchmark for comparing properties — does not account for any costs.', formula: '(Monthly Rent × 12) ÷ Purchase Price × 100' },
  netYield: { text: 'Annual operating income minus running costs, as a percentage of purchase price. Excludes mortgage — this is the property-level return regardless of how it is financed.', formula: '((Monthly Rent − Expenses) × 12) ÷ Purchase Price × 100' },
  cocRoi: { text: 'Your annual cash flow as a percentage of the total cash you invested. This is the investor-level return — includes the effect of your mortgage.', formula: '(Annual Cash Flow ÷ Total Cash Invested) × 100' },
  equityDayOne: { text: 'The difference between market value and purchase price. This is the paper equity you gain immediately by buying below market value.', formula: 'Market Value − Purchase Price' },
  bmv: { text: 'How much below market value you are buying the property, shown as both a pound amount and a percentage. A key metric for investors — higher BMV means more built-in equity and a stronger deal.', formula: '(Market Value − Purchase Price) ÷ Market Value × 100' },
  hmoGrossRent: { text: 'Total monthly rent from all rooms at the entered occupancy rate.', formula: 'Rooms × Rent Per Room × Occupancy %' },
  flipTotalCost: { text: 'Everything you spend to acquire, refurbish, hold, and prepare the property for sale — purchase price, tax, refurb, other costs, and holding costs.', formula: 'Purchase Price + Tax + Refurb + Other Costs + (Holding Costs × Project Months)' },
  flipSellingCosts: { text: 'Estate agent fees and legal costs on the sale, calculated as a percentage of the sale price.', formula: 'Sale Price × Selling Costs %' },
  flipNetProfit: { text: 'What you actually make from the flip after all costs and selling fees. This is the money in your pocket.', formula: 'Sale Price − Total Cost − Selling Costs' },
  profitPerMonth: { text: 'Net profit divided by project length. Useful for comparing flips of different durations on a level playing field.', formula: 'Net Profit ÷ Project Length (Months)' },
  flipTotalROI: { text: 'Net profit as a percentage of total money invested in the deal. The headline return on a flip.', formula: '(Net Profit ÷ Total Cost) × 100' },
  annualisedROI: { text: 'Total ROI scaled to a 12-month equivalent. Allows fair comparison between flips of different lengths and other investment strategies.', formula: 'Total ROI × (12 ÷ Project Length Months)' },
  saGrossRev: { text: 'Total monthly revenue before platform fees — nightly rate multiplied by occupancy percentage multiplied by average days in a month.', formula: 'Nightly Rate × Occupancy % × (365 ÷ 12)' },
  saNetRev: { text: 'Monthly revenue after platform fees are deducted. This is your income before mortgage and running costs.', formula: 'Gross Revenue − (Gross Revenue × Platform Fees %)' },
  brrrRefinanceLoan: { text: 'The new mortgage raised against the post-refurb value. This is the money pulled back out of the deal.', formula: 'Post-Refurb Value × Refinance %' },
  brrrCashLeft: { text: 'Total cost in minus refinance loan. This is how much of your own money remains tied up in the property. The closer to zero the better.', formula: 'Total Cost In − Refinance Loan' },
  equityCreated: { text: 'The value added by buying below market value and refurbishing — post-refurb value minus total cost in.', formula: 'Post-Refurb Value − Purchase Price − Refurb Cost − Other Costs' },
  r2rGrossIncome: { text: 'Total monthly income from all rooms at the entered occupancy rate before any fees or costs.', formula: 'Rooms × Rent Per Room × Occupancy %' },
  r2rMgmtFees: { text: 'Monthly letting agent or management company fees, calculated as a percentage of gross income.', formula: 'Gross Monthly Income × Management Fees %' },
  r2rNetIncome: { text: 'Monthly income after management fees are deducted.', formula: 'Gross Monthly Income − Management Fees' },
  r2rMonthlyProfit: { text: 'What you actually keep each month — net income minus rent paid to landlord minus monthly running costs. This is the key R2R metric.', formula: 'Net Income − Rent to Landlord − Running Costs' },
  r2rAnnualProfit: { text: 'Monthly profit multiplied by 12. Your total annual earnings from this R2R deal.', formula: 'Monthly Profit × 12' },
  r2rGrossReturn: { text: 'Annual gross income as a percentage of your setup costs. Shows the raw income power of the deal relative to your upfront investment.', formula: '(Annual Gross Income ÷ Setup Costs) × 100' },
  r2rMonthlySpread: { text: 'Monthly Spread is the difference between gross rental income and the landlord rental payment. This is the primary income metric for Rent-to-Rent.', formula: 'Gross Monthly Income − Landlord Rent' },
  r2rNetReturn: { text: 'Annual net profit as a percentage of your setup costs. The true ROI on an R2R deal — this is what you actually earn on your invested capital.', formula: '(Annual Net Profit ÷ Setup Costs) × 100' },
  socialGrossYield: { text: 'Annual guaranteed lease income as a percentage of purchase price.', formula: '(Monthly Lease Income × 12) ÷ Purchase Price × 100' },
  socialNetYield: { text: 'Annual lease income minus management costs, as a percentage of purchase price. The property-level return before financing.', formula: '((Lease Income − Management Costs) × 12) ÷ Purchase Price × 100' },
  socialCocRoi: { text: 'Annual cash flow as a percentage of cash invested. Your leveraged return as an investor.', formula: '(Annual Cash Flow ÷ Total Cash Invested) × 100' },
  sensitivityAnalysis: 'Shows how this deal performs under two adverse scenarios. Rent −10% reduces gross monthly income by 10%. Rate +1.5% increases the mortgage rate by 1.5%. Both scenarios recalculate Monthly Cash Flow and Cash-on-Cash ROI.',
  showWorkings: 'Step-by-step breakdown of how each metric is calculated, using your actual deal numbers. Expand to verify the workings behind the results.',
};

function RiskFlags({ flags }: { flags: string[] }) {
  if (flags.length === 0) return null;
  return (
    <div style={{
      background: '#FFF8E7',
      border: '1.5px solid #F59E0B',
      borderRadius: 8,
      padding: '8px 12px',
      marginBottom: 12,
    }}>
      {flags.map((flag, i) => (
        <div key={i} style={{
          fontSize: 12,
          fontFamily: 'Arial, sans-serif',
          color: '#92400E',
          lineHeight: 1.5,
          paddingTop: i > 0 ? 4 : 0,
        }}>
          {flag}
        </div>
      ))}
    </div>
  );
}

function PropertyDataPanel({
  data,
  loading,
  open,
  onToggle,
}: {
  data: {
    detectedTenure: string | null;
    detectedPropertyType: string | null;
    floorArea: number | null;
    epcRating: string | null;
    potentialEpcRating: string | null;
    constructionDate: string | null;
    mainHeating: string | null;
    heatingCostCurrent: number | null;
    environmentalImpactCurrent: number | null;
    energyConsumptionCurrent: number | null;
    epcMatchStatus: 'no_match' | null;
    epcExpired: boolean;
    epcExpiryDate: string | null;
    floodRisk: string | null;
  } | null;
  loading: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  if (!loading && !data) return null;

  const epcColors: Record<string, string> = {
    A: '#008054', B: '#19b459', C: '#8dce46',
    D: '#ffd500', E: '#fcaa65', F: '#ef8023', G: '#e9153b',
  };

  const EpcBadge = ({ rating }: { rating: string }) => (
    <span style={{
      display: 'inline-block',
      background: epcColors[rating] || '#888',
      color: '#fff',
      fontWeight: 700,
      padding: '1px 7px',
      borderRadius: 4,
      fontSize: 12,
    }}>{rating}</span>
  );

  return (
    <div style={{ marginBottom: 16, gridColumn: '1 / -1' }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          background: '#EEF2F8',
          border: '1.5px solid #C5D3E8',
          borderRadius: open ? '8px 8px 0 0' : 8,
          padding: '8px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: 13,
          fontFamily: 'Arial, sans-serif',
          color: '#1B3A6B',
          fontWeight: 600,
        }}
      >
        <span>🏠 Property Intelligence {loading ? '— Looking up...' : '— Data from public records'}</span>
        <span style={{ fontSize: 11 }}>{open ? '▲ Hide' : '▼ Show'}</span>
      </button>

      {open && (
        <div style={{
          background: '#F8FAFC',
          border: '1.5px solid #C5D3E8',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '12px 14px',
        }}>
          {loading ? (
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, fontFamily: 'Arial, sans-serif' }}>
              Checking Land Registry, EPC Register and Environment Agency...
            </p>
          ) : data ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', fontSize: 12, fontFamily: 'Arial, sans-serif' }}>
              {data.floorArea && (
                <div>
                  <span style={{ color: '#64748B' }}>Floor area: </span>
                  <span style={{ color: '#1B3A6B', fontWeight: 700 }}>{Math.round(data.floorArea)} m²</span>
                </div>
              )}
              {data.epcRating ? (
                <>
                  <div>
                    <span style={{ color: '#64748B' }}>EPC rating: </span>
                    <EpcBadge rating={data.epcRating} />
                    {data.potentialEpcRating && data.potentialEpcRating !== data.epcRating && (
                      <span style={{ color: '#64748B', marginLeft: 4 }}>
                        → <EpcBadge rating={data.potentialEpcRating} />
                        <span style={{ color: '#94A3B8', fontSize: 11, marginLeft: 3 }}>potential</span>
                      </span>
                    )}
                  </div>
                  {data.epcExpired && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: '#92400e', fontStyle: 'italic' }}>
                        ⚠️ This EPC certificate expired on {data.epcExpiryDate
                          ? new Date(data.epcExpiryDate + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
                          : 'an unknown date'} — data may be outdated, please verify
                      </span>
                    </div>
                  )}
                </>
              ) : data.epcMatchStatus === 'no_match' ? (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: '#92400e', fontStyle: 'italic' }}>
                    ⚠️ EPC data exists for this postcode but couldn't be matched to this specific address — please verify manually
                  </span>
                </div>
              ) : (
                <div>
                  <span style={{ color: '#64748B' }}>EPC rating: </span>
                  <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>No certificate found</span>
                </div>
              )}
              {data.constructionDate && (
                <div>
                  <span style={{ color: '#64748B' }}>Built: </span>
                  <span style={{ color: '#1B3A6B', fontWeight: 700 }}>{data.constructionDate}</span>
                </div>
              )}
              {data.mainHeating && (
                <div>
                  <span style={{ color: '#64748B' }}>Heating: </span>
                  <span style={{ color: '#1B3A6B', fontWeight: 700 }}>{data.mainHeating}</span>
                </div>
              )}
              {data.heatingCostCurrent != null && (
                <div>
                  <span style={{ color: '#64748B' }}>Est. heating cost: </span>
                  <span style={{ color: '#1B3A6B', fontWeight: 700 }}>£{data.heatingCostCurrent.toLocaleString()}/yr</span>
                </div>
              )}
              {data.energyConsumptionCurrent != null && (
                <div>
                  <span style={{ color: '#64748B' }}>Energy use: </span>
                  <span style={{ color: '#1B3A6B', fontWeight: 700 }}>{data.energyConsumptionCurrent} kWh/m²/yr</span>
                </div>
              )}
              {data.floodRisk && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <span style={{ color: '#64748B' }}>Flood risk: </span>
                  <span style={{
                    color: data.floodRisk.includes('detected') && !data.floodRisk.includes('No') ? '#b45309' : '#16a34a',
                    fontWeight: 600,
                  }}>{data.floodRisk}</span>
                </div>
              )}
              <div style={{ gridColumn: '1 / -1', marginTop: 4, paddingTop: 6, borderTop: '1px solid #E2E8F0' }}>
                <span style={{ color: '#94A3B8', fontSize: 11 }}>
                  Source: Land Registry, EPC Register, Environment Agency. Address suggestions may occasionally show an incorrect postcode on streets with more than one postcode. All fields remain editable.
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

const DS_TOOLTIP_EVENT = 'ds:tt';

function InfoIcon({ id, text }: { id: string; text: string | { text: string; formula: string } }) {
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const closeOthers = (e: Event) => {
      if ((e as CustomEvent).detail?.id !== id) setShow(false);
    };
    document.addEventListener(DS_TOOLTIP_EVENT, closeOthers);
    return () => document.removeEventListener(DS_TOOLTIP_EVENT, closeOthers);
  }, [id]);

  useEffect(() => {
    if (!show) return;
    const handler = () => setShow(false);
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [show]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (show) { setShow(false); return; }
    const rect = btnRef.current!.getBoundingClientRect();
    const tooltipW = 280;
    const tooltipH = 90;
    const above = rect.top > tooltipH + 16;
    const top = above ? rect.top - tooltipH - 6 : rect.bottom + 6;
    const left = Math.max(8, Math.min(rect.left - 120, window.innerWidth - tooltipW - 8));
    setCoords({ top, left });
    document.dispatchEvent(new CustomEvent(DS_TOOLTIP_EVENT, { detail: { id } }));
    setShow(true);
  };

  return (
    <>
      <style>{`@keyframes dsTooltipIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:translateY(0)}}`}</style>
      <span
        ref={btnRef}
        role="button"
        tabIndex={0}
        onClick={handleClick}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(e as unknown as React.MouseEvent); } }}
        className="inline-flex items-center justify-center rounded-full shrink-0"
        style={{
          width: 15, height: 15, minWidth: 15,
          color: 'inherit',
          border: '1.5px solid currentColor',
          fontSize: 10,
          fontWeight: 700,
          fontFamily: 'Arial, sans-serif',
          lineHeight: 1,
          cursor: 'pointer',
          marginLeft: 2,
          verticalAlign: 'middle',
          userSelect: 'none',
        }}
        aria-label="More information"
      >
        i
      </span>
      {show && typeof document !== 'undefined' && createPortal(
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            top: coords.top,
            left: coords.left,
            zIndex: 9999,
            background: '#fff',
            border: '1.5px solid #1B3A6B',
            borderRadius: 8,
            padding: '8px 10px',
            width: 280,
            maxWidth: 'calc(100vw - 16px)',
            fontSize: 12,
            fontFamily: 'Arial, sans-serif',
            color: '#1a1a1a',
            lineHeight: 1.45,
            boxShadow: '0 4px 12px rgba(27,58,107,0.18)',
            animation: 'dsTooltipIn 0.15s ease-out both',
          }}
        >
          {typeof text === 'string' ? text : (
            <>
              <span style={{ fontWeight: 400, color: '#1a1a1a' }}>{text.text}</span>
              <div style={{ borderTop: '1px solid #e5e7eb', margin: '6px 0' }} />
              {text.formula.split('\n').map((line, i) => (
                <div key={i} style={{ fontWeight: 700, color: '#1B3A6B' }}>{line}</div>
              ))}
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

function WRow({ label, value, bold, color }: { label: string; value: string; bold?: boolean; color?: string }) {
  const c = color ?? (bold ? '#1B3A6B' : undefined);
  return (
    <div className={`flex items-baseline justify-between gap-2 py-1 text-xs${bold ? ' border-t border-border/50 mt-1 pt-1' : ''}`}>
      <span className="text-left" style={{ color: c ?? '#64748B', fontWeight: bold ? 700 : undefined }}>{label}</span>
      <span className="tabular-nums text-right shrink-0" style={{ color: c ?? '#1E293B', fontWeight: bold ? 700 : undefined }}>{value}</span>
    </div>
  );
}

function WSec({ title }: { title: string }) {
  const letter = title.charAt(0);
  const text = title.slice(2);
  return (
    <div className="flex items-center gap-2 mt-4 mb-2">
      <span className="flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: '#1B3A6B' }}>
        {letter}
      </span>
      <span className="text-[11px] font-bold uppercase tracking-widest text-foreground">
        {text}
      </span>
    </div>
  );
}
