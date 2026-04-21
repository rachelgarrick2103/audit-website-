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

  const key = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID;
  if (!key || !voiceId) {
    return res.status(500).json({
      error: "Server missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID"
    });
  }

  const body = parseBody(req);
  const text = String(body.text || "").trim();
  if (!text) {
    return res.status(400).json({ error: "Text is required" });
  }

  try {
    const elevenResponse = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "xi-api-key": key
        },
        body: JSON.stringify({
          text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.8
          }
        })
      }
    );

    if (!elevenResponse.ok) {
      const errText = await elevenResponse.text().catch(() => "");
      return res.status(elevenResponse.status).json({
        error: "ElevenLabs request failed",
        details: errText
      });
    }

    const arrayBuffer = await elevenResponse.arrayBuffer();
    const base64Audio = Buffer.from(arrayBuffer).toString("base64");
    return res.status(200).json({
      audioBase64: base64Audio,
      mimeType: "audio/mpeg"
    });
  } catch (error) {
    return res.status(500).json({
      error: "Speech generation failed",
      details: error && error.message ? error.message : "Unknown error"
    });
  }
}
