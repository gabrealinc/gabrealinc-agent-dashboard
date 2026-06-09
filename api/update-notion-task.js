// api/update-notion-task.js
// Vercel serverless function — proxies to Supabase edge function
// Accepts POST { taskId, status } and updates the task in Notion

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Headers", "content-type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    return res.status(500).json({ error: "SUPABASE_URL not configured" });
  }

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/update-notion-task`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseAnonKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(response.status).json(data);
  } catch (err) {
    console.error("update-notion-task error:", err);
    return res.status(500).json({ error: "Failed to update task in Supabase" });
  }
}
