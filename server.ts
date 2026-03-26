import express from "express";
import { createServer as createViteServer } from "vite";
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

app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    supabaseConfigured: !!supabase,
    env: process.env.NODE_ENV
  });
});

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

    if (error) throw error;
    res.json(data || []);
  } catch (error: any) {
    console.error(">>> Leaderboard fetch error:", error);
    res.status(500).json({ error: error.message });
  }
});

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

async function startServer() {
  try {
    console.log(">>> Opening port 3000...");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`>>> Server listening on port ${PORT}`);
    });

    console.log(">>> Starting Vite initialization...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    
    app.use(vite.middlewares);
    console.log(">>> Vite middleware attached. App ready.");
    
  } catch (err) {
    console.error(">>> CRITICAL SERVER ERROR:", err);
  }
}

startServer().catch(err => {
  console.error(">>> UNHANDLED PROMISE REJECTION:", err);
});
