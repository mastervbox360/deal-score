exports.handler = async (event) => {
  const postcode = event.queryStringParameters?.postcode;
  if (!postcode) {
    return { statusCode: 400, body: JSON.stringify({ error: 'postcode required' }) };
  }

  const token = process.env.EPC_BEARER_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'EPC_BEARER_TOKEN not configured' }) };
  }

  const BASE = 'https://api.get-energy-performance-data.communities.gov.uk';
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

  try {
    // Step 1 — Search by postcode, most recent certificate first (default ordering)
    const searchRes = await fetch(
      `${BASE}/api/domestic/search?postcode=${encodeURIComponent(postcode)}&page_size=1`,
      { headers }
    );
    const searchData = await searchRes.json();
    const firstResult = searchData?.data?.[0];

    if (!firstResult?.certificateNumber) {
      // No EPC certificate found for this postcode — signal "no certificate" to frontend
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ data: null }),
      };
    }

    // Step 2 — Fetch the full certificate; this is where floor area, property type, and
    // richer data (heating, costs, potential rating) actually live
    const certRes = await fetch(
      `${BASE}/api/certificate?certificate_number=${encodeURIComponent(firstResult.certificateNumber)}`,
      { headers }
    );
    const certData = await certRes.json();

    // Merge the certificateNumber and registrationDate from the search result so the
    // frontend has them if needed, then return the full merged certificate object
    const merged = {
      ...certData.data,
      certificateNumber: firstResult.certificateNumber,
      registrationDate: firstResult.registrationDate,
    };

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ data: merged }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
