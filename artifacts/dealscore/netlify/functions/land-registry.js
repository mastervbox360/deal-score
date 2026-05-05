exports.handler = async (event) => {
  const postcode = event.queryStringParameters?.postcode;
  if (!postcode) {
    return { statusCode: 400, body: JSON.stringify({ error: 'postcode required' }) };
  }

  try {
    const raw = postcode.replace(/\s+/g, '').toUpperCase();
    const formatted = raw.slice(0, -3) + ' ' + raw.slice(-3);
    const url = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${encodeURIComponent(formatted)}&_pageSize=1&_sort=-transactionDate`;
    const response = await fetch(url);
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
