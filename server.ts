import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;
app.use(express.json());

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

let supabase: any = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// Health check
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    supabaseConfigured: !!supabase,
    env: process.env.NODE_ENV
  });
});

// GET Leaderboard
app.get("/api/leaderboard", async (req, res) => {
  try {
    if (!supabase) return res.json([]);
    
    const { data, error } = await supabase
      .from("leaderboard")
      .select("*")
      .order("time", { ascending: true })
      .limit(10);

    if (error) {
      if (error.code === 'PGRST116' || error.message?.includes('relation "leaderboard" does not exist')) {
        return res.json([]);
      }
      throw error;
    }
    res.json(data || []);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST Leaderboard
app.post("/api/leaderboard", async (req, res) => {
  const { name, time, difficulty, date } = req.body;
  if (!name || !time) return res.status(400).json({ error: "Missing data" });

  try {
    if (!supabase) return res.status(503).json({ error: "Supabase not configured" });
    
    const { error } = await supabase
      .from("leaderboard")
      .insert([{ name, time, difficulty, date }]);

    if (error) throw error;
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production") {
  createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  }).then((vite) => {
    app.use(vite.middlewares);
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  });
} else {
  const distPath = path.join(process.cwd(), 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

export default app;
