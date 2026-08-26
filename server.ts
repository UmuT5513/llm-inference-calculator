import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { runMigrations } from "./src/server/db";
import { seedModelCatalog } from "./src/server/modelCatalogSeed";
import { adminAuthRouter } from "./src/server/adminAuth";
import { gpuPricesRouter } from "./src/server/gpuPrices";
import { hfModelsRouter } from "./src/server/hfModels";
import { pickLang, msg } from "./src/server/i18nErrors";

dotenv.config();

const app = express();
app.set("trust proxy", true);
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// API Routes
app.use("/api/admin", adminAuthRouter);
app.use("/api/gpu-prices", gpuPricesRouter);
app.use("/api/models", hfModelsRouter);

// Initialize Gemini AI Client lazy on server side
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Model Catalog summary for AI Recommendation
const MODEL_CATALOG_SUMMARY = `
- 'deepseek-r1-v3' (DeepSeek R1 671B MoE, 37B active, state-of-the-art chain-of-thought thinking & reasoning, math, research)
- 'deepseek-v3' (DeepSeek V3 671B MoE, general high-speed MoE, coding & knowledge)
- 'deepseek-r1-distill-qwen-32b' (DeepSeek R1 Distill Qwen 32B, reasoning/thinking on single/dual GPU)
- 'deepseek-r1-distill-llama-70b' (DeepSeek R1 Distill Llama 70B, high reasoning quality)
- 'deepseek-coder-v2-236b' (DeepSeek Coder V2 236B MoE, 338 programming languages, 128k context)
- 'llama-3.3-70b' (Meta Llama 3.3 70B, 128k context, high general knowledge, multilingual, enterprise)
- 'llama-3.1-8b' (Meta Llama 3.1 8B, 128k context, fast, edge/local, lightweight)
- 'llama-3.1-405b' (Meta Llama 3.1 405B, frontier open weights, massive capability)
- 'llama-3.2-90b-vision' / 'llama-3.2-11b-vision' (Meta Llama 3.2 Vision, multimodal OCR & chart analysis)
- 'meta-muse-spark-70b' (Meta Muse Spark 70B, frontier agentic orchestration & planning)
- 'qwq-32b' (Qwen QwQ 32B, step-by-step reasoning, math and complex logic)
- 'qwen-2.5-coder-32b' (Qwen 2.5 Coder 32B, 128k context, top agentic coding, repository analysis, tool use)
- 'qwen-2.5-coder-7b' (Qwen 2.5 Coder 7B, lightweight fast local coding)
- 'qwen-2.5-72b' (Qwen 2.5 72B, 128k context, versatile multilingual)
- 'qwen-2.5-vl-72b' (Qwen 2.5 VL 72B, dynamic resolution vision-language)
- 'qwen-3.5-72b' (Qwen 3.5 72B, 128k context, strong multilingual, deep reasoning, dense)
- 'qwen-3.5-32b' (Qwen 3.5 32B, 128k context, balanced high-performance workstation)
- 'qwen-3.6-moe-preview' (Qwen 3.6 MoE 256B, 256k context, massive long-context RAG & multi-turn)
- 'gemma-3-27b' (Google Gemma 3 27B, 128k context, multimodal, sliding-window attention)
- 'gemma-3-12b' (Google Gemma 3 12B, fast multi-turn, edge multimodal)
- 'gemma-3-4b' (Google Gemma 3 4B, on-device multimodal)
- 'gemma-2-27b' (Google Gemma 2 27B, high quality dense reasoning, low VRAM footprint)
- 'gemma-2-9b' (Google Gemma 2 9B, strong 9B dense model)
- 'paligemma-2-28b' / 'paligemma-2-10b' (Google PaliGemma 2, visual QA, OCR, document understanding)
- 'mistral-large-2' (Mistral Large 2 123B, 128k context, 80+ languages, enterprise reasoning)
- 'mistral-small-3-24b' (Mistral Small 3 24B, 128k context, fast 24GB GPU, rivals 70B models)
- 'pixtral-large-124b' / 'pixtral-12b' (Pixtral Multimodal Vision models)
- 'codestral-22b' (Codestral 22B, 256k context, 80+ programming languages, fast FIM completion)
- 'ministral-8b' (Ministral 8B, edge powerhouse with 128k context)
- 'phi-4-14b' (Microsoft Phi-4 14B, math, logic reasoning, compact dense power)
- 'phi-4-mini-3.8b' (Microsoft Phi-4 Mini 3.8B, 128k context multilingual)
- 'nvidia-llama-3.1-nemotron-70b' (NVIDIA Nemotron 70B Instruct, aligned for top benchmark accuracy)
- 'nvidia-nvlm-d-72b' (NVIDIA NVLM 72B Multimodal Vision leader)
- 'command-r-plus' (Cohere Command R+ 104B, 128k context, state-of-the-art RAG citation and tool use)
- 'exaone-3.5-32b-instruct' (LG EXAONE 3.5 32B, high performance bilingual reasoning)
- 'trendyol-llm-8b-chat' (Trendyol LLM 8B Chat, fine-tuned on Turkish corpus, customer support, localized NLP)
- 'bilgem-bilge-70b' / 'bilgem-bilge-14b' (TÜBİTAK BİLGEM Ulusal Türkçe LLM)
- 'vngrs-turkish-llama-8b' (VNGRS Turkish LLaMA 8B Instruct)
`;

