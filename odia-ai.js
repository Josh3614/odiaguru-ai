// This runs on the SERVER (Vercel), never in the user's browser.
// The real Anthropic API key lives only here, as an environment variable.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { system, user } = req.body || {};
  if (!user) {
    return res.status(400).json({ error: "Missing 'user' prompt" });
  }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: system || "",
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = await r.json();
    const text = (data.content || [])
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");
    res.status(200).json({ text });
  } catch (e) {
    res.status(500).json({ error: "AI request failed" });
  }
}
