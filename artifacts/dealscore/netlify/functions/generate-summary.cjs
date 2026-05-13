exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) }; }
  const { address, strategy, purchasePrice, grossYield, cashFlow, roi, dealScore, whyThisStrategy, promptType, bmvPercent } = body;
  const prompt = promptType === "strategy"
    ? "You are a professional UK property sourcer. Write 2-3 sentences in first person explaining why the " + (strategy||"chosen") + " strategy was selected. Purchase Price: " + (purchasePrice ? "£"+Number(purchasePrice).toLocaleString("en-GB") : "Not entered") + ". Deal Score: " + (dealScore||"Incomplete") + ". Write the rationale now:"
    : "You are a professional UK property investment analyst. Write a 3-4 sentence executive summary. Strategy: " + (strategy||"Not specified") + ". Purchase Price: " + (purchasePrice ? "£"+Number(purchasePrice).toLocaleString("en-GB") : "Not entered") + ". Gross Yield: " + (grossYield||"N/A") + ". Monthly Cash Flow: " + (cashFlow!=null ? "£"+Math.round(cashFlow) : "N/A") + ". ROI: " + (roi||"N/A") + ". Deal Score: " + (dealScore||"Incomplete") + ". Write the summary now:";
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY||"" , "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 300, messages: [{ role: "user", content: prompt }] })
    });
    const data = await response.json();
    if (data.error) return { statusCode: 502, body: JSON.stringify({ error: data.error.message }) };
    const block = data.content && data.content[0];
    const summary = block && block.type === "text" ? block.text.trim() : "";
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ summary }) };
  } catch(err) {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed", detail: err.message }) };
  }
};