// Heuristic fallback for model recommendation when Gemini API key is not present
function getHeuristicRecommendation(useCase: string) {
  const query = (useCase || "").toLowerCase();

  // 1. Health / Medical / Epicrisis / Long context RAG
  if (
    query.includes("sağlık") ||
    query.includes("hastane") ||
    query.includes("epikriz") ||
    query.includes("tıp") ||
    query.includes("doktor") ||
    query.includes("medikal") ||
    query.includes("hasta") ||
    query.includes("klinik") ||
    query.includes("health") ||
    query.includes("medical")
  ) {
    return {
      recommendedModelId: "qwen-3.5-72b",
      modelName: "Qwen 3.5 72B",
      reason:
        "Sağlık verileri, hasta epikrizleri ve uzun medikal raporların analizi için 128k bağlam penceresi ve yüksek RAG sadakati kritik önem taşır. Qwen 3.5 72B, karmaşık klinik terminolojiyi koruyarak halüsinasyonsuz analiz sağlar.",
      keyHighlight: "128k Uzun Bağlam & Yüksek Klinik / RAG Sadakati",
      domainMatch: "Sağlık & Medikal Rapor Analizi",
      recommendedContextLen: 32768,
      alternativeModelIds: ["llama-3.3-70b", "command-r-plus"],
    };
  }

  // 2. Coding / Programming / Software / Agentic
  if (
    query.includes("kod") ||
    query.includes("yazılım") ||
    query.includes("program") ||
    query.includes("agent") ||
    query.includes("geliştirici") ||
    query.includes("developer") ||
    query.includes("code") ||
    query.includes("python") ||
    query.includes("javascript") ||
    query.includes("refactor") ||
    query.includes("bug")
  ) {
    return {
      recommendedModelId: "qwen-2.5-coder-32b",
      modelName: "Qwen 2.5 Coder 32B",
      reason:
        "Yazılım geliştirme, repository analizi ve çok adımlı agentic kod üretiminde 128k bağlamı ve özel kod mimarisi ile açık kaynak dünyasının lider kodlama modelidir.",
      keyHighlight: "128k Kod Deposu Analizi & Güçlü Agentic Tool Use",
      domainMatch: "Yazılım Geliştirme & Agentic Kodlama",
      recommendedContextLen: 16384,
      alternativeModelIds: ["deepseek-r1-distill-qwen-32b", "codestral-22b"],
    };
  }

  // 3. Reasoning / Thinking / Math / Complex Logic
  if (
    query.includes("think") ||
    query.includes("düşün") ||
    query.includes("mantık") ||
    query.includes("matematik") ||
    query.includes("problem") ||
    query.includes("muhakeme") ||
    query.includes("reasoning") ||
    query.includes("kanıt") ||
    query.includes("algoritma")
  ) {
    return {
      recommendedModelId: "deepseek-r1-v3",
      modelName: "DeepSeek R1 (671B MoE)",
      reason:
        "Derin düşünme (thinking process), adım adım matematiksel kanıtlama ve karmaşık mantıksal çıkarımlar için DeepSeek R1 MoE açık kaynak dünyasının en güçlü reasoning modelidir.",
      keyHighlight: "Adım Adım Chain-of-Thought & İleri Düzey Matematiksel Muhakeme",
      domainMatch: "Derin Düşünme (Reasoning) & Matematik",
      recommendedContextLen: 16384,
      alternativeModelIds: ["deepseek-r1-distill-qwen-32b", "phi-4-14b"],
    };
  }

  // 4. Turkish Language & Localized Corporate Chatbot
  if (
    query.includes("türkçe") ||
    query.includes("müşteri") ||
    query.includes("çağrı") ||
    query.includes("destek") ||
    query.includes("yerel dil") ||
    query.includes("turkish")
  ) {
    return {
      recommendedModelId: "trendyol-llm-8b-chat",
      modelName: "Trendyol LLM 8B Chat",
      reason:
        "Türkçe dil bilgisi, yerel kültür, müşteri hizmetleri ve çağrı merkezi diyalogları için özel Türkçe veri setiyle eğitilmiş en optimize hafif modeldir.",
      keyHighlight: "Özel Türkçe Dil Korpusu & Hızlı Çağrı Merkezi Yanıt Süresi",
      domainMatch: "Türkçe Müşteri Hizmetleri & Chatbot",
      recommendedContextLen: 8192,
      alternativeModelIds: ["vngrs-hzr-13b", "llama-3.3-70b"],
    };
  }

  // 5. Law / Finance / Huge Document RAG
  if (
    query.includes("hukuk") ||
    query.includes("avukat") ||
    query.includes("mevzuat") ||
    query.includes("finans") ||
    query.includes("banka") ||
    query.includes("sözleşme") ||
    query.includes("rapor") ||
    query.includes("muhasebe") ||
    query.includes("rag") ||
    query.includes("doküman") ||
    query.includes("legal") ||
    query.includes("law") ||
    query.includes("contract") ||
    query.includes("finance") ||
    query.includes("compliance") ||
    query.includes("document") ||
    query.includes("report")
  ) {
    return {
      recommendedModelId: "llama-3.3-70b",
      modelName: "Meta Llama 3.3 70B",
      reason:
        "Hukuki metinler, mali tablolar ve yüzlerce sayfalık sözleşmelerin analizi için 128k bağlam penceresi ve kurumsal seviyede yüksek doğruluk sunar.",
      keyHighlight: "128k Kurumsal Bağlam & Yüksek Hukuk/Finans Doğruluğu",
      domainMatch: "Hukuk, Finans & Büyük Doküman Analizi",
      recommendedContextLen: 32768,
      alternativeModelIds: ["command-r-plus", "qwen-3.5-72b"],
    };
  }

  // 6. Local / Budget / Fast / Edge PC / Low VRAM
  if (
    query.includes("yerel") ||
    query.includes("bütçe") ||
    query.includes("ucuz") ||
    query.includes("hızlı") ||
    query.includes("laptop") ||
    query.includes("mac") ||
    query.includes("pc") ||
    query.includes("edge") ||
    query.includes("düşük vram") ||
    query.includes("local") ||
    query.includes("budget") ||
    query.includes("cheap") ||
    query.includes("fast") ||
    query.includes("desktop") ||
    query.includes("gaming") ||
    query.includes("vram") ||
    query.includes("consumer")
  ) {
    return {
      recommendedModelId: "llama-3.1-8b",
      modelName: "Meta Llama 3.1 8B",
      reason:
        "Tek bir tüketici GPU'su (RTX 4060/3060) veya Apple Mac üzerinde minimum VRAM harcayarak saniyede 60+ token hızında yerel çalıştırılabilir.",
      keyHighlight: "Düşük VRAM Tüketimi & Yüksek Çıkarım Hızı",
      domainMatch: "Yerel PC / Mac & Düşük Bütçeli Çıkarım",
      recommendedContextLen: 8192,
      alternativeModelIds: ["gemma-3-12b", "qwen-3.5-7b"],
    };
  }

  // Default balanced recommendation
  return {
    recommendedModelId: "llama-3.3-70b",
    modelName: "Meta Llama 3.3 70B",
    reason:
      "Geniş 128k bağlam penceresi, güçlü çok dilli muhakeme yeteneği ve optimize edilmiş Grouped-Query Attention mimarisi ile genel kurumsal ve araştırma kullanımına en uygun dengeli modeldir.",
    keyHighlight: "128k Context & Çok Yönlü Kurumsal Performans",
    domainMatch: "Genel Kurumsal & Çok Amaçlı Yapay Zeka",
    recommendedContextLen: 8192,
    alternativeModelIds: ["qwen-3.5-72b", "deepseek-v3"],
  };
}

