const hoursUntilShiftManila = (dateStr, shiftStr) => {
  const m = String(shiftStr || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const d = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || !d) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  // Manila is UTC+8 with no daylight saving, so subtract 8 hours to get UTC
  const shiftUtc = Date.UTC(+d[1], +d[2] - 1, +d[3], h - 8, parseInt(m[2], 10));
  return (shiftUtc - Date.now()) / 36e5;
};

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, team, shift, type, date, time, reason } = body;

  if (!name || !team || !shift || !type || !date) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (!process.env.TEAMS_FLOW_URL) {
    return Response.json({ error: "TEAMS_FLOW_URL not set" }, { status: 500 });
  }

  const hrs = hoursUntilShiftManila(date, shift);
  const lateNotice = type === "Absent" && hrs !== null && hrs < 4;

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
    return Response.json({ ok: true, lateNotice });
  } catch (e) {
    return Response.json({ error: "Failed to reach webhook" }, { status: 500 });
  }
}
