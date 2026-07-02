export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { system, user } = req.body || {};
  if (!user) {
    return res.status(400).json({ error: "Missing 'user' prompt" });
  }
  try {
    const combinedPrompt = (system ? system + "\n\n" : "") + user;
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: combinedPrompt }] }],
          generationConfig: { maxOutputTokens: 1000 },
        }),
      }
    );
    const data = await r.json();
    if (!r.ok) {
      return res.status(200).json({ text: "", debug: JSON.stringify(data).slice(0, 500) });
    }
    const text =
      (data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts.map((p) => p.text || "").join("")) ||
      "";
    res.status(200).json({ text, debug: text ? undefined : JSON.stringify(data).slice(0, 500) });
  } catch (e) {
    res.status(200).json({ text: "", debug: "EXCEPTION: " + String(e && e.message || e) });
  }
}
