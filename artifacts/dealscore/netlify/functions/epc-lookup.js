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

  // Normalise for comparison: lowercase, strip all non-alphanumeric characters
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Extract the house number/name token from the entered address.
  // Takes the first comma-part ("65A Horwood Close"), then the first space-delimited token ("65A").
  // Result normalised: "65A" → "65a", "Rose Cottage" → "rosecottage".
  const houseToken = addressParam
    ? norm(addressParam.split(',')[0].trim().split(/\s+/)[0])
    : null;

  // Parse a leading house number + optional letter suffix from a normalised address string.
  // "65ahorwoodclose" → { num: "65", suffix: "a" }
  // "65horwoodclose"  → { num: "65", suffix: "" }
  // "rosecottage"     → null (no leading digit — named property)
  // The regex matches one-or-more digits then at most one letter, so "650someroad" gives
  // num "650" (not "65"), and "65bclose" gives suffix "b" (not ""), preventing false positives.
  const parseHouseNum = (token) => {
    const m = token.match(/^(\d+)([a-z]?)/);
    return (m && m[1]) ? { num: m[1], suffix: m[2] || '' } : null;
  };

  // Test whether an EPC address string exactly matches the houseToken.
  // For numeric tokens: requires identical house-number AND letter-suffix.
  //   "65" must NOT match "65a", "65b", or "650"; "65a" must NOT match "65" or "65b".
  // For named-property tokens (no leading digit): falls back to prefix match (no ambiguity risk).
  const addressMatches = (epcAddr, token) => {
    const a = norm(epcAddr);
    const parsedToken = parseHouseNum(token);
    if (parsedToken) {
      const parsedAddr = parseHouseNum(a);
      return parsedAddr !== null &&
             parsedAddr.num === parsedToken.num &&
             parsedAddr.suffix === parsedToken.suffix;
    }
    // Named property — prefix match is safe (e.g. "rosecottage")
    return a.startsWith(token);
  };

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
        return addressMatches(r.addressLine1, houseToken) ||
               addressMatches(r.addressLine2, houseToken);
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
