export default async function handler(request, response) {
  if (request.method !== "POST") {
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const payload = request.body;

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
      title: "🔔 Attendance Notice Submitted",
      sections: [{
        activityTitle: `${name} - ${type}`,
        facts: [
          { name: "Team:", value: team },
          { name: "Status:", value: type },
          { name: "Shift:", value: shift },
          { name: "Date:", value: date },
          { name: "Expected Time:", value: time || "Not provided" },
          { name: "Reason:", value: reason || "No notes" },
          { name: "Submitted:", value: submittedAt }
        ],
        markdown: true
      }]
    };

    const teamsResponse = await fetch(teamsWebhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(teamsMessage)
    });

    if (!teamsResponse.ok) {
      throw new Error(`Teams API returned ${teamsResponse.status}`);
    }

    return response.status(200).json({
      success: true,
      message: "Notification Sent to Teams"
    });

  } catch (error) {
    console.error("Error:", error.message);
    return response.status(500).json({
      success: false,
      error: error.message || "Failed to send Teams notification"
    });
  }
}
