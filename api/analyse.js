const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const AI_SYSTEM_PROMPT = `You are an expert lash business consultant and Instagram strategist
trained by PSC Lash Academy. You are analysing a lash artist's
Instagram screenshots to give them a brutally honest, specific audit.

Analyse the images and return ONLY a JSON object with this exact
structure — no other text:
{
  grid_aesthetic: { score: 0-10, verdict: string, issues: [string], fixes: [string] },
  positioning_clarity: { score: 0-10, verdict: string, issues: [string], fixes: [string] },
  content_mix: { score: 0-10, verdict: string, issues: [string], fixes: [string] },
  work_quality_presentation: { score: 0-10, verdict: string, issues: [string], fixes: [string] },
  call_to_action: { score: 0-10, verdict: string, issues: [string], fixes: [string] },
  overall_instagram_score: number,
  biggest_win: string,
  most_urgent_fix: string
}

Be specific. Name exact things you see. Do not be generic.
If you see the same style repeated, say it. If the bio is vague,
say exactly what is vague about it. If captions have no hook,
say that. Score honestly — most lash pages score 3-6 out of 10.`;

function parseJsonBody(req) {
  if (!req || req.body == null) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      return {};
    }
  }
  if (typeof req.body === "object") return req.body;
  return {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  const apiKey = process.env.ANTHROPIC_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Server configuration missing ANTHROPIC_KEY." });
  }

  const body = parseJsonBody(req);
  const images = Array.isArray(body.images) ? body.images : [];
  if (!images.length) {
    return res.status(400).json({ error: "At least one base64 image is required." });
  }

  const content = [
    {
      type: "text",
      text: "Analyse these uploaded Instagram screenshots and return only the JSON object."
    }
  ];

  images.forEach((img) => {
    if (!img || !img.data) return;
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: img.mime || "image/jpeg",
        data: img.data
      }
    });
  });

  if (content.length === 1) {
    return res.status(400).json({ error: "Images were provided but no valid base64 payloads were found." });
  }

  try {
    const response = await fetch(ANTHROPIC_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1600,
        system: AI_SYSTEM_PROMPT,
        messages: [{ role: "user", content }]
      })
    });

    const payload = await response.json().catch(async () => {
      const text = await response.text();
      return { error: text || "Unknown Anthropic response error." };
    });

    if (!response.ok) {
      return res.status(response.status).json({
        error: "Anthropic request failed.",
        details: payload
      });
    }

    return res.status(200).json(payload);
  } catch (error) {
    return res.status(500).json({
      error: "Unexpected server error while calling Anthropic.",
      details: error && error.message ? error.message : "Unknown error"
    });
  }
}
