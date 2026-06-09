// api/notion-tasks.js
// Vercel serverless function — proxies to Supabase edge function
// Replaces Lovable's automatic /api/ → Supabase proxy

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    return res.status(200).end();
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    return res.status(500).json({ error: "SUPABASE_URL not configured" });
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/notion-tasks`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("notion-tasks error:", err);
    return res.status(500).json({ error: "Failed to fetch tasks from Supabase" });
  }
}
