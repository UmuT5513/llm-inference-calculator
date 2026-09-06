import express from "express";
import path from "path";
import fs from "fs/promises";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { runMigrations } from "./src/server/db";
import { seedModelCatalog } from "./src/server/modelCatalogSeed";
import { adminAuthRouter } from "./src/server/adminAuth";
import { gpuPricesRouter } from "./src/server/gpuPrices";
import { hfModelsRouter } from "./src/server/hfModels";
import { renderLandingPage, pickLandingLang, countVisibleModels } from "./src/server/landing";
import { buildLandingCardsHtml } from "./src/server/landingCards";
import { injectRouteMeta, appMeta, renderSitemapXml, renderRobotsTxt } from "./src/server/seo";

let viteServer: Awaited<ReturnType<typeof createViteServer>> | null = null;

dotenv.config();

const app = express();
app.set("trust proxy", true);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API Routes
app.use("/api/admin", adminAuthRouter);
app.use("/api/gpu-prices", gpuPricesRouter);
app.use("/api/models", hfModelsRouter);

async function readShell(): Promise<string> {
  const p =
    process.env.NODE_ENV === "production"
      ? path.join(process.cwd(), "dist", "index.html")
      : path.join(process.cwd(), "index.html");
  return fs.readFile(p, "utf8");
}

const DB_RETRY_MS = 10_000;
const DB_MAX_RETRIES = 6;

async function initDb(): Promise<void> {
  let attempt = 0;
  // Retry migrations/seed so the app self-heals when Postgres comes up
  // after the server (e.g. Docker `db` container still starting).
  for (;;) {
    try {
      await runMigrations();
      await seedModelCatalog();
      return;
    } catch (err: any) {
      attempt += 1;
      console.error(
        `PostgreSQL migration/seed failed (attempt ${attempt}/${DB_MAX_RETRIES}). Check DATABASE_URL and that PostgreSQL is running:`,
        err?.message
      );
      if (attempt >= DB_MAX_RETRIES) return;
      await new Promise((r) => setTimeout(r, DB_RETRY_MS));
    }
  }
}

async function startServer() {
  await initDb();

  const cardsHtml = buildLandingCardsHtml();
  const modelCount = await countVisibleModels();
  const shellHtml = await readShell().catch((err) => {
    console.warn("Shell index.html not found, serving without route meta:", err);
    return "";
  });

  app.get("/", (req, res) => {
    const qLang = String(req.query?.lang ?? "").toLowerCase();
    if (qLang === "tr" || qLang === "en") {
      res.cookie("llmcalc_lang", qLang, { maxAge: 31536000000 });
    }
    const lang = pickLandingLang(req);
    res.type("html").send(renderLandingPage(req, cardsHtml, modelCount));
  });

  app.get("/app", async (req, res) => {
    try {
      const lang = pickLandingLang(req);
      const meta = appMeta[lang];
      const html = injectRouteMeta(shellHtml || "<!doctype html><html><head><title></title><!--APP_META--></head><body><div id=\"root\"></div></body></html>", {
        lang,
        path: "/app",
        title: meta.title,
        description: meta.description,
        ogTitle: meta.title,
        ogDescription: meta.description,
      });
      if (viteServer) {
        res.type("html").send(await viteServer.transformIndexHtml(req.url, html));
      } else {
        res.type("html").send(html);
      }
    } catch (err) {
      console.error("[app] route meta injection failed:", err);
      res.status(500).send("Internal error");
    }
  });

  app.get("/sitemap.xml", (_req, res) => {
    res.type("application/xml").send(renderSitemapXml());
  });

  app.get("/robots.txt", (_req, res) => {
    res.type("text/plain").send(renderRobotsTxt());
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    viteServer = vite;
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`LLM Inference Calculator Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
