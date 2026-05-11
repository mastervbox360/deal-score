import type { Handler } from "@netlify/functions";

const handler: Handler = async (event) => {
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
  };

  try {
    body = JSON.parse(event.body ?? "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON" }) };
  }

  const { address, strategy, purchasePrice, grossYield, cashFlow, roi, dealScore, whyThisStrategy } = body;

  const prompt = `You are a professional UK property investment analyst. Write a concise 3–4 sentence executive summary for an investor pack about the following property deal. Be factual, professional, and highlight the key investment merits. Do not use bullet points or headers — just flowing prose.

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
    const block = data.content?.[0];
    const summary = block?.type === "text" ? block.text.trim() : "";

    if (!summary) {
      return { statusCode: 502, body: JSON.stringify({ error: "No summary returned" }) };
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
