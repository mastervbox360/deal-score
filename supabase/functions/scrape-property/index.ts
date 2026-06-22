// supabase/functions/scrape-property/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Canonical value reference ─────────────────────────────────────────────────
// Values returned by this function MUST exactly match the ISelect option values
// in AnalysisHub.tsx so that setField() auto-populates dropdowns correctly.
//
// propertyType:
//   'Terraced house' | 'End-of-terrace house' | 'Semi-detached house' | 'Detached house'
//   'Flat / Apartment' | 'Studio flat' | 'Maisonette' | 'Bungalow (detached)'
//   'Bungalow (semi-detached)' | 'Converted flat' | 'Purpose-built flat'
//   'HMO' | 'Block of flats' | 'Commercial / mixed use' | 'Land'
//   (any other value → ISelectOther renders it as free text)
//
// tenure:
//   'Freehold' | 'Leasehold' | 'Share of freehold' | 'Commonhold'
//
// epcRating:
//   'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'Unknown'
//
// beds: '1' – '10' (string — ISelect uses string values)
// ─────────────────────────────────────────────────────────────────────────────

interface PropertyData {
  address?: string
  price?: number
  beds?: string
  bathrooms?: string
  country?: string        // canonical: 'England' | 'Wales' | 'Scotland' | 'Northern Ireland'
  propertyType?: string
  description?: string
  postcode?: string
  images?: string[]
  tenure?: string
  epcRating?: string
  leaseYears?: number
  serviceCharge?: number
  groundRent?: number
  councilTaxBand?: string
  source: string
  sourceUrl: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  try {
    const { url } = await req.json()
    if (!url || typeof url !== 'string') {
      return new Response(JSON.stringify({ error: 'URL required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }
    const source = detectSource(url)
    if (!source) {
      return new Response(JSON.stringify({ error: 'Only Rightmove, Zoopla and OnTheMarket URLs are supported' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Referer': 'https://www.google.com/',
      },
      redirect: 'follow',
    })
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Could not fetch listing (HTTP ${response.status}). The site may be blocking automated requests.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
      })
    }
    const html = await response.text()
    if (html.includes('captcha') || html.includes('Access Denied') || html.length < 5000) {
      return new Response(JSON.stringify({ error: 'The listing site returned a bot-detection page. Please enter details manually.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
      })
    }
    let data: PropertyData
    if (source === 'rightmove') data = parseRightmove(html, url)
    else if (source === 'zoopla') data = parseZoopla(html, url)
    else data = parseOTM(html, url)

    if (!data.address && !data.price && !data.beds) {
      return new Response(JSON.stringify({ error: 'Could not extract data from this listing. Please enter details manually.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
      })
    }
    return new Response(JSON.stringify({ success: true, source, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error)?.message || 'Scraping failed — please enter details manually.' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})

function detectSource(url: string): 'rightmove' | 'zoopla' | 'otm' | null {
  if (url.includes('rightmove.co.uk')) return 'rightmove'
  if (url.includes('zoopla.co.uk')) return 'zoopla'
  if (url.includes('onthemarket.com')) return 'otm'
  return null
}

function parseRightmove(html: string, url: string): PropertyData {
  const data: PropertyData = { source: 'Rightmove', sourceUrl: url }
  const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (nextMatch) {
    try {
      const json = JSON.parse(nextMatch[1])
      const prop = json?.props?.pageProps?.propertyData || json?.props?.pageProps?.property || {}
      if (prop.address?.displayAddress) data.address = prop.address.displayAddress
      const outcode = prop.address?.outcode || prop.address?.outCode || ''
      const incode  = prop.address?.incode  || prop.address?.inCode  || ''
      if (outcode || incode) {
        data.postcode = [outcode, incode].filter(Boolean).join(' ').trim()
      } else {
        const altPostcode =
          prop.address?.postcode         ||
          prop.address?.ukPostcode       ||
          prop.address?.fullPostcode     ||
          prop.location?.postcode        ||
          prop.location?.postalCode      ||
          prop.contactInfo?.address?.postcode ||
          ''
        if (altPostcode) data.postcode = String(altPostcode).trim()
      }
      // DEBUG — log raw address keys so we can confirm the right field path
      data.description = (data.description || '') +
        ` [DEBUG addr keys: ${Object.keys(prop.address || {}).join(',')}]`
      if (prop.address?.ukCountry) {
        const nc = normaliseCountry(prop.address.ukCountry)
        if (nc) data.country = nc
      }
      if (prop.prices?.primaryPrice) data.price = parseInt(String(prop.prices.primaryPrice).replace(/[£,\s]/g, '')) || undefined
      if (prop.bedrooms != null) data.beds = normaliseBeds(String(prop.bedrooms))
      const bathroomValue = prop.bathrooms ?? prop.bathroomCount ?? prop.numberOfBathrooms
        ?? prop.internalDetails?.bathrooms ?? prop.summary?.bathrooms
      if (bathroomValue != null) {
        const bathroomNum = parseInt(String(bathroomValue))
        if (!isNaN(bathroomNum) && bathroomNum > 0) data.bathrooms = String(bathroomNum)
      }
      if (prop.propertySubType) data.propertyType = normaliseType(prop.propertySubType)
      if (prop.text?.description) data.description = stripHtml(prop.text.description).substring(0, 600)
      if (prop.tenure?.tenureType) data.tenure = normaliseTenure(prop.tenure.tenureType)
      if (prop.keyFeatures) {
        const epc = extractEpcFromFeatures(prop.keyFeatures)
        if (epc) data.epcRating = epc
      }
      if (Array.isArray(prop.images)) {
        data.images = prop.images.slice(0, 6).map((img: { url?: string; srcUrl?: string }) => img.url || img.srcUrl).filter(Boolean)
      }
      // Leasehold details from key features + description
      const rmText = [
        ...(Array.isArray(prop.keyFeatures) ? prop.keyFeatures.map((f: unknown) => typeof f === 'string' ? f : (f as Record<string,string>)?.content ?? '') : []),
        stripHtml(prop.text?.description || ''),
      ].join(' ')
      const rmLh = extractLeasehold(rmText)
      if (rmLh.leaseYears) data.leaseYears = rmLh.leaseYears
      if (rmLh.serviceCharge) data.serviceCharge = rmLh.serviceCharge
      if (rmLh.groundRent) data.groundRent = rmLh.groundRent
      if (rmLh.councilTaxBand) data.councilTaxBand = rmLh.councilTaxBand
      return data
    } catch (_) {}
  }
  const modelMatch = html.match(/window\.PAGE_MODEL\s*=\s*(\{[\s\S]*?\});\s*[\n\r]/)
  if (modelMatch) {
    try {
      const json = JSON.parse(modelMatch[1])
      const prop = json?.propertyData || {}
      if (prop.address?.displayAddress) data.address = prop.address.displayAddress
      if (prop.prices?.primaryPrice) data.price = parseInt(String(prop.prices.primaryPrice).replace(/[£,\s]/g, ''))
      if (prop.bedrooms != null) data.beds = normaliseBeds(String(prop.bedrooms))
      const bv2 = prop.bathrooms ?? prop.bathroomCount ?? prop.numberOfBathrooms
      if (bv2 != null) { const n2 = parseInt(String(bv2)); if (!isNaN(n2) && n2 > 0) data.bathrooms = String(n2) }
      if (prop.address?.ukCountry) { const nc = normaliseCountry(prop.address.ukCountry); if (nc) data.country = nc }
      if (prop.propertySubType) data.propertyType = normaliseType(prop.propertySubType)
      if (prop.tenure?.tenureType) data.tenure = normaliseTenure(prop.tenure.tenureType)
      return data
    } catch (_) {}
  }
  const ogTitle = html.match(/<meta property="og:title" content="([^"]+)"/)
  if (ogTitle) {
    const title = ogTitle[1]
    const bedsM = title.match(/(\d+)\s+bed/); if (bedsM) data.beds = normaliseBeds(bedsM[1])
    const typeM = title.match(/\d+\s+bed(?:room)?\s+([\w\s-]+?)\s+(?:for sale|to rent)/i)
    if (typeM) data.propertyType = normaliseType(typeM[1].trim())
  }
  const priceM = html.match(/"price"\s*:\s*"(£[\d,]+)"/)
  if (priceM) data.price = parseInt(priceM[1].replace(/[£,]/g, ''))
  // Leasehold details from full page text
  const htmlText = stripHtml(html).substring(0, 8000)
  const htmlLh = extractLeasehold(htmlText)
  if (htmlLh.leaseYears && !data.leaseYears) data.leaseYears = htmlLh.leaseYears
  if (htmlLh.serviceCharge && !data.serviceCharge) data.serviceCharge = htmlLh.serviceCharge
  if (htmlLh.groundRent && !data.groundRent) data.groundRent = htmlLh.groundRent
  if (htmlLh.councilTaxBand && !data.councilTaxBand) data.councilTaxBand = htmlLh.councilTaxBand
  return data
}

function parseZoopla(html: string, url: string): PropertyData {
  const data: PropertyData = { source: 'Zoopla', sourceUrl: url }
  const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (nextMatch) {
    try {
      const json = JSON.parse(nextMatch[1])
      const listing = json?.props?.pageProps?.listingDetails || json?.props?.pageProps?.property || json?.props?.pageProps?.data?.listing || {}
      data.address = listing.displayAddress || listing.address?.displayAddress
      const rawPrice = listing.price || listing.pricing?.askingPrice?.value
      if (rawPrice) data.price = typeof rawPrice === 'number' ? rawPrice : parseInt(String(rawPrice).replace(/[£,\s]/g, ''))
      const beds = listing.numBedrooms ?? listing.beds ?? listing.bedroomsCount
      if (beds != null) data.beds = normaliseBeds(String(beds))
      const zBaths = listing.numBathrooms ?? listing.bathrooms ?? listing.bathroomsCount ?? listing.internalDetails?.bathrooms
      if (zBaths != null) { const nb = parseInt(String(zBaths)); if (!isNaN(nb) && nb > 0) data.bathrooms = String(nb) }
      const zCountry = listing.countryCode || listing.country || listing.address?.country
      if (zCountry) { const nc = normaliseCountry(String(zCountry)); if (nc) data.country = nc }
      data.propertyType = normaliseType(listing.propertyType || listing.type || '')
      if (listing.shortDescription || listing.description) data.description = stripHtml(listing.shortDescription || listing.description).substring(0, 600)
      data.postcode = listing.postcode || listing.address?.postcode
      if (listing.tenure) data.tenure = normaliseTenure(listing.tenure)
      if (listing.epcRating || listing.energyRating) data.epcRating = normaliseEpc(listing.epcRating || listing.energyRating)
      if (listing.keyFeatures) {
        const epc = extractEpcFromFeatures(listing.keyFeatures)
        if (epc && !data.epcRating) data.epcRating = epc
      }
      if (Array.isArray(listing.images)) {
        data.images = listing.images.slice(0, 6).map((img: { url?: string; src?: string } | string) =>
          typeof img === 'string' ? img : img.url || img.src).filter(Boolean)
      }
      const zText = [
        ...(Array.isArray(listing.keyFeatures) ? listing.keyFeatures.map((f: unknown) => typeof f === 'string' ? f : '') : []),
        stripHtml(listing.description || listing.shortDescription || ''),
      ].join(' ')
      const zLh = extractLeasehold(zText)
      if (zLh.leaseYears) data.leaseYears = zLh.leaseYears
      if (zLh.serviceCharge) data.serviceCharge = zLh.serviceCharge
      if (zLh.groundRent) data.groundRent = zLh.groundRent
      if (zLh.councilTaxBand) data.councilTaxBand = zLh.councilTaxBand
      return data
    } catch (_) {}
  }
  return data
}

function parseOTM(html: string, url: string): PropertyData {
  const data: PropertyData = { source: 'OnTheMarket', sourceUrl: url }
  const nextMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (nextMatch) {
    try {
      const json = JSON.parse(nextMatch[1])
      const listing = json?.props?.pageProps?.listing?.data || json?.props?.pageProps?.propertyDetails || json?.props?.pageProps?.property || {}
      data.address = listing.address?.displayAddress || listing.displayAddress || listing.address
      if (listing.price?.amount) data.price = listing.price.amount
      else if (listing.pricing?.price) data.price = listing.pricing.price
      if (listing.bedrooms != null) data.beds = normaliseBeds(String(listing.bedrooms))
      const otmBaths = listing.bathrooms ?? listing.bathroomCount
      if (otmBaths != null) { const nb = parseInt(String(otmBaths)); if (!isNaN(nb) && nb > 0) data.bathrooms = String(nb) }
      const otmCountry = listing.address?.country || listing.country
      if (otmCountry) { const nc = normaliseCountry(String(otmCountry)); if (nc) data.country = nc }
      data.propertyType = normaliseType(listing.propertyType || listing.type || '')
      data.postcode = listing.address?.postcode || listing.postcode
      if (listing.tenure) data.tenure = normaliseTenure(listing.tenure)
      const otmText = stripHtml(listing.description || '').substring(0, 8000)
      const otmLh = extractLeasehold(otmText)
      if (otmLh.leaseYears) data.leaseYears = otmLh.leaseYears
      if (otmLh.serviceCharge) data.serviceCharge = otmLh.serviceCharge
      if (otmLh.groundRent) data.groundRent = otmLh.groundRent
      if (otmLh.councilTaxBand) data.councilTaxBand = otmLh.councilTaxBand
      return data
    } catch (_) {}
  }
  return data
}

// ── Normalisation helpers ─────────────────────────────────────────────────────
// Each function maps portal-specific strings to the exact ISelect canonical values
// defined in AnalysisHub.tsx. Unknown values pass through as-is so ISelectOther
// can render them as free text rather than silently dropping them.

function normaliseType(raw: string): string {
  if (!raw) return ''
  const t = raw.toLowerCase().trim()
  // Check most-specific patterns first to avoid mis-matching substrings
  if (t.includes('end of terrace') || t.includes('end-of-terrace') || t === 'end terrace') return 'End-of-terrace house'
  if (t.includes('studio')) return 'Studio flat'
  if (t.includes('maisonette')) return 'Maisonette'
  if (t.includes('converted flat') || t.includes('converted apartment')) return 'Converted flat'
  if (t.includes('purpose-built flat') || t.includes('purpose built flat') || t.includes('purpose built apartment')) return 'Purpose-built flat'
  if (t.includes('block of flat') || t.includes('block of apartment')) return 'Block of flats'
  // Bungalow variants — check semi before falling through to generic bungalow
  if (t.includes('bungalow') && (t.includes('semi') || t.includes('semi-detached'))) return 'Bungalow (semi-detached)'
  if (t.includes('bungalow')) return 'Bungalow (detached)'
  // House types
  if (t.includes('semi')) return 'Semi-detached house'
  if (t.includes('detached')) return 'Detached house'
  if (t.includes('terraced') || t.includes('terrace')) return 'Terraced house'
  // Flat/apartment (after maisonette/studio/converted/purpose-built checks)
  if (t.includes('flat') || t.includes('apartment')) return 'Flat / Apartment'
  // Other
  if (t.includes('hmo')) return 'HMO'
  if (t.includes('commercial') || t.includes('mixed use') || t.includes('mixed-use')) return 'Commercial / mixed use'
  if (t === 'land' || t.includes('building plot') || t.includes('development site')) return 'Land'
  // Return raw value — ISelectOther will display as "Other (entered manually)"
  return raw.trim()
}

function normaliseTenure(raw: string): string {
  if (!raw) return ''
  const t = raw.toLowerCase().trim()
  if (t.includes('share') && t.includes('freehold')) return 'Share of freehold'
  if (t.includes('freehold')) return 'Freehold'
  if (t.includes('leasehold')) return 'Leasehold'
  if (t.includes('commonhold')) return 'Commonhold'
  return raw.trim()
}

function normaliseEpc(raw: string): string {
  if (!raw) return ''
  const letter = raw.trim().toUpperCase().charAt(0)
  if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(letter)) return letter
  return 'Unknown'
}

function normaliseBeds(raw: string): string {
  const n = parseInt(raw)
  if (isNaN(n) || n < 1) return raw
  if (n >= 10) return '10'
  return String(n)
}

function extractLeasehold(text: string): {
  leaseYears?: number
  serviceCharge?: number
  groundRent?: number
  councilTaxBand?: string
} {
  const result: { leaseYears?: number; serviceCharge?: number; groundRent?: number; councilTaxBand?: string } = {}

  // Lease length: "123 years remaining", "LEASEHOLD (123 years)", "123 year lease"
  const leaseM = text.match(/(\d{2,4})\s+years?\s+(?:remaining|left|unexpired)/i)
    || text.match(/leasehold\s*\(?(\d{2,4})\s+years?\)?/i)
    || text.match(/(\d{2,4})\s+year\s+(?:lease|leasehold)/i)
  if (leaseM) result.leaseYears = parseInt(leaseM[1])

  // Service charge — per annum or per month (convert monthly → annual)
  const scAnnual = text.match(/service\s+charge[:\s£]+([\d,]+)\s*(?:per\s+(?:annum|year)|p\.?a\.?)\b/i)
  const scMonthly = text.match(/service\s+charge[:\s£]+([\d,]+)\s*(?:per\s+month|p\.?c\.?m\.?|p\.?m\.?)\b/i)
  if (scAnnual) result.serviceCharge = parseInt(scAnnual[1].replace(/,/g, ''))
  else if (scMonthly) result.serviceCharge = parseInt(scMonthly[1].replace(/,/g, '')) * 12

  // Ground rent
  const grM = text.match(/ground\s+rent[:\s£]+([\d,]+)/i)
  if (grM) result.groundRent = parseInt(grM[1].replace(/,/g, ''))

  // Council tax band A–H
  const ctM = text.match(/council\s+tax\s+(?:band\s*)?:?\s*([A-H])\b/i)
  if (ctM) result.councilTaxBand = ctM[1].toUpperCase()

  return result
}

function extractEpcFromFeatures(features: unknown): string | null {
  // Portals sometimes include EPC band in key features list — extract it
  if (!Array.isArray(features)) return null
  for (const f of features) {
    const s = typeof f === 'string' ? f : (f?.content ?? f?.text ?? '')
    const m = String(s).match(/\bEPC\s*[Rr]ating[:\s]+([A-G])\b|\bEPC\s*([A-G])\b|\bEnergy\s+[Rr]ating[:\s]+([A-G])\b/i)
    if (m) return normaliseEpc(m[1] || m[2] || m[3])
  }
  return null
}

function normaliseCountry(raw: string): string {
  if (!raw) return ''
  const r = raw.toUpperCase().replace(/[_\s-]/g, '')
  if (r === 'WALES' || r === 'CYM' || r === 'CYMRU') return 'Wales'
  if (r === 'SCOTLAND' || r === 'SCO' || r === 'ALBA') return 'Scotland'
  if (r.includes('NORTHERN') || r === 'NI' || r === 'NORTHERNIRELAND') return 'Northern Ireland'
  if (r === 'ENGLAND' || r === 'ENG') return 'England'
  return ''
}

function stripHtml(str: string): string {
  return str.replace(/<[^>]+>/g, ' ').replace(/\s{2,}/g, ' ').trim()
}
