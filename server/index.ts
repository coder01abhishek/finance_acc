import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

(async () => {
  // Register API routes first
  await registerRoutes(httpServer, app);

  // Global error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    res.status(status).json({ message: err.message || "Internal Server Error" });
  });

  if (process.env.NODE_ENV === "production") {
    // Correct path resolution for Vercel's deployment structure
    const publicPath = path.resolve(__dirname, "../dist");
    app.use(express.static(publicPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(publicPath, "index.html"));
    });
  }

  // Only listen locally; Vercel handles the port in production
  if (process.env.NODE_ENV !== "production") {
    const port = 3001;
    httpServer.listen(port, "0.0.0.0", () => {
      console.log(`Serving on port ${port}`);
    });
  }
})();

export default app; // Critical for the api/index.ts bridge