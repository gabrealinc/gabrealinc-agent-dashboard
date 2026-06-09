// api/resolve-email-flag.js
// Vercel serverless function — proxies to Supabase edge function
// Accepts POST { emailId } to mark an email flag as resolved

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
    const response = await fetch(`${supabaseUrl}/functions/v1/resolve-email-flag`, {
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
    console.error("resolve-email-flag error:", err);
    return res.status(500).json({ error: "Failed to resolve flag in Supabase" });
  }
}
