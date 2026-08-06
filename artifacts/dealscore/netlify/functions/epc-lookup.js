exports.handler = async (event) => {
  const { postcode, address: addressParam } = event.queryStringParameters || {};
  if (!postcode) {
    return { statusCode: 400, body: JSON.stringify({ error: 'postcode required' }) };
  }

  const token = process.env.EPC_BEARER_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'EPC_BEARER_TOKEN not configured' }) };
  }

  const BASE = 'https://api.get-energy-performance-data.communities.gov.uk';
  const headers = { 'Accept': 'application/json', 'Authorization': `Bearer ${token}` };

  // Normalise for fuzzy comparison: lowercase, strip all non-alphanumeric characters
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Extract the house number/name token from the entered address.
  // Takes the first comma-part ("65A Horwood Close"), then the first space-delimited token ("65A").
  // Normalised to "65a" — will match EPC "65A HORWOOD CLOSE" → norm → "65ahorwoodclose".startsWith("65a") ✓
  // For named properties ("Rose Cottage, High Street") this extracts "rosecottage" which is slightly
  // aggressive — the starts-with check on a2 handles flat-style cases where a2 has the building number.
  const houseToken = addressParam
    ? norm(addressParam.split(',')[0].trim().split(/\s+/)[0])
    : null;

  const respond = (body) => ({
    statusCode: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  });

  try {
    // Fetch up to 50 results for the postcode — most UK postcodes have well under this
    const searchRes = await fetch(
      `${BASE}/api/domestic/search?postcode=${encodeURIComponent(postcode)}&page_size=50`,
      { headers }
    );
    const searchData = await searchRes.json();
    const results = searchData?.data || [];

    if (results.length === 0) {
      return respond({ data: null, matchStatus: 'no_certificate' });
    }

    let matched = null;

    if (results.length === 1) {
      // Only one certificate for this postcode — confidence is naturally high
      matched = results[0];
    } else if (houseToken) {
      // Multiple results: find the one whose address starts with the house number/name token.
      // Check addressLine1 first (houses), then addressLine2 (flats, where a1 is the flat label).
      matched = results.find(r => {
        const a1 = norm(r.addressLine1 || '');
        const a2 = norm(r.addressLine2 || '');
        return a1.startsWith(houseToken) || a2.startsWith(houseToken);
      }) || null;
    } else {
      // No address hint passed — fall back to first result (legacy / no-address-entered path)
      matched = results[0];
    }

    if (!matched) {
      // Certificates exist for this postcode but none matched the entered house number/name.
      // Return a distinct signal so the UI can warn the user rather than silently showing wrong data.
      return respond({ data: null, matchStatus: 'no_match' });
    }

    // Fetch the full certificate for the matched result — floor area, property type, and
    // richer EPC data live here, not on the search endpoint
    const certRes = await fetch(
      `${BASE}/api/certificate?certificate_number=${encodeURIComponent(matched.certificateNumber)}`,
      { headers }
    );
    const certData = await certRes.json();

    const merged = {
      ...certData.data,
      certificateNumber: matched.certificateNumber,
      registrationDate: matched.registrationDate,
    };

    return respond({ data: merged, matchStatus: 'matched' });
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
