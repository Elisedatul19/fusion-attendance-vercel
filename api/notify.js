export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, team, shift, type, date, time, reason, lateNotice } = body;

  if (!name || !team || !shift || !type || !date) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!process.env.TEAMS_FLOW_URL) {
    return Response.json({ error: "TEAMS_FLOW_URL not set" }, { status: 500 });
  }

  const card = {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            { type: "TextBlock", text: "Attendance Notice", weight: "Bolder", size: "Large" },
            {
              type: "FactSet",
              facts: [
                { title: "Name", value: name },
                { title: "Team", value: team },
                { title: "Shift start", value: shift },
                { title: "Status", value: type },
                { title: "Date", value: date },
                { title: "Expected time", value: time || "-" },
                { title: "Reason", value: reason || "-" },
                { title: "Notice", value: lateNotice ? "⚠ Late absence notice (under 4 hours before shift)" : "On time" },
              ],
            },
          ],
        },
      },
    ],
  };

  try {
    const r = await fetch(process.env.TEAMS_FLOW_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(card),
    });

    if (!r.ok) {
      const text = await r.text();
      return Response.json(
        { error: "Webhook rejected request", status: r.status, details: text.slice(0, 500) },
        { status: 502 }
      );
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: "Failed to reach webhook" }, { status: 500 });
  }
}
