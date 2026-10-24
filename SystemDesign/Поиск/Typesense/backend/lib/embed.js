// Simple deterministic hashing-based embedding (bag-of-words).
// Production: replace with a real embedding model (OpenAI/Cohere/local transformers).
const DIM = 64;

function hashToken(token) {
  let h = 0;
  for (let i = 0; i < token.length; i++) {
    h = (h * 31 + token.charCodeAt(i)) >>> 0;
  }
  return h % DIM;
}

function embed(text) {
  const vec = new Array(DIM).fill(0);
  const tokens = String(text || "")
    .toLowerCase()
    .replace(/[^a-zа-я0-9\s]/gi, " ")
    .split(/\s+/)
    .filter(Boolean);
  for (const t of tokens) {
    vec[hashToken(t)] += 1;
  }
  // L2 normalize
  let norm = 0;
  for (const v of vec) norm += v * v;
  norm = Math.sqrt(norm) || 1;
  return vec.map((v) => v / norm);
}

module.exports = { embed, DIM };
