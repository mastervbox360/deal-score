import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { postcode } = await req.json()
    if (!postcode) {
      return new Response(JSON.stringify({ error: 'postcode required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      })
    }

    const pc = postcode.replace(/\s+/g, '+').toUpperCase()

    const lrUrl = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${pc}&_pageSize=50&_sort=-transactionDate&_properties=transactionDate,pricePaid,propertyAddress,propertyType,estateType`

    const response = await fetch(lrUrl, {
      headers: { Accept: 'application/json' },
    })

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Land Registry returned HTTP ${response.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 422,
      })
    }

    const json = await response.json()
    const items = json?.result?.items || []

    const comps = items.map((item: Record<string, unknown>) => {
      const addr = item.propertyAddress as Record<string, string> | undefined
      const addressParts = [
        addr?.paon, addr?.saon, addr?.street, addr?.town
      ].filter(Boolean).join(' ')

      return {
        date: item.transactionDate,
        price: item.pricePaid,
        address: addressParts || addr?.displayAddress || 'Address not available',
        type: normaliseType(String((item.propertyType as Record<string, string>)?.prefLabel || '')),
        tenure: String((item.estateType as Record<string, string>)?.prefLabel || ''),
      }
    })

    return new Response(JSON.stringify({ success: true, postcode: pc.replace('+', ' '), comps }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error)?.message || 'Failed to fetch comparables' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    })
  }
})

function normaliseType(raw: string): string {
  const t = raw.toLowerCase()
  if (t.includes('semi')) return 'Semi-det.'
  if (t.includes('detached')) return 'Detached'
  if (t.includes('terraced') || t.includes('terrace')) return 'Terraced'
  if (t.includes('flat') || t.includes('maisonette')) return 'Flat'
  if (t.includes('other')) return 'Other'
  return raw
}
