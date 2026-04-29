function parseBody(req) {
  if (!req) return {};
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch (e) {
      return {};
    }
  }
  return req.body && typeof req.body === "object" ? req.body : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = parseBody(req);
  const { images = [], auditData = {} } = body;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            ...images.map((img) => ({
              type: "image",
              source: {
                type: "base64",
                media_type: img.type || img.mime || "image/jpeg",
                data: img.data
              }
            })),
            {
              type: "text",
              text: `You are a PSC Lash Academy Instagram strategist. 
Analyse these Instagram screenshots from a lash artist's page.

If any image shows a profile page, read the bio text directly.

Return ONLY valid JSON with no other text:
{
  "grid_aesthetic": {
    "score": 1-10,
    "verdict": "one sentence",
    "issues": ["specific thing 1", "specific thing 2"],
    "fixes": ["specific fix 1", "specific fix 2"]
  },
  "content_mix": {
    "score": 1-10,
    "verdict": "one sentence", 
    "issues": ["specific thing 1", "specific thing 2"],
    "fixes": ["specific fix 1", "specific fix 2"]
  },
  "positioning_clarity": {
    "score": 1-10,
    "verdict": "one sentence",
    "issues": ["specific thing 1", "specific thing 2"],
    "fixes": ["specific fix 1", "specific fix 2"]
  },
  "hook_strength": {
    "score": 1-10,
    "verdict": "one sentence",
    "issues": ["specific thing 1", "specific thing 2"],
    "fixes": ["specific fix 1", "specific fix 2"]
  },
  "bio_analysis": {
    "original_bio": "exact bio text read from screenshot or null",
    "score": 1-10,
    "verdict": "one sentence",
    "what_works": "one positive thing or null",
    "critical_issues": ["issue 1", "issue 2"],
    "rewritten_bio": "rewritten bio under 150 chars with clear positioning and CTA",
    "character_count": 120
  },
  "overall_instagram_score": 65,
  "biggest_win": "one specific positive thing you see",
  "most_urgent_fix": "one specific action to take today"
}

Be specific. Name exactly what you see.
Score honestly — most lash pages score 40-65.
If no profile page visible, set bio_analysis to null.

Audit answers context (optional): ${JSON.stringify(auditData)}`
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    try {
      const parsed = JSON.parse(text);
      res.status(200).json(parsed);
    } catch (e) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        res.status(200).json(JSON.parse(match[0]));
      } else {
        res.status(500).json({ error: "Could not parse analysis" });
      }
    }
  } catch (error) {
    console.error("Analysis error:", error);
    res.status(500).json({ error: error.message });
  }
}
