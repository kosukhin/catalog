let extractor = null;

async function getExtractor() {
  if (!extractor) {
    const { pipeline } = await import("@xenova/transformers");
    extractor = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2");
  }
  return extractor;
}

async function embed(text) {
  const ext = await getExtractor();
  const output = await ext(text || "", { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

module.exports = { embed };
