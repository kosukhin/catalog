# ES2026 — Array.fromAsync, Error.isError, Math.sumPrecise,
# Uint8Array to/from Base64, Iterator.concat, JSON.rawJSON,
# Map.getOrInsert (upsert).
# Node.js 26+ — рантайм с поддержкой фич ES2026.
FROM node:26-alpine

WORKDIR /app
COPY . .
CMD ["node", "--js-sum-precise", "index.js"]
