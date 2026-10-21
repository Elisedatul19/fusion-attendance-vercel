const ONSITE = "Unable to report onsite";

const hoursUntilShiftManila = (dateStr, shiftStr) => {
  const m = String(shiftStr || "").match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  const d = String(dateStr || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m || !d) return null;
  let h = parseInt(m[1], 10) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  const shiftUtc = Date.UTC(+d[1], +d[2] - 1, +d[3], h - 8, parseInt(m[2], 10));
  return (shiftUtc - Date.now()) / 36e5;
};

const parseD = s => {
  const m = String(s || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
};
const pad = n => String(n).padStart(2, "0");
const fmtD = dt => dt.getUTCFullYear() + "-" + pad(dt.getUTCMonth() + 1) + "-" + pad(dt.getUTCDate());
const isWeekday = dt => { const w = dt.getUTCDay(); return w >= 1 && w <= 5; };
const offsetRange = dt => {
  const mon = new Date(dt); mon.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
  const fri = new Date(mon); fri.setUTCDate(mon.getUTCDate() + 11);
  return [fmtD(mon), fmtD(fri)];
};

const emailFor = name => {
  try {
    const map = JSON.parse(process.env.AGENT_EMAILS || "{}");
    return map[name] || "";
  } catch (e) {
    return "";
  }
};

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, team, shift, type, date, time, reason, offsetDate } = body;

  if (!name || !team || !shift || !type || !date) {
    return Response.json({ error: "Missing required fields" }, { status: 400 });
  }

  const isOnsite = type === ONSITE;
  if (isOnsite) {
    const missed = parseD(date);
    const offset = parseD(offsetDate);
    if (!missed || !isWeekday(missed)) {
      return Response.json({ error: "Onsite date must be a weekday" }, { status: 400 });
    }
    if (!offset) {
      return Response.json({ error: "Onsite offset date is required" }, { status: 400 });
    }
    const [min, max] = offsetRange(missed);
    if (offsetDate < min || offsetDate > max || !isWeekday(offset) || offsetDate === date) {
      return Response.json({ error: "Offset date must be a weekday in the same week or the following week" }, { status: 400 });
    }
  }

  if (!process.env.TEAMS_FLOW_URL) {
    return Response.json({ error: "TEAMS_FLOW_URL not set" }, { status: 500 });
  }

  const hrs = hoursUntilShiftManila(date, shift);
  const lateNotice = (type === "Absent" || type === "Half Day") && hrs !== null && hrs < 4;

  const facts = [
    { title: "Name", value: name },
    { title: "Team", value: team },
    { title: "Shift start", value: shift },
    { title: "Status", value: type },
    { title: "Date", value: date },
    { title: "Expected time", value: time || "N/A" },
    { title: "Reason", value: reason || "N/A" },
    { title: "Notice", value: lateNotice ? "⚠ Late notice (under 4 hours before shift)" : (isOnsite ? "N/A" : "On time") },
  ];
  if (isOnsite) facts.push({ title: "Onsite offset date", value: offsetDate });

  const cardBody = [
    { type: "TextBlock", text: "Attendance Notice", weight: "Bolder", size: "Large" },
    { type: "FactSet", facts },
  ];
  const email = emailFor(name);
  if (email) cardBody.push({ type: "TextBlock", text: email, isVisible: false });

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
          body: cardBody,
          actions: [
            { type: "Action.Submit", title: isOnsite ? "Plotted" : "Confirmed", data: { action: "confirm" } },
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
