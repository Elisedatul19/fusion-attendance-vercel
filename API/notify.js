export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, team, shift, type, date, time, reason, submittedAt } = body;

  if (!name || !team || !shift || !type || !date) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!process.env.TEAMS_FLOW_URL) {
    return Response.json({ error: "TEAMS_FLOW_URL not set" }, { status: 500 });
  }

  try {
    const r = await fetch(process.env.TEAMS_FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        team,
        shift,
        type,
        date,
        time: time || "",
        reason: reason || "",
        submittedAt: submittedAt || new Date().toISOString(),
      }),
    });

    if (!r.ok) {
      return Response.json({ error: "Flow rejected request", status: r.status }, { status: 502 });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Failed to reach flow" }, { status: 500 });
  }
}
