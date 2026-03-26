import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "leaderboard.json");

// Middleware for JSON parsing
app.use(express.json());

// Load leaderboard from file or initialize
const getLeaderboard = () => {
  if (fs.existsSync(DATA_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    } catch (e) {
      return [];
    }
  }
  return [];
};

const saveLeaderboard = (data: any) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// API: Get leaderboard
app.get("/api/leaderboard", (req, res) => {
  const leaderboard = getLeaderboard();
  res.json(leaderboard.sort((a: any, b: any) => a.time - b.time).slice(0, 10));
});

// API: Save score
app.post("/api/leaderboard", (req, res) => {
  const { name, time, difficulty, date } = req.body;
  if (!name || !time) return res.status(400).json({ error: "Missing data" });

  const leaderboard = getLeaderboard();
  leaderboard.push({ name, time, difficulty, date });
  saveLeaderboard(leaderboard);
  res.json({ success: true });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
