const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";

const AI_SYSTEM_PROMPT = `You are a PSC Lash Academy Instagram strategist.
Analyse these Instagram screenshots from a lash
artist's page and give brutally specific feedback.

Return ONLY valid JSON with this structure:
{
  grid_aesthetic: {
    score: 1-10,
    verdict: one sentence,
    issues: [up to 3 specific things you see],
    fixes: [up to 3 specific actions]
  },
  content_mix: {
    score: 1-10,
    verdict: one sentence,
    issues: [up to 3 specific things],
    fixes: [up to 3 specific actions]
  },
  positioning_clarity: {
    score: 1-10,
    verdict: one sentence,
    issues: [up to 3 specific things],
    fixes: [up to 3 specific actions]
  },
  hook_strength: {
    score: 1-10,
    verdict: one sentence,
    issues: [up to 3 specific things],
    fixes: [up to 3 specific actions]
  },
  overall_instagram_score: 1-100,
  biggest_win: one specific positive thing,
  most_urgent_fix: one specific action to take today
}

Be specific. Name what you actually see.
Score honestly — most lash pages score 40-65.
Do not be generic.`;

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
