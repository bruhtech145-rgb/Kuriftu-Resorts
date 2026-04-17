import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { spawn } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/segment-customers", (req, res) => {
    const pythonScript = path.join(process.cwd(), "ai-models", "customer-segmentation.py");
    // use .venv python
    const pythonBinary = path.join(process.cwd(), ".venv", "bin", "python3");
    const pythonProcess = spawn(pythonBinary, [pythonScript]);

    let outputData = "";
    let errorData = "";

    pythonProcess.stdout.on("data", (data) => {
      outputData += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      errorData += data.toString();
      console.error(`Python stderr: ${data}`);
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        return res.status(500).json({ error: errorData || "Python process failed with code " + code });
      }
      try {
        const result = JSON.parse(outputData);
        res.json(result);
      } catch (e) {
        console.error("Failed to parse Python output:", outputData);
        res.status(500).json({ error: "Failed to parse Python output", output: outputData });
      }
    });

    pythonProcess.stdin.write(JSON.stringify(req.body));
    pythonProcess.stdin.end();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
