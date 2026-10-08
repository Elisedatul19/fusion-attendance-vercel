module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { name, team, shift, type, date, time, reason, submittedAt } = req.body || {};

  if (!name || !team || !shift || !type || !date) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  if (!process.env.TEAMS_FLOW_URL) {
    return res.status(500).json({ error: "TEAMS_FLOW_URL not set" });
  }

  try {
    const r = await fetch(process.env.TEAMS_FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, team, shift, type, date,
        time: time || "",
        reason: reason || "",
        submittedAt: submittedAt || new Date().toISOString(),
      }),
    });

    if (!r.ok) {
      return res.status(502).json({ error: "Flow rejected request", status: r.status });
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: "Failed to reach flow" });
  }
};
