exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch(e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { address, strategy, purchasePrice, grossYield, cashFlow, roi, dealScore, whyThisStrategy, promptType, bmvPercent } = body;

  const prompt = promptType === "strategy"
    ? "You are a professional UK property sourcer writing a brief rationale for an investor pack. Write exactly 2\u20133 sentences in first person explaining why the " + (strategy || "chosen") + " strategy was selected for this specific deal. Reference the key metrics where available and mention BMV if applicable. Be specific and professional. Do not use bullet points or headers \u2014 just flowing prose.\n\nProperty: " + (address || "Address not specified") + "\nStrategy: " + (strategy || "Not specified") + "\nPurchase Price: " + (purchasePrice ? "\u00A3" + Number(purchasePrice).toLocaleString("en-GB") : "Not entered") + "\nGross Yield / ROI: " + (grossYield || "N/A") + "\nMonthly Cash Flow: " + (cashFlow != null ? "\u00A3" + Math.round(cashFlow).toLocaleString("en-GB") : "N/A") + "\nBMV: " + (bmvPercent != null && bmvPercent > 0 ? bmvPercent.toFixed(1) + "% below market value" : "N/A") + "\nDeal Score: " + (dealScore || "Incomplete") + "\n\nWrite the strategy rationale now:"
    : "You are a professional UK property investment analyst. Write a concise 3\u20134 sentence executive summary for an investor pack about the following property deal. Be factual, professional, and highlight the key investment merits. Do not use bullet points or headers \u2014 just flowing prose.\n\nProperty: " + (address || "Address not specified") + "\nStrategy: " + (strategy || "Not specified") + "\nPurchase Price: " + (purchasePrice ? "\u00A3" + Number(purchasePrice).toLocaleString("en-GB") : "Not entered") + "\nGross Yield: " + (grossYield || "N/A") + "\nMonthly Cash Flow: " + (cashFlow != null ? "\u00A3" + Math.round(cashFlow).toLocaleString("en-GB") : "N/A") + "\nCash-on-Cash ROI: " + (roi || "N/A") + "\nDeal Score: " + (dealScore || "Incomplete") + "\nWhy this strategy: " + (whyThisStrategy || "Not specified") + "\n\nWrite the executive summary now:";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();

    if (data.error) {
      return { statusCode: 502, body: JSON.stringify({ error: data.error.message }) };
    }

    const block = data.content && data.content[0];
    const summary = block && block.type === "text" ? block.text.trim() : "";

    if (!summary) {
      return { statusCode: 502, body: JSON.stringify({ error: "No summary returned", raw: JSON.stringify(data) }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary })
    };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to generate summary", detail: err.message }) };
  }
};
