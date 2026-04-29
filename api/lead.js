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

  const token = process.env.AIRTABLE_TOKEN;
  const baseId = process.env.AIRTABLE_BASE_ID;
  const tableName = process.env.AIRTABLE_TABLE_NAME || "AUDIT";

  if (!token || !baseId) {
    return res.status(500).json({ error: "Server missing Airtable configuration." });
  }

  const body = parseBody(req);
  const name = String(body.name || "").trim();
  const business = String(body.business || "").trim();
  const email = String(body.email || "").trim();

  try {
    const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Name: name,
              Business: business,
              Email: email,
              Source: "180° Audit Checker",
              Date: new Date().toISOString()
            }
          }
        ]
      })
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return res.status(response.status).json({ error: "Airtable request failed", details });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(500).json({
      error: "Airtable lead capture failed",
      details: error && error.message ? error.message : "Unknown error"
    });
  }
}
