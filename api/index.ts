import express from "express";
import path from "path";
import { createClient } from "@supabase/supabase-js";

console.log(">>> SERVER STARTING...");

const app = express();
const PORT = 3000;

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

console.log(">>> SUPABASE_URL:", supabaseUrl ? "Present" : "MISSING");
console.log(">>> SUPABASE_ANON_KEY:", supabaseAnonKey ? "Present" : "MISSING");

let supabase: any = null;
try {
  if (supabaseUrl && supabaseUrl.startsWith("http")) {
    supabase = createClient(supabaseUrl, supabaseAnonKey || "");
    console.log(">>> Supabase client initialized.");
  } else {
    console.warn(">>> Supabase URL is invalid or missing. Leaderboard will be disabled.");
  }
} catch (e) {
  console.error(">>> Failed to initialize Supabase client:", e);
}

app.use(express.json());

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    supabaseConfigured: !!supabase,
    env: process.env.NODE_ENV,
    isVercel: !!process.env.VERCEL
  });
});

// GET Leaderboard
app.get("/api/leaderboard", async (req, res) => {
  try {
    if (!supabase) {
      console.log(">>> Leaderboard requested but Supabase not configured.");
      return res.json([]);
    }
    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .order("time", { ascending: true })
      .limit(10);

    if (error) {
      console.error(">>> Supabase error fetching leaderboard:", error);
      if (error.code === 'PGRST116' || error.message?.includes('relation "leaderboard" does not exist')) {
        return res.json([]);
      }
      throw error;
    }
    res.json(data || []);
  } catch (error: any) {
    console.error(">>> Leaderboard fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

// POST Leaderboard
app.post("/api/leaderboard", async (req, res) => {
  const { name, time, difficulty, date } = req.body;
  if (!name || !time) return res.status(400).json({ error: "Missing data" });

  try {
    if (!supabase) {
      return res.status(503).json({ error: "Supabase not configured" });
    }
    const { data, error } = await supabase
      .from("leaderboard")
      .insert([{ name, time, difficulty, date }]);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    console.error(">>> Leaderboard save error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Development vs Production handling
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const { createServer: createViteServer } = await import("vite");
  async function startDevServer() {
    try {
      console.log(">>> Starting Vite in development mode...");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      
      app.use(vite.middlewares);
      
      app.listen(PORT, "0.0.0.0", () => {
        console.log(`>>> Dev server listening on http://localhost:${PORT}`);
      });
    } catch (err) {
      console.error(">>> CRITICAL DEV SERVER ERROR:", err);
    }
  }
  startDevServer();
} else {
  // In production (Vercel), serve static files from 'dist'
  const distPath = path.join(process.cwd(), "dist");
  app.use(express.static(distPath));
  
  // For any other route, serve index.html (SPA fallback)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    // In Vercel, static files are handled by rewrites, but this is a fallback
    try {
      res.sendFile(path.join(distPath, "index.html"));
    } catch (e) {
      next();
    }
  });
  
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`>>> Production server listening on port ${PORT}`);
    });
  }
}

// Export the app for Vercel
export default app;
