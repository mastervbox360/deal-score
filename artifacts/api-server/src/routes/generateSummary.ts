import { Router } from "express";
import Anthropic from "@anthropic-ai/sdk";

const router = Router();

router.post("/generate-summary", async (req, res) => {
  const {
    address,
    strategy,
    purchasePrice,
    grossYield,
    cashFlow,
    roi,
    dealScore,
    whyThisStrategy,
  } = req.body as {
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
    const anthropic = new Anthropic({
      baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
      apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "placeholder",
    });

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

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    const summary = block.type === "text" ? block.text.trim() : "";

    res.json({ summary });
  } catch (err) {
    const log = (req as unknown as { log?: { error: (...a: unknown[]) => void } }).log;
    log?.error(err, "Failed to generate summary");
    res.status(500).json({ error: "Failed to generate summary" });
  }
});

export default router;
