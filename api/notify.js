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

  const powerAutomateWebhook = process.env.TEAMS_WEBHOOK_URL;

  if (!powerAutomateWebhook) {
    return response.status(500).json({
      error: "TEAMS_WEBHOOK_URL is not configured"
    });
  }

  const powerAutomateMessage = {
    name,
    team,
    shift,
    type,
    date,
    time: time || "Not provided",
    reason: reason || "No notes",
    submittedAt
  };

  try {
    const result = await fetch(powerAutomateWebhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(powerAutomateMessage)
    });

    const text = await result.text();

    if (!result.ok) {
      return response.status(result.status).json({
        error: "Power Automate rejected the webhook request",
        details: text,
        status: result.status
      });
    }

    return response.status(200).json({
      success: true,
      message: "Notification Sent to Power Automate"
    });

  } catch (error) {
    return response.status(500).json({
      success: false,
      error: "Failed to send to Power Automate",
      details: error.message
    });
  }
}
