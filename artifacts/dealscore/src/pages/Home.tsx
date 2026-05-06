import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Building2, Home, Hammer, TrendingUp, Calculator, Download, ChevronDown, BedDouble, RefreshCw, Key, Shield, RotateCcw } from 'lucide-react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import DealScorePDF, { type DealScorePDFProps } from '@/components/DealScorePDF';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

  const [btlInputs, setBtlInputs] = useState({ monthlyRent: 0, monthlyExpenses: 0 });

  const [hmoInputs, setHmoInputs] = useState({ rooms: 0, rentPerRoom: 0, occupancyRate: 90, monthlyExpenses: 0 });

  const [preparedBy, setPreparedBy] = useState({ name: '', email: '', phone: '' });
  const [propertyAddress, setPropertyAddress] = useState('');
  const [propertyType, setPropertyType] = useState<string>('Terraced');
  const [tenure, setTenure] = useState<'Freehold' | 'Leasehold'>('Freehold');
  const [autoFilledPropertyType, setAutoFilledPropertyType] = useState(false);
  const [autoFilledTenure, setAutoFilledTenure] = useState(false);
  const [leaseLengthYears, setLeaseLengthYears] = useState<number>(0);
  const [sourcingFee, setSourcingFee] = useState<number>(0);
  const [marketValue, setMarketValue] = useState<number>(0);
  const [strategyNotes, setStrategyNotes] = useState<string>('');
  const [propertyDescription, setPropertyDescription] = useState<string>('');
  const [vendorSituation, setVendorSituation] = useState<string>('');
  const [comparableProperties, setComparableProperties] = useState<string>('');
  const [strategyOpen, setStrategyOpen] = useState<boolean>(false);
  const [dealNotesOpen, setDealNotesOpen] = useState<boolean>(false);
  const [taxCountry, setTaxCountry] = useState<Country>('ENGLAND');
  const [buyerType, setBuyerType] = useState<BuyerType>('ADDITIONAL');
  const [taxOverrideActive, setTaxOverrideActive] = useState(false);
  const [taxOverrideEditing, setTaxOverrideEditing] = useState(false);
  const [manualTaxValue, setManualTaxValue] = useState<number>(0);
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [brandColour, setBrandColour] = useState('#1B3A6B');

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

  const [flipInputs, setFlipInputs] = useState({ holdingCostsPerMonth: 0, projectLengthMonths: 0, expectedSalePrice: 0, sellingCostsPercent: 2 });

  const [saInputs, setSaInputs] = useState({ nightlyRate: 0, occupancyPercent: 90, platformFeesPercent: 0, monthlyRunningCosts: 0 });

  const [brrrInputs, setBrrrInputs] = useState({ postRefurbValue: 0, refinancePercent: 75, newMortgageRate: 0, monthlyRent: 0, monthlyExpenses: 0 });

  const [r2rInputs, setR2rInputs] = useState<R2RInputs>({
    monthlyRentPaid: 0,
    rooms: 0,
    rentPerRoom: 0,
    occupancyRate: 90,
    managementFeesPercent: 0,
    monthlyRunningCosts: 0,
    setupCosts: 0,
  });

  const [socialInputs, setSocialInputs] = useState({ leaseIncomePerMonth: 0, leaseLengthYears: 0, managementCostsPerMonth: 0 });

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
              if (detectedTenure) { setTenure(detectedTenure); setAutoFilledTenure(true); }
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

  const handleReset = () => {
    setPropertyAddress('');
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setPropertyType('Terraced');
    setTenure('Freehold');
    setAutoFilledPropertyType(false);
    setAutoFilledTenure(false);
    setLeaseLengthYears(0);
    setSourcingFee(0);
    setMarketValue(0);
    setStrategyNotes('');
    setPropertyDescription('');
    setVendorSituation('');
    setComparableProperties('');
    setTaxCountry('ENGLAND');
    setBuyerType('ADDITIONAL');
    setTaxOverrideActive(false);
    setTaxOverrideEditing(false);
    setManualTaxValue(0);
    setStrategyOpen(false);
    setDealNotesOpen(false);
    setSharedInputs({ purchasePrice: 0, refurbCost: 0, otherCosts: 0, depositPercent: 25, mortgageRate: 0, mortgageTerm: 25, mortgageType: 'IO' });
    if (dealType === 'BTL') {
      setBtlInputs({ monthlyRent: 0, monthlyExpenses: 0 });
    } else if (dealType === 'HMO') {
      setHmoInputs({ rooms: 0, rentPerRoom: 0, occupancyRate: 90, monthlyExpenses: 0 });
    } else if (dealType === 'FLIP') {
      setFlipInputs({ holdingCostsPerMonth: 0, projectLengthMonths: 0, expectedSalePrice: 0, sellingCostsPercent: 2 });
    } else if (dealType === 'SA') {
      setSaInputs({ nightlyRate: 0, occupancyPercent: 90, platformFeesPercent: 0, monthlyRunningCosts: 0 });
    } else if (dealType === 'BRRR') {
      setBrrrInputs({ postRefurbValue: 0, refinancePercent: 75, newMortgageRate: 0, monthlyRent: 0, monthlyExpenses: 0 });
    } else if (dealType === 'R2R') {
      setR2rInputs({ monthlyRentPaid: 0, rooms: 0, rentPerRoom: 0, occupancyRate: 90, managementFeesPercent: 0, monthlyRunningCosts: 0, setupCosts: 0 });
    } else {
      setSocialInputs({ leaseIncomePerMonth: 0, leaseLengthYears: 0, managementCostsPerMonth: 0 });
    }
    setPropertyData(null);
    setPropertyDataLoading(false);
    setPropertyDataOpen(true);
  };

  const sharedTax = calculatePropertyTax(sharedInputs.purchasePrice, taxCountry, buyerType);
  const effectiveTax = taxOverrideActive ? manualTaxValue : sharedTax;

  const { purchasePrice, refurbCost, otherCosts } = sharedInputs;
  const btlResults = calculateBTL({ ...sharedInputs, ...btlInputs, stampDuty: effectiveTax });
  const hmoResults = calculateHMO({ ...sharedInputs, ...hmoInputs, stampDuty: effectiveTax });
  const flipResults = calculateFlip({ purchasePrice, refurbCost, otherCosts, stampDuty: effectiveTax, ...flipInputs });
  const saResults = calculateSA({ ...sharedInputs, ...saInputs, stampDuty: effectiveTax });
  const brrrResults = calculateBRRR({ purchasePrice, refurbCost, otherCosts, stampDuty: effectiveTax, ...brrrInputs });
  const r2rResults = calculateR2R(r2rInputs);
  const socialResults = calculateSocialHousing({ ...sharedInputs, ...socialInputs, stampDuty: effectiveTax });

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

  const pdfProps: DealScorePDFProps = {
    dealType,
    dateStr,
    propertyAddress,
    propertyType,
    tenure,
    leaseLengthYears,
    epcRating: propertyData?.epcRating ?? null,
    floodRisk: propertyData?.floodRisk ?? null,
    floorArea: propertyData?.floorArea ?? null,
    constructionDate: propertyData?.constructionDate ?? null,
    purchasePrice: sharedInputs.purchasePrice,
    effectiveTax,
    taxLabel,
    taxCountryLabel: COUNTRY_LABEL[taxCountry],
    buyerLabel,
    refurbCost: sharedInputs.refurbCost,
    otherCosts: sharedInputs.otherCosts,
    depositPercent: sharedInputs.depositPercent,
    mortgageRate: sharedInputs.mortgageRate,
    mortgageType: sharedInputs.mortgageType,
    mortgageTerm: sharedInputs.mortgageTerm,
    marketValue,
    sourcingFee,
    equityDayOne,
    bmvAmount,
    bmvPercent,
    preparedBy,
    logoBase64,
    brandColour,
    btlInputs,
    hmoInputs,
    flipInputs,
    saInputs,
    brrrInputs,
    r2rInputs,
    socialInputs,
    btlResults,
    hmoResults,
    flipResults,
    saResults,
    brrrResults,
    r2rResults,
    socialResults,
    currentScore,
    riskFlags: currentRiskFlags,
    strategyNotes,
    propertyDescription,
    vendorSituation,
    comparableProperties,
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
        {score} DEAL
      </div>
    );
  };

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F5F7FA' }}>
      <header className="text-primary-foreground py-6 shadow-md" style={{ backgroundColor: '#1B3A6B' }}>
        <div className="container max-w-5xl mx-auto px-4 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">DealScore</h1>
            <p className="text-primary-foreground/80 text-sm">Professional property deal analyser</p>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-4 mt-8">
        <div className="mb-8">
          <Tabs value={dealType} onValueChange={(v) => setDealType(v as DealType)} className="w-full">
            <TabsList className="w-full grid grid-cols-7 h-12 bg-white border border-border rounded-xl p-1 shadow-sm">
              <TabsTrigger value="BTL" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Home className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">BTL</span><InfoIcon id="tab-btl" text={TT.tabBtl} />
              </TabsTrigger>
              <TabsTrigger value="HMO" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Building2 className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">HMO</span><InfoIcon id="tab-hmo" text={TT.tabHmo} />
              </TabsTrigger>
              <TabsTrigger value="FLIP" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Hammer className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">Flip</span><InfoIcon id="tab-flip" text={TT.tabFlip} />
              </TabsTrigger>
              <TabsTrigger value="SA" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <BedDouble className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">SA</span><InfoIcon id="tab-sa" text={TT.tabSa} />
              </TabsTrigger>
              <TabsTrigger value="BRRR" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <RefreshCw className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">BRRR</span><InfoIcon id="tab-brrr" text={TT.tabBrrr} />
              </TabsTrigger>
              <TabsTrigger value="R2R" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Key className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">R2R</span><InfoIcon id="tab-r2r" text={TT.tabR2r} />
              </TabsTrigger>
              <TabsTrigger value="SOCIAL" className="rounded-lg text-xs font-semibold text-muted-foreground data-[state=active]:text-white data-[state=active]:shadow-md transition-all data-[state=active]:bg-[#1B3A6B]">
                <Shield className="w-3.5 h-3.5 mr-1 shrink-0 hidden sm:block" /><span className="truncate">Social</span><InfoIcon id="tab-social" text={TT.tabSocial} />
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Inputs Panel */}
          <div className="lg:col-span-7">
            <Card className="border-0 bg-white rounded-2xl overflow-hidden" style={{ boxShadow: '0 4px 16px rgba(27, 58, 107, 0.08)' }}>
              <div className="bg-muted px-6 py-4 border-b border-border flex justify-between items-center" style={{ borderLeft: '4px solid #1B3A6B' }}>
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <Calculator className="w-5 h-5" style={{ color: '#1B3A6B' }} /> Deal Numbers
                </h2>
              </div>
              <CardContent className="p-6">
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
                          fetchAddressSuggestions(e.target.value);
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
                              onMouseDown={async () => {
                                setShowSuggestions(false);
                                setAddressSuggestions([]);
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
                                  }
                                } catch {
                                  // Keep suggestion.description if Place Details fails
                                }
                              }}
                              style={{
                                padding: '10px 12px',
                                fontSize: 13,
                                cursor: 'pointer',
                                borderBottom: i < addressSuggestions.length - 1 ? '1px solid #f1f5f9' : 'none',
                                color: '#1a1a1a',
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = '#f8fafc')}
                              onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
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
                  <TenureSection tenure={tenure} onChange={(v) => { setTenure(v); setAutoFilledTenure(false); }} leaseLength={leaseLengthYears} onLeaseLength={setLeaseLengthYears} hint={autoFilledTenure ? 'Auto-suggested — please verify' : undefined} />
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
                      <div className="flex items-center gap-1"><Label>Monthly Rent (£)</Label><InfoIcon id="btl-rent" text={TT.monthlyRent} /></div>
                      <Input type="number" placeholder="Enter monthly rent" value={btlInputs.monthlyRent || ''} onChange={(e) => handleBtlChange('monthlyRent', e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Monthly Expenses (£)</Label><InfoIcon id="btl-exp" text={TT.monthlyExpenses} /></div>
                      <Input type="number" placeholder="Enter monthly expenses" value={btlInputs.monthlyExpenses || ''} onChange={(e) => handleBtlChange('monthlyExpenses', e.target.value)} />
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Monthly Expenses (£)</Label><InfoIcon id="hmo-exp" text={TT.monthlyExpenses} /></div>
                      <Input type="number" placeholder="Enter monthly expenses" value={hmoInputs.monthlyExpenses || ''} onChange={(e) => handleHmoChange('monthlyExpenses', e.target.value)} />
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Monthly Running Costs (£)</Label><InfoIcon id="sa-run" text={TT.runningCosts} /></div>
                      <Input type="number" placeholder="Enter monthly running costs" value={saInputs.monthlyRunningCosts || ''} onChange={(e) => handleSaChange('monthlyRunningCosts', e.target.value)} data-testid="input-sa-running-costs" />
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
                      <div className="flex items-center gap-1"><Label>Monthly Rent (£)</Label><InfoIcon id="brrr-rent" text={TT.monthlyRent} /></div>
                      <Input type="number" placeholder="Enter monthly rent" value={brrrInputs.monthlyRent || ''} onChange={(e) => handleBrrrChange('monthlyRent', e.target.value)} data-testid="input-brrr-monthly-rent" />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Monthly Expenses (£)</Label><InfoIcon id="brrr-exp" text={TT.monthlyExpenses} /></div>
                      <Input type="number" placeholder="Enter monthly expenses" value={brrrInputs.monthlyExpenses || ''} onChange={(e) => handleBrrrChange('monthlyExpenses', e.target.value)} />
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
                    <div className="space-y-2">
                      <div className="flex items-center gap-1"><Label>Management Costs / month (£)</Label><InfoIcon id="soc-mgmt" text={TT.mgmtCosts} /></div>
                      <Input type="number" placeholder="Enter monthly management costs" value={socialInputs.managementCostsPerMonth || ''} onChange={(e) => handleSocialChange('managementCostsPerMonth', e.target.value)} />
                    </div>
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
                </div>

                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setStrategyOpen((v) => !v)}
                    aria-expanded={strategyOpen}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    data-testid="toggle-strategy"
                  >
                    <span className="font-semibold text-sm uppercase tracking-widest" style={{ color: '#1B3A6B' }}>
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
                <div className="mt-4 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="strategy-notes">Why This Strategy?</Label>
                    <Textarea
                      id="strategy-notes"
                      placeholder="Explain why this strategy fits the deal — e.g. strong rental demand, room to add value, exit options, etc."
                      value={strategyNotes}
                      onChange={(e) => setStrategyNotes(e.target.value)}
                      rows={4}
                      data-testid="input-strategy-notes"
                    />
                  </div>
                </div>
                )}

                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setDealNotesOpen((v) => !v)}
                    aria-expanded={dealNotesOpen}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
                    data-testid="toggle-deal-notes"
                  >
                    <span className="font-semibold text-sm uppercase tracking-widest" style={{ color: '#1B3A6B' }}>
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
                <div className="mt-4 space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="property-description">Property Description</Label>
                    <Textarea
                      id="property-description"
                      placeholder="e.g. 3-bed mid-terrace, 90 sqm, double glazing, gas central heating, west-facing garden, off-road parking…"
                      value={propertyDescription}
                      onChange={(e) => setPropertyDescription(e.target.value)}
                      rows={3}
                      data-testid="input-property-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor-situation">Vendor Situation</Label>
                    <Textarea
                      id="vendor-situation"
                      placeholder="e.g. Motivated seller — relocating for work, needs quick completion within 6 weeks, open to offers…"
                      value={vendorSituation}
                      onChange={(e) => setVendorSituation(e.target.value)}
                      rows={3}
                      data-testid="input-vendor-situation"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="comparable-properties">Comparable Properties</Label>
                    <Textarea
                      id="comparable-properties"
                      placeholder="e.g. 8 High Street sold £215k (Mar 2026), 14 High Street SSTC £220k, similar 3-bed terraces averaging £210–225k on this street…"
                      value={comparableProperties}
                      onChange={(e) => setComparableProperties(e.target.value)}
                      rows={3}
                      data-testid="input-comparable-properties"
                    />
                  </div>
                </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-5">
            <Card className="bg-white text-foreground rounded-2xl overflow-hidden" style={{ border: '1px solid #1B3A6B', boxShadow: '0 4px 16px rgba(27, 58, 107, 0.08)' }}>
              <div className="p-6 pb-4 flex flex-col items-center justify-center text-center space-y-4">
                <div className="flex items-center justify-center gap-1">
                  <h2 className="font-medium uppercase tracking-widest text-sm" style={{ color: '#1B3A6B' }}>Deal Score</h2>
                  <InfoIcon id="deal-score-header" text={TT.dealScore} />
                </div>
                {dealType === 'BTL' && renderScoreBadge(btlResults.score)}
                {dealType === 'HMO' && renderScoreBadge(hmoResults.score)}
                {dealType === 'FLIP' && renderScoreBadge(flipResults.score)}
                {dealType === 'SA' && renderScoreBadge(saResults.score)}
                {dealType === 'BRRR' && renderScoreBadge(brrrResults.score)}
                {dealType === 'R2R' && renderScoreBadge(r2rResults.score)}
                {dealType === 'SOCIAL' && renderScoreBadge(socialResults.score)}

                {(dealType === 'BTL' && btlResults.score === 'Incomplete') ||
                 (dealType === 'HMO' && hmoResults.score === 'Incomplete') ||
                 (dealType === 'FLIP' && flipResults.score === 'Incomplete') ||
                 (dealType === 'SA' && saResults.score === 'Incomplete') ||
                 (dealType === 'BRRR' && brrrResults.score === 'Incomplete') ||
                 (dealType === 'R2R' && r2rResults.score === 'Incomplete') ||
                 (dealType === 'SOCIAL' && socialResults.score === 'Incomplete') ? (
                  <p className="text-sm opacity-80 mt-2">Enter properties to see verdict</p>
                ) : null}

                {marketValue > 0 && (
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
              
              <div className="bg-card text-card-foreground p-6 rounded-t-3xl">
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
                      <MetricBox label="Monthly Flow" value={formatCurrency(btlResults.monthlyCashFlow)} highlight={btlResults.monthlyCashFlow < 0} tooltip={TT.monthlyFlow} />
                      <MetricBox label="Annual Flow" value={formatCurrency(btlResults.annualCashFlow)} highlight={btlResults.annualCashFlow < 0} tooltip={TT.annualFlow} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
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
                      <MetricBox label="Monthly Flow" value={formatCurrency(hmoResults.monthlyCashFlow)} highlight={hmoResults.monthlyCashFlow < 0} tooltip={TT.monthlyFlow} />
                      <MetricBox label="Annual Flow" value={formatCurrency(hmoResults.annualCashFlow)} highlight={hmoResults.annualCashFlow < 0} tooltip={TT.annualFlow} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
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
                    <div className="space-y-3">
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
                      <MetricBox label="Monthly Flow" value={formatCurrency(saResults.monthlyCashFlow)} highlight={saResults.monthlyCashFlow < 0} tooltip={TT.monthlyFlow} />
                      <MetricBox label="Annual Flow" value={formatCurrency(saResults.annualCashFlow)} highlight={saResults.annualCashFlow < 0} tooltip={TT.annualFlow} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
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
                      <MetricBox label="Monthly Flow" value={formatCurrency(brrrResults.monthlyCashFlow)} highlight={brrrResults.monthlyCashFlow < 0} tooltip={TT.monthlyFlow} />
                      <MetricBox label="Annual Flow" value={formatCurrency(brrrResults.annualCashFlow)} highlight={brrrResults.annualCashFlow < 0} tooltip={TT.annualFlow} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
                      <Row label="Refinance Loan" value={formatCurrency(brrrResults.refinanceLoan)} tooltip={TT.brrrRefinanceLoan} />
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
                    <div className="space-y-3">
                      <Row label="Management Fees/mo" value={formatCurrency(r2rResults.managementFees)} tooltip={TT.r2rMgmtFees} />
                      <Row label="Gross Return on Setup" value={formatPercent(r2rResults.grossYield)} tooltip={TT.r2rGrossReturn} />
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
                      <MetricBox label="Monthly Flow" value={formatCurrency(socialResults.monthlyCashFlow)} highlight={socialResults.monthlyCashFlow < 0} tooltip={TT.monthlyFlow} />
                      <MetricBox label="Annual Flow" value={formatCurrency(socialResults.annualCashFlow)} highlight={socialResults.annualCashFlow < 0} tooltip={TT.annualFlow} />
                    </div>
                    <div className="h-px bg-border" />
                    <div className="space-y-3">
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
            </Card>
          </div>
        </div>

        <div
          className="mt-8 bg-white rounded-2xl p-6"
          style={{ borderTop: '2px solid #1B3A6B', boxShadow: '0 4px 16px rgba(27, 58, 107, 0.08)' }}
        >
          <h3 className="font-semibold text-sm uppercase tracking-widest mb-5" style={{ color: '#1B3A6B' }}>
            Prepared by
          </h3>
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

          {/* Sourcer branding */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1">
                <Label className="text-xs">Your Logo <span className="text-slate-400 font-normal">(appears on PDF cover)</span></Label>
              </div>
              {logoBase64 ? (
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
            <div className="space-y-1.5">
              <Label className="text-xs">Brand Colour <span className="text-slate-400 font-normal">(PDF accents & headers)</span></Label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColour}
                  onChange={(e) => setBrandColour(e.target.value)}
                  className="h-10 w-14 cursor-pointer rounded-lg border border-border p-0.5 bg-white"
                  data-testid="input-brand-colour"
                />
                <div className="h-8 w-8 rounded-md border border-border shadow-sm" style={{ backgroundColor: brandColour }} />
                <span className="text-xs text-slate-500 font-mono">{brandColour}</span>
                <button
                  type="button"
                  onClick={() => setBrandColour('#1B3A6B')}
                  className="text-xs text-slate-400 hover:text-slate-600 transition ml-auto"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <PDFDownloadLink
              document={<DealScorePDF {...pdfProps} />}
              fileName={`DealScore-${(propertyAddress || 'Property').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)}-${dealLabel.replace(/[\s/]+/g, '-')}.pdf`}
              style={{ flex: 1, textDecoration: 'none' }}
              data-testid="button-download-pdf"
            >
              {({ loading }: { loading: boolean }) => (
                <div
                  className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-white font-semibold text-sm shadow-md hover:opacity-90 active:scale-[0.99] transition w-full cursor-pointer"
                  style={{ backgroundColor: '#1B3A6B' }}
                >
                  <Download className="w-4 h-4" />
                  {loading ? 'Generating PDF…' : 'Download Investor Summary PDF'}
                </div>
              )}
            </PDFDownloadLink>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center justify-center gap-2 py-3 px-5 rounded-xl text-white font-semibold text-sm shadow-md hover:opacity-90 active:scale-[0.99] transition"
              style={{ backgroundColor: '#6B7280' }}
              data-testid="button-reset"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

function MetricBox({ label, value, highlight = false, tooltip }: { label: string, value: string, highlight?: boolean, tooltip?: string | { text: string; formula: string } }) {
  return (
    <div className="p-4 rounded-xl bg-muted/50 border border-border flex flex-col justify-center">
      <span className="text-xs text-muted-foreground mb-1 flex items-center gap-0.5">
        {label}
        {tooltip && <InfoIcon id={`mb-${label.replace(/[^a-z0-9]/gi, '')}`} text={tooltip} />}
      </span>
      <span className={`text-xl font-bold tracking-tight ${highlight ? 'text-destructive' : 'text-foreground'}`}>
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
    <div className="flex justify-between items-center py-1">
      <span className="text-sm text-muted-foreground flex items-center gap-0.5">
        {label}
        {tooltip && <InfoIcon id={`row-${label.replace(/[^a-z0-9]/gi, '')}`} text={tooltip} />}
      </span>
      <span className={`text-base ${isBold ? 'font-bold text-primary' : 'font-medium text-foreground'}`}>
        {value}
      </span>
    </div>
  );
}

const TT = {
  propAddress: 'The full address of the property being analysed. This appears on the investor PDF.',
  propType: 'The type of property — affects lender appetite and mortgage options.',
  tenure: 'Freehold means you own the building and land outright. Leasehold means you own the property for a fixed term. Most lenders require 70+ years remaining on a lease.',
  leaseLength: 'The number of years remaining on the lease. Properties with under 70 years can be difficult to mortgage.',
  purchasePrice: 'The price you are paying to buy the property. This is the starting point for all calculations.',
  propTax: 'Stamp Duty (England & Northern Ireland), LTT (Wales), or LBTT (Scotland). Automatically calculated based on country, buyer type, and purchase price.',
  refurbCost: 'The total cost of any renovation or refurbishment work needed before the property can be let or sold.',
  otherCosts: 'All other purchase costs — legal fees, survey, broker fees, and any other one-off costs.',
  deposit: 'The percentage of the purchase price you are putting in as a cash deposit. Most BTL lenders require 25%.',
  mortgageRate: 'The annual interest rate on your mortgage. Check with your broker for current BTL rates.',
  marketValue: 'The true open market value of the property — used to calculate BMV (Below Market Value) and equity on day one.',
  sourcingFee: 'The fee you are charging the investor for finding and packaging this deal. Appears prominently on the PDF.',
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
  dealScore: { text: 'The overall rating of this deal based on UK investor standards.', formula: 'Strong = excellent returns\nAverage = acceptable but room for improvement\nWeak = does not meet investment criteria' },
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
  r2rNetReturn: { text: 'Annual net profit as a percentage of your setup costs. The true ROI on an R2R deal — this is what you actually earn on your invested capital.', formula: '(Annual Net Profit ÷ Setup Costs) × 100' },
  socialGrossYield: { text: 'Annual guaranteed lease income as a percentage of purchase price.', formula: '(Monthly Lease Income × 12) ÷ Purchase Price × 100' },
  socialNetYield: { text: 'Annual lease income minus management costs, as a percentage of purchase price. The property-level return before financing.', formula: '((Lease Income − Management Costs) × 12) ÷ Purchase Price × 100' },
  socialCocRoi: { text: 'Annual cash flow as a percentage of cash invested. Your leveraged return as an investor.', formula: '(Annual Cash Flow ÷ Total Cash Invested) × 100' },
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
