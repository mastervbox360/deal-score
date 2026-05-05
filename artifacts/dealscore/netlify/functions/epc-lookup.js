exports.handler = async (event) => {
  const postcode = event.queryStringParameters?.postcode;
  if (!postcode) {
    return { statusCode: 400, body: JSON.stringify({ error: 'postcode required' }) };
  }

  const token = process.env.EPC_BEARER_TOKEN;
  if (!token) {
    return { statusCode: 500, body: JSON.stringify({ error: 'EPC_BEARER_TOKEN not configured' }) };
  }

  try {
    const url = `https://api.get-energy-performance-data.communities.gov.uk/api/domestic/search?postcode=${encodeURIComponent(postcode)}&page_size=1`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
