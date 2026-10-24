let extractorPromise = null;

async function getExtractor() {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      console.log("[embed] Loading @xenova/transformers");
      const { pipeline } = await import("@xenova/transformers");
      let lastProgressLog = 0;
      console.log("[embed] Loading model Xenova/paraphrase-multilingual-MiniLM-L12-v2");
      const extractor = await pipeline(
        "feature-extraction",
        "Xenova/paraphrase-multilingual-MiniLM-L12-v2",
        {
          quantized: true,
          cache_dir: "/root/.cache/transformers",
          progress_callback: (progress) => {
            const file = progress.file || "model";
            if (progress.status === "progress") {
              const now = Date.now();
              if (now - lastProgressLog >= 5000) {
                const percent = Number.isFinite(progress.progress)
                  ? ` ${progress.progress.toFixed(1)}%`
                  : "";
                console.log(`[embed] Downloading ${file}${percent}`);
                lastProgressLog = now;
              }
            } else if (progress.status === "initiate") {
              console.log(`[embed] Downloading ${file}`);
            } else if (progress.status === "done") {
              console.log(`[embed] Loaded ${file}`);
            }
          },
        }
      );
      console.log("[embed] Model ready");
      return extractor;
    })().catch((error) => {
      extractorPromise = null;
      throw error;
    });
  }
  return extractorPromise;
}

async function init() {
  await getExtractor();
}

async function embed(text) {
  const ext = await getExtractor();
  const output = await ext(text || "", { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

module.exports = { embed, init };
