

const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Method not allowed" }) };
  }

  let body: {
    address?: string;
    strategy?: string;
    purchasePrice?: number;
    grossYield?: string;
    cashFlow?: number;
    roi?: string;
    dealScore?: string;
    whyThisStrategy?: string;
    promptType?: string;
    bmvPercent?: number;
  };

  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { address, strategy, purchasePrice, grossYield, cashFlow, roi, dealScore, whyThisStrategy, promptType, bmvPercent } = body;

  const prompt = promptType === 'strategy'
    ? `You are a professional UK property sourcer writing a brief rationale for an investor pack. Write exactly 2–3 sentences in first person explaining why the ${strategy || "chosen"} strategy was selected for this specific deal. Reference the key metrics where available and mention BMV if applicable. Be specific and professional. Do not use bullet points or headers — just flowing prose.

Property: ${address || "Address not specified"}
Strategy: ${strategy || "Not specified"}
Purchase Price: ${purchasePrice ? "£" + purchasePrice.toLocaleString("en-GB") : "Not entered"}
Gross Yield / ROI: ${grossYield || "N/A"}
Monthly Cash Flow: ${cashFlow != null ? "£" + Math.round(cashFlow).toLocaleString("en-GB") : "N/A"}
BMV: ${bmvPercent != null && bmvPercent > 0 ? bmvPercent.toFixed(1) + "% below market value" : "N/A"}
Deal Score: ${dealScore || "Incomplete"}

Write the strategy rationale now:`
    : `You are a professional UK property investment analyst. Write a concise 3–4 sentence executive summary for an investor pack about the following property deal. Be factual, professional, and highlight the key investment merits. Do not use bullet points or headers — just flowing prose.

Property: ${address || "Address not specified"}
Strategy: ${strategy || "Not specified"}
Purchase Price: ${purchasePrice ? "£" + purchasePrice.toLocaleString("en-GB") : "Not entered"}
Gross Yield: ${grossYield || "N/A"}
Monthly Cash Flow: ${cashFlow != null ? "£" + Math.round(cashFlow).toLocaleString("en-GB") : "N/A"}
Cash-on-Cash ROI: ${roi || "N/A"}
Deal Score: ${dealScore || "Incomplete"}
Why this strategy: ${whyThisStrategy || "Not specified"}

Write the executive summary now:`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json() as { content?: Array<{ type: string; text: string }>; error?: { message: string } };
    if (data.error) {
      return { statusCode: 502, body: JSON.stringify({ error: data.error.message }) };
    }
    const block = data.content?.[0];
    const summary = block?.type === "text" ? block.text.trim() : "";

    if (!summary) {
      return { statusCode: 502, body: JSON.stringify({ error: data.error?.message || "No summary returned", raw: JSON.stringify(data) }) };
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ summary }),
    };
  } catch {
    return { statusCode: 500, body: JSON.stringify({ error: "Failed to generate summary" }) };
  }
};

export { handler };
