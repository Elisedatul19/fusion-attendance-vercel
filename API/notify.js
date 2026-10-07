export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  let payload;

  try {
    payload = await request.json();
  } catch (error) {
    return response.status(400).json({
      error: "Invalid JSON body",
      details: error.message
    });
  }

  const {
    name,
    team,
    shift,
    type,
    date,
    time,
    reason,
    submittedAt
  } = payload;

  const teamsWebhook = process.env.TEAMS_WEBHOOK_URL;

  if (!teamsWebhook) {
    return response.status(500).json({
      error: "TEAMS_WEBHOOK_URL is not configured"
    });
  }

  const teamsMessage = {
    "@type": "MessageCard",
    "@context": "http://schema.org/extensions",
    summary: `Attendance notification for ${name}`,
    themeColor: "7C3AED",
    title: "Attendance Notice Submitted",
    text: [
      `Employee: ${name}`,
      `Team: ${team}`,
      `Status: ${type}`,
      `Shift: ${shift}`,
      `Date: ${date}`,
      `Expected Time: ${time || "Not provided"}`,
      `Reason: ${reason || "No notes"}`,
      `Submitted: ${submittedAt}`
    ].join("\n")
  };

  try {
    const result = await fetch(teamsWebhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(teamsMessage)
    });

    const text = await result.text();

    if (!result.ok) {
      return response.status(400).json({
        error: "Teams rejected the webhook request",
        details: text
      });
    }

    return response.status(200).json({
      success: true,
      message: "Notification Sent to Teams"
    });

  } catch (error) {
    return response.status(500).json({
      success: false,
      error: "Failed to send Teams notification",
      details: error.message
    });
  }
}
