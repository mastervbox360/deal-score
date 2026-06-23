import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normaliseCountry(raw: string): string {
  if (!raw) return 'England'
  const r = raw.toUpperCase().replace(/[_\s-]/g, '')
  if (r === 'WALES' || r === 'CYMRU' || r === 'CYM') return 'Wales'
  if (r === 'SCOTLAND' || r === 'ALBA' || r === 'SCO') return 'Scotland'
  if (r.includes('NORTHERN') || r === 'NI' || r === 'NORTHERNIRELAND') return 'Northern Ireland'
  return 'England'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { postcode, address } = await req.json()
    if (!postcode) {
      return new Response(JSON.stringify({ error: 'postcode required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const pc = postcode.replace(/\s+/g, ' ').trim().toUpperCase()
    const result: Record<string, unknown> = {}

    // ── 1. postcodes.io — country, region, lat/lng (full postcode or outcode) ─
    const isFullPostcode = /^[A-Z]{1,2}\d{1,2}[A-Z]?\s\d[A-Z]{2}$/.test(pc)
    const pcApiUrl = isFullPostcode
      ? `https://api.postcodes.io/postcodes/${encodeURIComponent(pc)}`
      : `https://api.postcodes.io/outcodes/${encodeURIComponent(pc)}`
    try {
      const pcRes = await fetch(pcApiUrl)
      const pcJson = await pcRes.json()
      if (pcJson.status === 200 && pcJson.result) {
        const r = pcJson.result
        const countryRaw = typeof r.country === 'string' ? r.country
          : Array.isArray(r.country) ? (r.country[0] || '') : ''
        result.country = normaliseCountry(countryRaw)
        result.region = r.region || null
        result.latitude = r.latitude
        result.longitude = r.longitude
        result.ward = r.admin_ward
        result.constituency = r.parliamentary_constituency
      }
    } catch (_) {}

    // ── 2. EPC Register (gov.uk) — energy rating, floor area, tenure ─────────
    const epcKey = Deno.env.get('EPC_API_KEY')
    if (epcKey && isFullPostcode) {
      try {
        const epcQuery = address
          ? `postcode=${encodeURIComponent(pc)}&address=${encodeURIComponent(address)}&size=1`
          : `postcode=${encodeURIComponent(pc)}&size=1`
        const epcRes = await fetch(
          `https://epc.opendatacommunities.org/api/v1/domestic/search?${epcQuery}`,
          {
            headers: {
              Accept: 'application/json',
              Authorization: `Basic ${btoa(`${epcKey}:`)}`,
            },
          }
        )
        if (epcRes.ok) {
          const epcJson = await epcRes.json()
          const rows = epcJson?.rows
          if (rows && rows.length > 0) {
            const row = rows[0]
            const band = String(row['current-energy-rating'] || '').trim().toUpperCase()
            if (['A', 'B', 'C', 'D', 'E', 'F', 'G'].includes(band)) result.epcRating = band
            if (row['floor-area']) result.floorAreaSqm = Math.round(Number(row['floor-area']))
            if (row['construction-age-band']) result.constructionAgeBand = row['construction-age-band']
            if (row['built-form']) result.builtForm = row['built-form']
            if (row['main-fuel']) result.heatingType = row['main-fuel']
            // Tenure detection from EPC text fields
            const epcText = JSON.stringify(row).toLowerCase()
            if (/share.of.freehold/.test(epcText)) result.tenure = 'Share of freehold'
            else if (/leasehold/.test(epcText)) result.tenure = 'Leasehold'
            else if (/freehold/.test(epcText)) result.tenure = 'Freehold'
          }
        }
      } catch (_) {}
    }

    // ── 3. Environment Agency Flood Risk (England / Wales only) ─────────────
    if (result.latitude && result.longitude &&
        (result.country === 'England' || result.country === 'Wales')) {
      try {
        const lat = result.latitude as number
        const lng = result.longitude as number
        const zone3Url = `https://environment.data.gov.uk/arcgis/rest/services/EA/FloodMapForPlanningRiversAndSeaFloodZone3/MapServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&returnCountOnly=true&f=json`
        const zone3Res = await fetch(zone3Url)
        if (zone3Res.ok) {
          const zone3Json = await zone3Res.json()
          if ((zone3Json?.count ?? 0) > 0) {
            result.floodRisk = 'High'
            result.floodZone = '3'
          } else {
            const zone2Url = `https://environment.data.gov.uk/arcgis/rest/services/EA/FloodMapForPlanningRiversAndSeaFloodZone2/MapServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&returnCountOnly=true&f=json`
            const zone2Res = await fetch(zone2Url)
            if (zone2Res.ok) {
              const zone2Json = await zone2Res.json()
              result.floodRisk = (zone2Json?.count ?? 0) > 0 ? 'Medium' : 'Low'
              result.floodZone = (zone2Json?.count ?? 0) > 0 ? '2' : '1'
            }
          }
        }
      } catch (_) {}
    }

    return new Response(JSON.stringify({ success: true, ...result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error)?.message || 'Property intelligence lookup failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})
