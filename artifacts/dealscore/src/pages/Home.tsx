import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Home, TrendingUp, Calculator, Download, ChevronDown, RotateCcw, Trash2, Plus, Sparkles, X } from 'lucide-react';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import DealScorePDF, { type DealScorePDFProps } from '@/components/DealScorePDF';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { calculateBTL, calculateHMO, calculateFlip, calculateSA, calculateBRRR, calculateR2R, calculateSocialHousing, calculatePropertyTax, TAX_LABEL, COUNTRY_LABEL, BUYER_LABEL, type DealType, type BTLInputs, type HMOInputs, type FlipInputs, type SAInputs, type BRRRInputs, type R2RInputs, type SocialHousingInputs, type Country, type BuyerType } from '@/lib/calculations';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
}: {
  pdfProps: DealScorePDFProps;
  fileName: string;
}) {
  const textColour = getContrastText(pdfProps.brandColour);
  return (
    <PDFDownloadLink
      key={pdfProps.propertyAddress + '||' + pdfProps.coverStyle + '||' + pdfProps.currentScore + '||' + pdfProps.riskFlags.length}
      document={<DealScorePDF {...pdfProps} />}
      fileName={fileName}
      style={{ flex: 1, textDecoration: 'none' }}
      data-testid="button-download-pdf"
    >
      {({ loading }: { loading: boolean }) => (
        <div
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

  const [hmoInputs, setHmoInputs] = useState({ rooms: 0, rentPerRoom: 0, occupancyRate: 90 });

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
  const [sourcingFee, setSourcingFee] = useState<number>(0);
  const [sourcingFeeDisclaimer, setSourcingFeeDisclaimer] = useState<string | null>(null);
  const disclaimerName = companyName.trim() || preparedBy.name || '[Sourcer Name]';
  const effectiveDisclaimer = sourcingFeeDisclaimer !== null
    ? sourcingFeeDisclaimer
    : `The sourcing fee stated is payable to ${disclaimerName} as agreed between the sourcer and investor. ${disclaimerName} provides property sourcing services only and is not authorised or regulated by the Financial Conduct Authority. This document is prepared for information purposes only, is confidential, and does not constitute financial, legal, or investment advice. All financial projections are estimates based on information available at the time of preparation and may differ from actual results. Investors should satisfy themselves through their own due diligence prior to proceeding. Independent legal and financial advice should be sought before making any investment decision. ${disclaimerName} accepts no liability for any loss or damage arising from reliance on this document. ${dealType === 'FLIP' ? 'Property values can fall as well as rise. Refurbishment costs and project timelines may exceed initial estimates and past performance is not indicative of future results.' : dealType === 'R2R' ? 'This opportunity does not involve the acquisition of any ownership interest in the property. Returns are subject to occupancy rates, subletting income, and the terms agreed with the landlord. Past performance is not indicative of future results.' : 'Property values can fall as well as rise, rental income is not guaranteed, and past performance is not indicative of future results.'}`;
  const [marketValue, setMarketValue] = useState<number>(0);
  const [strategyNotes, setStrategyNotes] = useState<Record<string, string>>({});
  const [propertyDescription, setPropertyDescription] = useState<string>('');
  const [vendorSituation, setVendorSituation] = useState<string>('');
  const [comparables, setComparables] = useState<Array<{ address: string; bedsType: string; dateSold: string; price: string }>>([
    { address: '', bedsType: '', dateSold: '', price: '' },
    { address: '', bedsType: '', dateSold: '', price: '' },
    { address: '', bedsType: '', dateSold: '', price: '' },
  ]);
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
  const [includeWorkingsInPDF, setIncludeWorkingsInPDF] = useState<boolean>(false);
  const [taxCountry, setTaxCountry] = useState<Country>('ENGLAND');
  const [buyerType, setBuyerType] = useState<BuyerType>('ADDITIONAL');
  const [taxOverrideActive, setTaxOverrideActive] = useState(false);
  const [taxOverrideEditing, setTaxOverrideEditing] = useState(false);
  const [manualTaxValue, setManualTaxValue] = useState<number>(0);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [logoSize, setLogoSize] = useState<'S' | 'M' | 'L'>('M');
  const [coverStyle, setCoverStyle] = useState<'classic' | 'clean' | 'bold'>('classic');
  const [tierOverride, setTierOverride] = useState<'free' | 'pro' | 'pro_plus'>('pro_plus');
  const [brandColourDraft, setBrandColourDraft] = useState('#1B3A6B');
  const [brandColour, setBrandColour] = useState('#1B3A6B');
  const [accentColour, setAccentColour] = useState<string>('#00C896');
  const [accentColourDraft, setAccentColourDraft] = useState<string>('#00C896');
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState<boolean>(false);

  useEffect(() => {
    const timer = setTimeout(() => setBrandColour(brandColourDraft), 500);
    return () => clearTimeout(timer);
  }, [brandColourDraft]);

  useEffect(() => {
    const timer = setTimeout(() => setAccentColour(accentColourDraft), 500);
    return () => clearTimeout(timer);
  }, [accentColourDraft]);

  const [propertyData, setPropertyData] = useState<{
    detectedTenure: 'Freehold' | 'Leasehold' | null;
    detectedPropertyType: string | null;
    floorArea: number | null;
    epcRating: string | null;
    constructionDate: string | null;
    floodRisk: string | null;
  } | null>(null);
  const [propertyDataLoading, setPropertyDataLoading] = useState(false);
  const [propertyDataOpen, setPropertyDataOpen] = useState(true);

  const [addressSuggestions, setAddressSuggestions] = useState<{description: string; placeId: string}[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

  const [flipInputs, setFlipInputs] = useState({ holdingCostsPerMonth: 0, projectLengthMonths: 0, expectedSalePrice: 0, sellingCostsPercent: 2 });

  const [saInputs, setSaInputs] = useState({ nightlyRate: 0, occupancyPercent: 90, platformFeesPercent: 0 });

  const [brrrInputs, setBrrrInputs] = useState({ postRefurbValue: 0, refinancePercent: 75, newMortgageRate: 0, monthlyRent: 0 });

  const [r2rInputs, setR2rInputs] = useState<R2RInputs>({
    monthlyRentPaid: 0,
    rooms: 0,
    rentPerRoom: 0,
    occupancyRate: 90,
    managementFeesPercent: 0,
    monthlyRunningCosts: 0,
    setupCosts: 0,
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
    setFlipInputs(prev => ({ ...prev, [field]: Number(value) || 0 }));
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
    setPropertyData({ detectedTenure: null, detectedPropertyType: null, floorArea: null, epcRating: null, constructionDate: null, floodRisk: null });

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
      const epcFetch = fetch(`/.netlify/functions/epc-lookup?postcode=${postcode}`)
        .then(r => r.json())
        .then(epc => {
          try {
            const rows = epc?.data ?? epc?.rows;
            if (rows && rows.length > 0) {
              const row = rows[0];
              const epcTypeMap: Record<string, string> = {
                'Detached House': 'Detached', 'Semi-Detached House': 'Semi-Detached',
                'Terraced House': 'Terraced', 'Flat': 'Flat/Apartment',
                'Maisonette': 'Flat/Apartment', 'Bungalow': 'Bungalow', 'Park home': 'Terraced',
              };
              const rawType = row.propertyType || row['property-type'] || '';
              const epcPropertyType = epcTypeMap[rawType] || rawType || null;
              const rawFloor = row.totalFloorArea ?? row['total-floor-area'];
              const floorArea = rawFloor != null ? Number(rawFloor) : null;
              const epcRating = row.currentEnergyEfficiencyBand || row['current-energy-rating'] || null;
              const constructionDate = row.constructionAgeBand || row['construction-age-band'] || null;
              if (epcPropertyType) { setPropertyType(epcPropertyType); setAutoFilledPropertyType(true); }
              setPropertyData(prev => prev ? {
                ...prev,
                floorArea,
                epcRating,
                constructionDate,
                ...(epcPropertyType ? { detectedPropertyType: epcPropertyType } : {}),
              } : null);
            }
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

      // Geo + Flood — chains geo lookup into flood check; updates flood risk
      const geoFloodFetch = fetch(`https://api.postcodes.io/postcodes/${postcode}`)
        .then(r => r.json())
        .then(async geoResult => {
          try {
            const lat = geoResult?.result?.latitude;
            const lng = geoResult?.result?.longitude;
            if (lat && lng) {
              const floodRes = await fetch(
                `https://environment.data.gov.uk/flood-monitoring/id/floodAreas?lat=${lat}&long=${lng}&dist=1`
              ).then(r => r.json()).catch(() => null);
              const floodItems = floodRes?.items;
              const floodRisk = floodItems && floodItems.length > 0
                ? 'Flood risk area detected nearby — check Environment Agency for full assessment'
                : 'No flood risk areas detected nearby';
              setPropertyData(prev => prev ? { ...prev, floodRisk } : null);
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

  const fetchAddressSuggestions = async (input: string) => {
    if (!input || input.length < 3 || !window.google?.maps?.places) {
      setAddressSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const result = await (window.google.maps.places as any).AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input,
        includedRegionCodes: ['gb'],
      });
      const { suggestions } = result;
      if (suggestions && suggestions.length > 0) {
        const descriptions = suggestions.map((s: any) => {
          const parsed = JSON.parse(JSON.stringify(s));
          const text = s?.Yz || s?.YC || parsed?.mh?.[0]?.[2]?.[0] || s?.placePrediction?.text?.text || null;
          const placeId = parsed?.mh?.[0]?.[1] || null;
          return (typeof text === 'string' && placeId) ? { description: text, placeId } : null;
        }).filter(Boolean) as {description: string; placeId: string}[];
        setAddressSuggestions(descriptions);
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (err) {
      console.error('Autocomplete error:', err);
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = async (suggestion: { description: string; placeId: string }) => {
    setShowSuggestions(false);
    setAddressSuggestions([]);
    setHighlightedIndex(-1);
    setPropertyAddress(suggestion.description);
    try {
      const place = new (window.google.maps.places as any).Place({
        id: suggestion.placeId,
        requestedLanguage: 'en',
      });
      await place.fetchFields({ fields: ['formattedAddress', 'addressComponents'] });
      if (place.formattedAddress) {
        let cleaned = place.formattedAddress
          .replace(/, UK$/, '')
          .replace(/, United Kingdom$/, '');
        const comps = JSON.parse(JSON.stringify(place.addressComponents || []));
        const postcodeComp = comps.find(
          (c: any) => Array.isArray(c.types) && c.types.includes('postal_code')
        );
        const postcode = postcodeComp?.longText || '';
        if (postcode && !cleaned.includes(postcode)) {
          cleaned = `${cleaned}, ${postcode}`;
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
    } catch {
      // Keep suggestion.description if Place Details fails
    }
  };

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
    setMarketValue(0);
    setStrategyNotes({});
    setPropertyDescription('');
    setVendorSituation('');
    setComparables([
      { address: '', bedsType: '', dateSold: '', price: '' },
      { address: '', bedsType: '', dateSold: '', price: '' },
      { address: '', bedsType: '', dateSold: '', price: '' },
    ]);
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
    setSharedInputs({ purchasePrice: 0, refurbCost: 0, otherCosts: 0, depositPercent: 25, mortgageRate: 0, mortgageTerm: 25, mortgageType: 'IO' });
    if (dealType === 'BTL') {
      setBtlInputs({ monthlyRent: 0 });
    } else if (dealType === 'HMO') {
      setHmoInputs({ rooms: 0, rentPerRoom: 0, occupancyRate: 90 });
    } else if (dealType === 'FLIP') {
      setFlipInputs({ holdingCostsPerMonth: 0, projectLengthMonths: 0, expectedSalePrice: 0, sellingCostsPercent: 2 });
    } else if (dealType === 'SA') {
      setSaInputs({ nightlyRate: 0, occupancyPercent: 90, platformFeesPercent: 0 });
    } else if (dealType === 'BRRR') {
      setBrrrInputs({ postRefurbValue: 0, refinancePercent: 75, newMortgageRate: 0, monthlyRent: 0 });
    } else if (dealType === 'R2R') {
      setR2rInputs({ monthlyRentPaid: 0, rooms: 0, rentPerRoom: 0, occupancyRate: 90, managementFeesPercent: 0, monthlyRunningCosts: 0, setupCosts: 0 });
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
  };

  const sharedTax = calculatePropertyTax(sharedInputs.purchasePrice, taxCountry, buyerType);
  const effectiveTax = taxOverrideActive ? manualTaxValue : sharedTax;

  const { purchasePrice, refurbCost, otherCosts } = sharedInputs;
  const sharedCostInputs = { managementFeePercent, voidAllowancePercent, maintenanceReserve, buildingsInsurance, serviceCharge, groundRentAnnual };
  const btlResults = calculateBTL({ ...sharedInputs, ...btlInputs, stampDuty: effectiveTax, ...sharedCostInputs });
  const hmoResults = calculateHMO({ ...sharedInputs, ...hmoInputs, stampDuty: effectiveTax, ...sharedCostInputs });
  const flipResults = calculateFlip({ purchasePrice, refurbCost, otherCosts, stampDuty: effectiveTax, ...flipInputs });
  const saResults = calculateSA({ ...sharedInputs, ...saInputs, stampDuty: effectiveTax, ...sharedCostInputs });
  const brrrResults = calculateBRRR({ purchasePrice, refurbCost, otherCosts, stampDuty: effectiveTax, ...brrrInputs, ...sharedCostInputs });
  const r2rResults = calculateR2R(r2rInputs);
  const socialResults = calculateSocialHousing({ ...sharedInputs, ...socialInputs, stampDuty: effectiveTax, ...sharedCostInputs });

  const stressSupported = dealType === 'BTL' || dealType === 'HMO' || dealType === 'SA' || dealType === 'BRRR' || dealType === 'SOCIAL';

  const stressRentDown = (() => {
    if (dealType === 'BTL') {
      const r = calculateBTL({ ...sharedInputs, ...btlInputs, monthlyRent: btlInputs.monthlyRent * 0.9, stampDuty: effectiveTax, ...sharedCostInputs });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'HMO') {
      const r = calculateHMO({ ...sharedInputs, ...hmoInputs, rentPerRoom: hmoInputs.rentPerRoom * 0.9, stampDuty: effectiveTax, ...sharedCostInputs });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'SA') {
      const r = calculateSA({ ...sharedInputs, ...saInputs, nightlyRate: saInputs.nightlyRate * 0.9, stampDuty: effectiveTax, ...sharedCostInputs });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'BRRR') {
      const r = calculateBRRR({ purchasePrice, refurbCost, otherCosts, stampDuty: effectiveTax, ...brrrInputs, monthlyRent: brrrInputs.monthlyRent * 0.9, ...sharedCostInputs });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'SOCIAL') {
      const r = calculateSocialHousing({ ...sharedInputs, ...socialInputs, leaseIncomePerMonth: socialInputs.leaseIncomePerMonth * 0.9, stampDuty: effectiveTax, ...sharedCostInputs });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    return { monthlyCashFlow: 0, cashOnCashROI: 0 };
  })();

  const stressRateUp = (() => {
    if (dealType === 'BTL') {
      const r = calculateBTL({ ...sharedInputs, ...btlInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: effectiveTax, ...sharedCostInputs });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'HMO') {
      const r = calculateHMO({ ...sharedInputs, ...hmoInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: effectiveTax, ...sharedCostInputs });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'SA') {
      const r = calculateSA({ ...sharedInputs, ...saInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: effectiveTax, ...sharedCostInputs });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'BRRR') {
      const r = calculateBRRR({ purchasePrice, refurbCost, otherCosts, stampDuty: effectiveTax, ...brrrInputs, newMortgageRate: brrrInputs.newMortgageRate + 1.5, ...sharedCostInputs });
      return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
    }
    if (dealType === 'SOCIAL') {
      const r = calculateSocialHousing({ ...sharedInputs, ...socialInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: effectiveTax, ...sharedCostInputs });
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
    dealType === 'R2R' ? 'Setup Costs' :
    'Cash In';

  const currentCashInValue: number =
    dealType === 'BTL' ? btlResults.totalCashInvested :
    dealType === 'HMO' ? hmoResults.totalCashInvested :
    dealType === 'SA' ? saResults.totalCashInvested :
    dealType === 'BRRR' ? brrrResults.cashLeftInDeal :
    dealType === 'SOCIAL' ? socialResults.totalCashInvested :
    dealType === 'FLIP' ? flipResults.totalCost :
    r2rInputs.setupCosts;

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

  const pdfProps = useMemo<DealScorePDFProps>(() => {
    const _effectiveTax = taxOverrideActive
      ? manualTaxValue
      : calculatePropertyTax(sharedInputs.purchasePrice, taxCountry, buyerType);
    const _taxLabel = TAX_LABEL[taxCountry];
    const _buyerLabel = BUYER_LABEL[buyerType];

    const _sharedCostInputs = { managementFeePercent, voidAllowancePercent, maintenanceReserve, buildingsInsurance, serviceCharge, groundRentAnnual };
    const _btlResults = calculateBTL({ ...sharedInputs, ...btlInputs, stampDuty: _effectiveTax, ..._sharedCostInputs });
    const _hmoResults = calculateHMO({ ...sharedInputs, ...hmoInputs, stampDuty: _effectiveTax, ..._sharedCostInputs });
    const _flipResults = calculateFlip({
      purchasePrice: sharedInputs.purchasePrice,
      refurbCost: sharedInputs.refurbCost,
      otherCosts: sharedInputs.otherCosts,
      stampDuty: _effectiveTax,
      ...flipInputs,
    });
    const _saResults = calculateSA({ ...sharedInputs, ...saInputs, stampDuty: _effectiveTax, ..._sharedCostInputs });
    const _brrrResults = calculateBRRR({
      purchasePrice: sharedInputs.purchasePrice,
      refurbCost: sharedInputs.refurbCost,
      otherCosts: sharedInputs.otherCosts,
      stampDuty: _effectiveTax,
      ...brrrInputs,
      ..._sharedCostInputs,
    });
    const _r2rResults = calculateR2R(r2rInputs);
    const _socialResults = calculateSocialHousing({ ...sharedInputs, ...socialInputs, stampDuty: _effectiveTax, ..._sharedCostInputs });

    const _stressSupported = dealType === 'BTL' || dealType === 'HMO' || dealType === 'SA' || dealType === 'BRRR' || dealType === 'SOCIAL';

    const _stressRentDown = (() => {
      if (dealType === 'BTL') {
        const r = calculateBTL({ ...sharedInputs, ...btlInputs, monthlyRent: btlInputs.monthlyRent * 0.9, stampDuty: _effectiveTax, ..._sharedCostInputs });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'HMO') {
        const r = calculateHMO({ ...sharedInputs, ...hmoInputs, rentPerRoom: hmoInputs.rentPerRoom * 0.9, stampDuty: _effectiveTax, ..._sharedCostInputs });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'SA') {
        const r = calculateSA({ ...sharedInputs, ...saInputs, nightlyRate: saInputs.nightlyRate * 0.9, stampDuty: _effectiveTax, ..._sharedCostInputs });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'BRRR') {
        const r = calculateBRRR({ purchasePrice: sharedInputs.purchasePrice, refurbCost: sharedInputs.refurbCost, otherCosts: sharedInputs.otherCosts, stampDuty: _effectiveTax, ...brrrInputs, monthlyRent: brrrInputs.monthlyRent * 0.9, ..._sharedCostInputs });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'SOCIAL') {
        const r = calculateSocialHousing({ ...sharedInputs, ...socialInputs, leaseIncomePerMonth: socialInputs.leaseIncomePerMonth * 0.9, stampDuty: _effectiveTax, ..._sharedCostInputs });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      return { monthlyCashFlow: 0, cashOnCashROI: 0 };
    })();

    const _stressRateUp = (() => {
      if (dealType === 'BTL') {
        const r = calculateBTL({ ...sharedInputs, ...btlInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: _effectiveTax, ..._sharedCostInputs });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'HMO') {
        const r = calculateHMO({ ...sharedInputs, ...hmoInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: _effectiveTax, ..._sharedCostInputs });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'SA') {
        const r = calculateSA({ ...sharedInputs, ...saInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: _effectiveTax, ..._sharedCostInputs });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'BRRR') {
        const r = calculateBRRR({ purchasePrice: sharedInputs.purchasePrice, refurbCost: sharedInputs.refurbCost, otherCosts: sharedInputs.otherCosts, stampDuty: _effectiveTax, ...brrrInputs, newMortgageRate: brrrInputs.newMortgageRate + 1.5, ..._sharedCostInputs });
        return { monthlyCashFlow: r.monthlyCashFlow, cashOnCashROI: r.cashOnCashROI };
      }
      if (dealType === 'SOCIAL') {
        const r = calculateSocialHousing({ ...sharedInputs, ...socialInputs, mortgageRate: sharedInputs.mortgageRate + 1.5, stampDuty: _effectiveTax, ..._sharedCostInputs });
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
      floorArea: propertyData?.floorArea ?? null,
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
      comparables,
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
      voidAllowancePercent,
      maintenanceReserve,
      buildingsInsurance,
      serviceCharge,
      groundRentAnnual,
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
    comparables, listingLinks, photoFiles, heroPhotoIndex,
    includeWorkingsInPDF,
    managementFeePercent, voidAllowancePercent, maintenanceReserve,
    buildingsInsurance, serviceCharge, groundRentAnnual,
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
    Strong: 'Recommended',
    Average: 'Conditional',
    Weak: 'Not Recommended',
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

      <div className="sticky top-[100px] z-40">

      {/* Sticky Deal Score Bar */}
      <div className="bg-white border-b border-border shadow-sm w-full">
        <div className="max-w-[1024px] mx-auto px-6 flex items-center min-h-[44px] w-full">
          {hasAnalysed ? (
            <div className="flex items-center justify-between w-full">

              <span className="text-[11px] font-bold text-[#1B3A6B] uppercase tracking-wide shrink-0">
                {dealLabel}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] text-muted-foreground">{currentCFLabel}</span>
                <span className="text-[11px] font-semibold text-foreground">
                  {formatCurrency(currentMonthlyCF)}/mo
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 hidden sm:flex">
                <span className="text-[11px] text-muted-foreground">{currentYieldLabel}</span>
                <span className="text-[11px] font-semibold text-foreground">{currentYieldValue}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 hidden sm:flex">
                <span className="text-[11px] text-muted-foreground">{currentROILabel}</span>
                <span className="text-[11px] font-semibold text-foreground">{currentROIValue}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 hidden md:flex">
                <span className="text-[11px] text-muted-foreground">{currentCashInLabel}</span>
                <span className="text-[11px] font-semibold text-foreground">
                  {formatCurrency(currentCashInValue)}
                </span>
              </div>

            </div>
          ) : (
            <div className="flex items-center justify-between w-full">
              <span className="text-[11px] font-bold text-[#1B3A6B] uppercase tracking-wide shrink-0">
                {dealLabel}
              </span>
              <span className="text-[11px] text-muted-foreground">
                Enter deal numbers to see live metrics
              </span>
            </div>
          )}
        </div>
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
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                        data-testid="input-property-address"
                        autoComplete="off"
                      />
                      {showSuggestions && addressSuggestions.length > 0 && (
                        <div style={{
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
                              onMouseDown={() => selectSuggestion(suggestion)}
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
                  <TenureSection tenure={tenure} onChange={(v) => { setTenure(v); setAutoFilledTenure(false); setUserSetTenure(true); }} leaseLength={leaseLengthYears} onLeaseLength={(v) => { setLeaseLengthYears(v); setUserSetLeaseLength(true); }} hint={autoFilledTenure ? 'Auto-suggested — please verify' : undefined} />
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
                      <div className="space-y-2">
                        <div className="flex items-center gap-1"><Label>Deposit (%)</Label><InfoIcon id="shared-dep" text={TT.deposit} /></div>
                        <Input type="number" value={sharedInputs.depositPercent} onChange={(e) => handleSharedChange('depositPercent', e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-1"><Label>Mortgage Rate (%)</Label><InfoIcon id="shared-mr" text={TT.mortgageRate} /></div>
                        <Input type="number" step="0.1" placeholder="Enter mortgage rate" value={sharedInputs.mortgageRate || ''} onChange={(e) => handleSharedChange('mortgageRate', e.target.value)} />
                        <MortgageTypeToggle
                          value={sharedInputs.mortgageType}
                          onChange={(v) => setSharedInputs(prev => ({ ...prev, mortgageType: v }))}
                        />
                      </div>
                      {sharedInputs.mortgageType === 'REPAYMENT' && (
                        <div className="space-y-2">
                          <Label>Mortgage Term (years)</Label>
                          <Input type="number" value={sharedInputs.mortgageTerm} onChange={(e) => handleSharedChange('mortgageTerm', e.target.value)} />
                        </div>
                      )}
                    </>
                  )}
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

                  {/* Comparable Properties — dynamic table */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1">
                      <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Comparable Properties</Label>
                      <InfoIcon id="comp-info" text={TT.comparables} />
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <div className="grid gap-2 bg-slate-100 border-b border-border text-xs font-semibold text-foreground px-3 py-2" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto' }}>
                        <span>Address</span>
                        <span>Beds / Type</span>
                        <span>Date Sold</span>
                        <span>Price</span>
                        <span />
                      </div>
                      {comparables.map((row, i) => (
                        <div key={i} className="grid gap-2 px-3 py-2 border-b border-border last:border-b-0 items-center" style={{ gridTemplateColumns: '2fr 1fr 1fr 1fr auto' }}>
                          <Input
                            type="text"
                            autoComplete="new-password"
                            placeholder="e.g. 8 High Street"
                            value={row.address}
                            onChange={(e) => {
                              const next = [...comparables];
                              next[i] = { ...next[i], address: e.target.value };
                              setComparables(next);
                            }}
                            className="h-9 text-xs"
                          />
                          <Input
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. 3-bed terrace"
                            value={row.bedsType}
                            onChange={(e) => {
                              const next = [...comparables];
                              next[i] = { ...next[i], bedsType: e.target.value };
                              setComparables(next);
                            }}
                            className="h-9 text-xs"
                          />
                          <Input
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. Jan 2025"
                            value={row.dateSold}
                            onChange={(e) => {
                              const next = [...comparables];
                              next[i] = { ...next[i], dateSold: e.target.value };
                              setComparables(next);
                            }}
                            className="h-9 text-xs"
                          />
                          <Input
                            type="text"
                            autoComplete="off"
                            placeholder="e.g. £210,000"
                            value={row.price}
                            onChange={(e) => {
                              const next = [...comparables];
                              next[i] = { ...next[i], price: e.target.value };
                              setComparables(next);
                            }}
                            className="h-9 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => setComparables(comparables.filter((_, j) => j !== i))}
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
                      onClick={() => setComparables([...comparables, { address: '', bedsType: '', dateSold: '', price: '' }])}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Row
                    </button>
                  </div>

                  {/* Listing Links */}
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Listing Links</Label>
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
              <div className="px-6 pt-5 pb-4 flex flex-col items-start justify-start text-left space-y-4">
                <div className="flex items-center justify-center gap-1">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: '#1B3A6B' }} />Deal Score
                  </h2>
                </div>
                {dealType === 'BTL' && renderScoreBadge(btlResults.score)}
                {dealType === 'HMO' && renderScoreBadge(hmoResults.score)}
                {dealType === 'FLIP' && renderScoreBadge(flipResults.score)}
                {dealType === 'SA' && renderScoreBadge(saResults.score)}
                {dealType === 'BRRR' && renderScoreBadge(brrrResults.score)}
                {dealType === 'R2R' && renderScoreBadge(r2rResults.score)}
                {dealType === 'SOCIAL' && renderScoreBadge(socialResults.score)}


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
              
              <div className="px-6 pb-4">
                {dealType === 'BTL' && (
                  <div className="space-y-6">
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
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Cash Invested" value={formatCurrency(btlResults.totalCashInvested)} tooltip={TT.cashInvested} />
                      <MetricBox label="Mortgage" value={formatCurrency(btlResults.mortgageAmount)} tooltip={TT.mortgageAmount} />
                      <MetricBox label="Monthly Flow" value={hasMinimumData ? formatCurrency(btlResults.monthlyCashFlow) : '—'} highlight={hasMinimumData && btlResults.monthlyCashFlow < 0} tooltip={TT.monthlyFlow} />
                      <MetricBox label="Annual Flow" value={hasMinimumData ? formatCurrency(btlResults.annualCashFlow) : '—'} highlight={hasMinimumData && btlResults.annualCashFlow < 0} tooltip={TT.annualFlow} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3 pt-3">
                      <Row label="Gross Yield" value={formatPercent(btlResults.grossYield)} tooltip={TT.grossYield} />
                      <Row label="Net Yield" value={formatPercent(btlResults.netYield)} tooltip={TT.netYield} />
                      <Row label="Cash-on-Cash ROI" value={formatPercent(btlResults.cashOnCashROI)} isBold tooltip={TT.cocRoi} />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold tooltip={TT.equityDayOne} />
                      )}
                    </div>
                  </div>
                )}

                {dealType === 'HMO' && (
                  <div className="space-y-6">
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
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Cash Invested" value={formatCurrency(hmoResults.totalCashInvested)} tooltip={TT.cashInvested} />
                      <MetricBox label="Gross Rent/mo" value={formatCurrency(hmoResults.grossMonthlyRent)} tooltip={TT.hmoGrossRent} />
                      <MetricBox label="Monthly Flow" value={hasMinimumData ? formatCurrency(hmoResults.monthlyCashFlow) : '—'} highlight={hasMinimumData && hmoResults.monthlyCashFlow < 0} tooltip={TT.monthlyFlow} />
                      <MetricBox label="Annual Flow" value={hasMinimumData ? formatCurrency(hmoResults.annualCashFlow) : '—'} highlight={hasMinimumData && hmoResults.annualCashFlow < 0} tooltip={TT.annualFlow} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3 pt-3">
                      <Row label="Mortgage" value={formatCurrency(hmoResults.mortgageAmount)} tooltip={TT.mortgageAmount} />
                      <Row label="Gross Yield" value={formatPercent(hmoResults.grossYield)} tooltip={TT.grossYield} />
                      <Row label="Net Yield" value={formatPercent(hmoResults.netYield)} tooltip={TT.netYield} />
                      <Row label="Cash-on-Cash ROI" value={formatPercent(hmoResults.cashOnCashROI)} isBold tooltip={TT.cocRoi} />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold tooltip={TT.equityDayOne} />
                      )}
                    </div>
                  </div>
                )}

                {dealType === 'FLIP' && (
                  <div className="space-y-6">
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
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Total Cost" value={formatCurrency(flipResults.totalCost)} tooltip={TT.flipTotalCost} />
                      <MetricBox label="Selling Costs" value={formatCurrency(flipResults.sellingCosts)} tooltip={TT.flipSellingCosts} />
                      <MetricBox label="Net Profit" value={formatCurrency(flipResults.netProfit)} highlight={flipResults.netProfit < 0} tooltip={TT.flipNetProfit} />
                      <MetricBox label="Profit / Month" value={formatCurrency(flipResults.profitPerMonth)} highlight={flipResults.profitPerMonth < 0} tooltip={TT.profitPerMonth} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3 pt-3">
                      <Row label="Total ROI" value={formatPercent(flipResults.roi)} isBold tooltip={TT.flipTotalROI} />
                      <Row label="Annualised ROI" value={formatPercent(flipResults.annualisedROI)} tooltip={TT.annualisedROI} />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold tooltip={TT.equityDayOne} />
                      )}
                    </div>
                  </div>
                )}

                {dealType === 'SA' && (
                  <div className="space-y-6">
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
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Gross Rev/mo" value={formatCurrency(saResults.grossMonthlyRevenue)} tooltip={TT.saGrossRev} />
                      <MetricBox label="Net Rev/mo" value={formatCurrency(saResults.netMonthlyRevenue)} tooltip={TT.saNetRev} />
                      <MetricBox label="Monthly Flow" value={hasMinimumData ? formatCurrency(saResults.monthlyCashFlow) : '—'} highlight={hasMinimumData && saResults.monthlyCashFlow < 0} tooltip={TT.monthlyFlow} />
                      <MetricBox label="Annual Flow" value={hasMinimumData ? formatCurrency(saResults.annualCashFlow) : '—'} highlight={hasMinimumData && saResults.annualCashFlow < 0} tooltip={TT.annualFlow} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3 pt-3">
                      <Row label="Mortgage" value={formatCurrency(saResults.mortgageAmount)} tooltip={TT.mortgageAmount} />
                      <Row label="Gross Yield" value={formatPercent(saResults.grossYield)} tooltip={TT.grossYield} />
                      <Row label="Net Yield" value={formatPercent(saResults.netYield)} tooltip={TT.netYield} />
                      <Row label="Cash-on-Cash ROI" value={formatPercent(saResults.cashOnCashROI)} isBold tooltip={TT.cocRoi} />
                      <Row label="Cash Invested" value={formatCurrency(saResults.totalCashInvested)} tooltip={TT.cashInvested} />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold tooltip={TT.equityDayOne} />
                      )}
                    </div>
                  </div>
                )}

                {dealType === 'BRRR' && (
                  <div className="space-y-6">
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
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox
                        label="Cash Left In"
                        value={sharedInputs.purchasePrice > 0 && brrrResults.moneyOut ? `${formatCurrency(Math.abs(brrrResults.cashLeftInDeal))} OUT` : formatCurrency(brrrResults.cashLeftInDeal)}
                        highlight={!brrrResults.moneyOut && brrrResults.cashLeftInDeal > 0 && brrrResults.cashLeftInDeal > 30000}
                        tooltip={TT.brrrCashLeft}
                      />
                      <MetricBox label="Equity Created" value={formatCurrency(brrrResults.equityCreated)} highlight={brrrResults.equityCreated < 0} tooltip={TT.equityCreated} />
                      <MetricBox label="Monthly Flow" value={hasMinimumData ? formatCurrency(brrrResults.monthlyCashFlow) : '—'} highlight={hasMinimumData && brrrResults.monthlyCashFlow < 0} tooltip={TT.monthlyFlow} />
                      <MetricBox label="Annual Flow" value={hasMinimumData ? formatCurrency(brrrResults.annualCashFlow) : '—'} highlight={hasMinimumData && brrrResults.annualCashFlow < 0} tooltip={TT.annualFlow} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3 pt-3">
                      <Row label="Refinance Loan" value={formatCurrency(brrrResults.refinanceLoan)} tooltip={TT.brrrRefinanceLoan} />
                      <Row label="Monthly Mortgage" value={formatCurrency(brrrResults.monthlyMortgage)} tooltip={TT.mortgageAmount} />
                      <Row label="Gross Yield (on GDV)" value={formatPercent(brrrResults.grossYield)} tooltip={TT.grossYield} />
                      <Row label="Net Yield" value={formatPercent(brrrResults.netYield)} tooltip={TT.netYield} />
                      <Row
                        label="Cash-on-Cash ROI"
                        value={sharedInputs.purchasePrice > 0 && brrrResults.moneyOut ? '∞ (money out!)' : formatPercent(brrrResults.cashOnCashROI)}
                        isBold
                        tooltip={TT.cocRoi}
                      />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold tooltip={TT.equityDayOne} />
                      )}
                    </div>
                  </div>
                )}

                {dealType === 'R2R' && (
                  <div className="space-y-6">
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
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Gross Income/mo" value={formatCurrency(r2rResults.grossMonthlyIncome)} tooltip={TT.r2rGrossIncome} />
                      <MetricBox label="Net Income/mo" value={formatCurrency(r2rResults.netMonthlyIncome)} tooltip={TT.r2rNetIncome} />
                      <MetricBox label="Monthly Profit" value={formatCurrency(r2rResults.monthlyProfit)} highlight={r2rResults.monthlyProfit < 0} tooltip={TT.r2rMonthlyProfit} />
                      <MetricBox label="Annual Profit" value={formatCurrency(r2rResults.annualProfit)} highlight={r2rResults.annualProfit < 0} tooltip={TT.r2rAnnualProfit} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3 pt-3">
                      <Row label="Management Fees/mo" value={formatCurrency(r2rResults.managementFees)} tooltip={TT.r2rMgmtFees} />
                      <Row label="Setup Costs" value={formatCurrency(r2rInputs.setupCosts)} tooltip={TT.setupCosts} />
                      <Row label="Monthly Spread" value={formatCurrency(r2rResults.grossMonthlyIncome - r2rInputs.monthlyRentPaid)} tooltip={TT.r2rMonthlySpread} />
                      <Row label="Net Return on Setup Costs" value={formatPercent(r2rResults.roi)} isBold tooltip={TT.r2rNetReturn} />
                    </div>
                  </div>
                )}

                {dealType === 'SOCIAL' && (
                  <div className="space-y-6">
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
                    <div className="grid grid-cols-2 gap-4">
                      <MetricBox label="Cash Invested" value={formatCurrency(socialResults.totalCashInvested)} tooltip={TT.cashInvested} />
                      <MetricBox label="Mortgage" value={formatCurrency(socialResults.mortgageAmount)} tooltip={TT.mortgageAmount} />
                      <MetricBox label="Monthly Flow" value={hasMinimumData ? formatCurrency(socialResults.monthlyCashFlow) : '—'} highlight={hasMinimumData && socialResults.monthlyCashFlow < 0} tooltip={TT.monthlyFlow} />
                      <MetricBox label="Annual Flow" value={hasMinimumData ? formatCurrency(socialResults.annualCashFlow) : '—'} highlight={hasMinimumData && socialResults.annualCashFlow < 0} tooltip={TT.annualFlow} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3 pt-3">
                      <Row label="Gross Yield" value={formatPercent(socialResults.grossYield)} tooltip={TT.socialGrossYield} />
                      <Row label="Net Yield" value={formatPercent(socialResults.netYield)} tooltip={TT.socialNetYield} />
                      <Row label="Cash-on-Cash ROI" value={formatPercent(socialResults.cashOnCashROI)} isBold tooltip={TT.socialCocRoi} />
                      {marketValue > 0 && (
                        <Row label="Equity on Day One" value={formatCurrency(equityDayOne)} isBold tooltip={TT.equityDayOne} />
                      )}
                    </div>
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
                      <WRow label="TOTAL CASH INVESTED" value={formatCurrency(btlResults.totalCashInvested)} bold />
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
                      <WRow label="TOTAL CASH INVESTED" value={formatCurrency(hmoResults.totalCashInvested)} bold />
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
                      <WRow label="Other Costs" value={formatCurrency(sharedInputs.otherCosts)} />
                      <WRow label={`Holding Costs (${flipInputs.projectLengthMonths} months × ${formatCurrency(flipInputs.holdingCostsPerMonth)})`} value={formatCurrency(flipInputs.holdingCostsPerMonth * flipInputs.projectLengthMonths)} />
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
                      <WRow label="TOTAL CASH INVESTED" value={formatCurrency(saResults.totalCashInvested)} bold />
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
                      <WSec title="A  SETUP COSTS" />
                      <WRow label="Setup Costs" value={formatCurrency(r2rInputs.setupCosts)} />
                      <WRow label="TOTAL SETUP COSTS" value={formatCurrency(r2rInputs.setupCosts)} bold />
                      <WSec title="B  MONTHLY CASH FLOW" />
                      <WRow label="Gross Monthly Income" value={formatCurrency(r2rResults.grossMonthlyIncome)} />
                      <WRow label="Less: Landlord Rent" value={`(${formatCurrency(r2rInputs.monthlyRentPaid)})`} />
                      <WRow label="Monthly Spread" value={formatCurrency(r2rResults.grossMonthlyIncome - r2rInputs.monthlyRentPaid)} />
                      <WRow label="Less: Management Fees" value={`(${formatCurrency(r2rResults.managementFees)})`} />
                      <WRow label="Less: Running Costs" value={`(${formatCurrency(r2rInputs.monthlyRunningCosts)})`} />
                      <WRow label="MONTHLY PROFIT" value={formatCurrency(r2rResults.monthlyProfit)} bold color={r2rResults.monthlyProfit < 0 ? '#EF4444' : '#22C55E'} />
                      <WSec title="C  KEY METRICS" />
                      <WRow label={`ROI  ${formatCurrency(r2rResults.annualProfit)} ÷ ${formatCurrency(r2rInputs.setupCosts)} × 100`} value={formatPercent(r2rResults.roi)} bold color='#1B3A6B' />
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
                      <WRow label="TOTAL CASH INVESTED" value={formatCurrency(socialResults.totalCashInvested)} bold />
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

          {/* Cover Style */}
          {tierOverride === 'pro_plus' && (
          <div className="mt-4 space-y-1.5">
            <Label className="text-xs">Cover Style <span className="text-slate-400 font-normal">(choose your investor pack cover page layout)</span></Label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setCoverStyle('classic')}
                className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg border-2 transition ${coverStyle === 'classic' ? 'border-[#1B3A6B]' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="w-[60px] h-[80px] rounded overflow-hidden flex flex-col" style={{ backgroundColor: brandColourDraft }}>
                  <div className="flex-1 flex flex-col items-center justify-center gap-1 px-2">
                    <div className="w-6 h-2 bg-white/80 rounded" />
                    <div className="w-9 h-1.5 bg-white/90 rounded" />
                    <div className="w-7 h-1 bg-white/60 rounded" />
                  </div>
                  <div className="px-2 pb-2">
                    <div className="border-t border-white/30 pt-1">
                      <div className="w-8 h-1 bg-white/50 rounded mx-auto" />
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-600 font-medium">Classic</span>
              </button>
              <button
                type="button"
                onClick={() => setCoverStyle('clean')}
                className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg border-2 transition ${coverStyle === 'clean' ? 'border-[#1B3A6B]' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="w-[60px] h-[80px] rounded overflow-hidden bg-white flex flex-col" style={{ borderLeft: `3px solid ${brandColourDraft}` }}>
                  <div className="h-1.5 w-full" style={{ backgroundColor: brandColourDraft }} />
                  <div className="flex-1 flex flex-col justify-between p-2">
                    <div className="w-4 h-1.5 bg-slate-200 rounded" />
                    <div>
                      <div className="w-9 h-2 bg-slate-700 rounded mb-1" />
                      <div className="w-7 h-1 rounded mb-0.5" style={{ backgroundColor: brandColourDraft, opacity: 0.8 }} />
                      <div className="w-5 h-1 bg-slate-300 rounded" />
                    </div>
                    <div className="border-t pt-1" style={{ borderColor: brandColourDraft }}>
                      <div className="w-7 h-1 bg-slate-200 rounded mx-auto" />
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-slate-600 font-medium">Clean</span>
              </button>
              <button
                type="button"
                onClick={() => setCoverStyle('bold')}
                className={`flex flex-col items-center gap-1.5 p-1.5 rounded-lg border-2 transition ${coverStyle === 'bold' ? 'border-[#1B3A6B]' : 'border-slate-200 hover:border-slate-300'}`}
              >
                <div className="w-[60px] h-[80px] rounded overflow-hidden flex">
                  <div className="w-[45%] h-full flex flex-col justify-between p-1.5" style={{ backgroundColor: brandColourDraft }}>
                    <div className="w-4 h-1.5 bg-white/70 rounded" />
                    <div>
                      <div className="w-3 h-1 bg-white/80 rounded mb-0.5" />
                      <div className="w-2 h-0.5 bg-white/50 rounded" />
                    </div>
                  </div>
                  <div className="w-[55%] h-full bg-white flex flex-col justify-center p-1.5">
                    <div className="w-6 h-2 bg-slate-700 rounded mb-1" />
                    <div className="w-5 h-1 bg-slate-400 rounded mb-1" />
                    <div className="w-3 h-1 bg-slate-200 rounded" />
                  </div>
                </div>
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
                <span className="text-xs text-slate-600">Include calculation workings in PDF</span>
              </label>
            )}
            {tierOverride !== 'free' && (
              <button
                type="button"
                onClick={() => setPdfPreviewOpen(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm border-2 border-[#1B3A6B] text-[#1B3A6B] bg-white hover:bg-[#1B3A6B]/5 active:scale-[0.99] transition w-full"
                data-testid="button-preview-pdf"
              >
                Preview PDF
              </button>
            )}
            {tierOverride !== 'free' && (
              <PdfDownloadButton
                pdfProps={pdfProps}
                fileName={`DealScore-${(propertyAddress || 'Property').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)}-${dealLabel.replace(/[\s/]+/g, '-')}.pdf`}
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
          <PDFViewer width="100%" height="100%" showToolbar={false}>
            <DealScorePDF {...pdfProps} />
          </PDFViewer>
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
  sourcingFee: 'The fee you are charging the investor for finding and packaging this deal. Appears prominently on the PDF.',
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
  holdingCosts: 'Monthly costs while you own the property during the refurbishment — bridging loan interest, utilities, council tax, and insurance.',
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
    constructionDate: string | null;
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
                  <span style={{ color: '#1B3A6B', fontWeight: 700 }}>{data.floorArea} m²</span>
                </div>
              )}
              {data.epcRating && (
                <div>
                  <span style={{ color: '#64748B' }}>EPC rating: </span>
                  <span style={{
                    display: 'inline-block',
                    background: epcColors[data.epcRating] || '#888',
                    color: '#fff',
                    fontWeight: 700,
                    padding: '1px 7px',
                    borderRadius: 4,
                    fontSize: 12,
                  }}>{data.epcRating}</span>
                </div>
              )}
              {data.constructionDate && (
                <div>
                  <span style={{ color: '#64748B' }}>Built: </span>
                  <span style={{ color: '#1B3A6B', fontWeight: 700 }}>{data.constructionDate}</span>
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
                  Source: Land Registry, EPC Register, Environment Agency. All fields remain editable.
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
