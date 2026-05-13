exports.handler = async function(event) {
  const postcode = event.queryStringParameters?.postcode;
  if (!postcode) {
    return { statusCode: 200, body: JSON.stringify({ results: [] }) };
  }

  try {
    const raw = postcode.replace(/\s+/g, '').toUpperCase();
    const formatted = raw.slice(0, -3) + ' ' + raw.slice(-3);
    const url = `https://landregistry.data.gov.uk/data/ppi/transaction-record.json?propertyAddress.postcode=${encodeURIComponent(formatted)}&_limit=5&_sort=-transactionDate`;
    const response = await fetch(url);
    const data = await response.json();
    const items = data?.result?.items || [];

    const getLdValue = (field) => {
      if (!field) return null;
      if (typeof field === 'string') return field;
      if (typeof field === 'number') return String(field);
      if (field?.label?.[0]?.['_value']) return field.label[0]['_value'];
      if (field?.['_value'] != null) return String(field['_value']);
      if (typeof field?.['@id'] === 'string') return field['@id'].split('/').pop() || null;
      return null;
    };

    const typeMap = {
      'terraced': 'Terraced',
      'semi-detached': 'Semi-Detached',
      'detached': 'Detached',
      'flat-maisonette': 'Flat/Maisonette',
      'other': 'Other',
    };

    const results = items.slice(0, 5).map(item => {
      const addr = item.propertyAddress || {};
      const saon = getLdValue(addr.saon) || '';
      const paon = getLdValue(addr.paon) || '';
      const street = getLdValue(addr.street) || '';
      const town = getLdValue(addr.town) || '';
      const address = [saon, paon, street, town].filter(Boolean).join(', ');

      const priceRaw = getLdValue(item.pricePaid);
      const price = priceRaw ? parseInt(priceRaw, 10) : 0;

      const dateRaw = getLdValue(item.transactionDate);
      const date = dateRaw ? dateRaw.split('T')[0] : '';

      const typeRaw = getLdValue(item.propertyType)?.toLowerCase() || '';
      const propertyType = typeMap[typeRaw] || typeRaw || '';

      return { address, price, date, propertyType };
    }).filter(r => r.address || r.price > 0);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ results }),
    };
  } catch {
    return {
      statusCode: 200,
      body: JSON.stringify({ results: [] }),
    };
  }
};