// AI Model Recommender API Endpoint
app.post("/api/recommend-model", async (req, res) => {
  const { useCase } = req.body;
  if (!useCase || typeof useCase !== "string" || useCase.trim().length === 0) {
    return res.status(400).json({ error: msg(pickLang(req), "Lütfen bir kullanım senaryosu veya sektör belirtin.", "Please provide a use case or industry.") });
  }

  try {
    const ai = getGenAI();
    if (!ai) {
      // Return high-quality heuristic recommendation if no API key
      const fallback = getHeuristicRecommendation(useCase);
      return res.json({ ...fallback, source: "heuristic" });
    }

    const prompt = `Kullanıcı LLM donanım/VRAM hesaplama aracı için bir LLM modeli seçmek istiyor.
Kullanıcının belirttiği kullanım amacı/sektör:
"${useCase}"

Mevcut Model Kataloğu:
${MODEL_CATALOG_SUMMARY}

GÖREVİN:
Kullanıcının sektör ve ihtiyaçlarını (Örn: Sağlık verileri için 128k+ uzun context & yüksek RAG sadakati; Yazılım için agentic kabiliyetler ve tool use; Mantık/Matematik için reasoning ve thinking process; Türkçe için yerel korpus; Düşük bütçe için hafif 8B modeller vb.) analiz et ve EN UYGUN tek bir 'recommendedModelId' seç.

Aşağıdaki JSON formatında YALNIZCA geçerli bir JSON objesi döndür (Markdown backticks olmadan veya standart JSON formatında):
{
  "recommendedModelId": "llama-3.3-70b",
  "modelName": "Meta Llama 3.3 70B",
  "reason": "Türkçe ve 1-2 cümleyle neden bu modelin seçildiğini (context length, agentic, thinking, donanım uyumu vb.) açıkla.",
  "keyHighlight": "Öne çıkan 1 temel özellik (Örn: 128k Uzun Bağlam & Yüksek Klinik RAG Sadakati)",
  "domainMatch": "Eşleşen Alan (Örn: Sağlık & Medikal Analiz)",
  "recommendedContextLen": 16384,
  "alternativeModelIds": ["qwen-3.5-72b", "deepseek-r1-distill-qwen-32b"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an AI Model Selection Specialist. Analyze user requirements and return structured JSON with the best matching model ID from the provided catalog.",
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    });

    let parsedResult;
    try {
      parsedResult = JSON.parse(response.text || "{}");
    } catch {
      const jsonMatch = response.text?.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      }
    }

    if (parsedResult && parsedResult.recommendedModelId) {
      return res.json({ ...parsedResult, source: "gemini" });
    }

    // Fallback if parsing failed
    const fallback = getHeuristicRecommendation(useCase);
    return res.json({ ...fallback, source: "heuristic" });
  } catch (err: any) {
    console.warn("Gemini Model Recommender error, falling back to heuristic:", err?.message);
    const fallback = getHeuristicRecommendation(useCase);
    return res.json({ ...fallback, source: "heuristic" });
  }
});

// AI Advisor API Endpoint
app.post("/api/advisor", async (req, res) => {
  try {
    const ai = getGenAI();
    if (!ai) {
      return res.status(503).json({
        error: msg(pickLang(req), "Gemini API anahtarı yapılandırılmamış. AI danışman özelliği sunucu ortamında GEMINI_API_KEY gerektirir.", "Gemini API key is not configured. AI advisor feature requires GEMINI_API_KEY in server environment."),
      });
    }

    const { modelName, quantization, gpus, totalVramNeeded, promptLen, genLen, concurrentUsers, targetTtft, targetTpot, estimatedCostPerHour } = req.body;

    const adviceLang = req.body?.lang === 'en' ? 'English' : 'Turkish';

    const prompt = `You are a Principal AI Infrastructure Engineer and LLM Inference Specialist.
Analyze the following deployment configuration and provide detailed optimization recommendations, engine parameters, and architecture advice.

Current Deployment Configuration:
- LLM Model: ${modelName || "Custom Model"}
- Quantization Precision: ${quantization}
- GPUs Allocated: ${gpus?.count}x ${gpus?.name} (${gpus?.vramGB}GB VRAM per GPU)
- Total Calculated VRAM Needed: ${totalVramNeeded} GB
- Context Window: ${promptLen} prompt tokens + ${genLen} output tokens
- Concurrency: ${concurrentUsers} concurrent users/streams
- Hourly Hardware Cost: $${estimatedCostPerHour?.toFixed(2)}/hr

Provide a structured analysis in ${adviceLang} (or bilingual terms) covering:
1. **Feasibility & Bottleneck Analysis**: Is the GPU memory & bandwidth sufficient? What is the main bottleneck (Compute/Prefill bound vs Bandwidth/Decode bound)?
2. **Recommended Engine & Framework**: Detailed setup for vLLM, TensorRT-LLM, SGLang, or Ollama/llama.cpp. Give recommended flags (e.g. --tensor-parallel-size, --gpu-memory-utilization, --max-model-len, --kv-cache-dtype).
3. **Cost & Performance Optimization**: How to lower cost per 1M tokens or reduce latency (e.g. FP8/INT4 KV cache, speculative decoding, prefix caching, chunked prefill).
4. **Production Readiness Rating**: Rating out of 10 with brief risk flags (OOM risk, TTFT spike under load, etc.).

Keep response clear, structured in clean Markdown with headings, callout boxes, and actionable CLI/Python config snippets.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert AI Systems Architect specializing in LLM inference engines (vLLM, TensorRT-LLM, TGI, SGLang, llama.cpp, DeepSeek MLA optimization).",
        temperature: 0.4,
      },
    });

    res.json({ advice: response.text });
  } catch (err: any) {
    console.error("AI Advisor error:", err);
    res.status(500).json({ error: err?.message || msg(pickLang(req), "AI danışmanlığı üretilemedi.", "Failed to generate AI advice.") });
  }
});

async function startServer() {
  try {
    await runMigrations();
    await seedModelCatalog();
  } catch (err: any) {
    console.error("PostgreSQL migration failed. Check DATABASE_URL and that PostgreSQL is running:", err?.message);
  }

  app.get("/", (_req, res) => {
    res.redirect(302, "/app");
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
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
