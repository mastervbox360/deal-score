exports.handler = async function(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }
  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch(e) { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) }; }
  const { address, strategy, purchasePrice, grossYield, cashFlow, roi, dealScore, whyThisStrategy, promptType, bmvPercent } = body;
  const prompt = promptType === "strategy"
    ? "You are a professional UK property sourcer. Write 2-3 sentences explaining why the " + (strategy||"chosen") + " strategy was selected. Purchase Price: " + (purchasePrice ? "£"+Number(purchasePrice).toLocaleString("en-GB") : "Not entered") + ". Deal Score: " + (dealScore||"Incomplete") + ". Write in third person from the perspective of a professional analyst briefing an investor. Do not use first person language (no 'I', 'me', 'my', 'we'). The tone should be objective and professional. Do not include any introductory line such as 'Here is the rationale' or 'The following explains'. Start directly with the strategic reasoning. Do not wrap the response in quotation marks. Write the rationale now:"
    : "You are a professional UK property investment analyst. Write a 3-4 sentence executive summary. Property: " + (address||"Not specified") + ". Strategy: " + (strategy||"Not specified") + ". Purchase Price: " + (purchasePrice ? "£"+Number(purchasePrice).toLocaleString("en-GB") : "Not entered") + ". Gross Yield: " + (grossYield||"N/A") + ". Monthly Cash Flow: " + (cashFlow!=null ? "£"+Math.round(cashFlow) : "N/A") + ". ROI: " + (roi||"N/A") + ". Deal Score: " + (dealScore||"Incomplete") + ". Include one concise sentence about the location's investment context (e.g. rental demand, regeneration, commuter links) based on the property address provided. If the address is insufficient to make a specific location observation, omit this sentence. Write in third person from the perspective of a professional analyst briefing an investor. Do not use first person language (no 'I', 'me', 'my', 'we'). The tone should be objective and professional. Do not include a heading or title. Start directly with the summary content. Write the summary now:";
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY||"" , "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 300, messages: [{ role: "user", content: prompt }] })
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