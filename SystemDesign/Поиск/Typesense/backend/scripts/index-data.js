require("dotenv").config();
const fs = require("fs");
const path = require("path");
const Typesense = require("typesense");
const { embed, init } = require(path.join(__dirname, "..", "lib", "embed.js"));

const client = new Typesense.Client({
  nodes: [
    {
      host: process.env.TYPESENSE_HOST || "localhost",
      port: Number(process.env.TYPESENSE_PORT || 8108),
      protocol: process.env.TYPESENSE_PROTOCOL || "http",
    },
  ],
  apiKey: process.env.TYPESENSE_API_KEY || "xyz",
  connectionTimeoutSeconds: 5,
});

const COLLECTION = "school_events";
const BATCH_SIZE = 25;

const schema = {
  name: COLLECTION,
  fields: [
    { name: "id", type: "string" },
    { name: "title", type: "string" },
    { name: "description", type: "string" },
    { name: "category", type: "string", facet: true },
    { name: "location", type: "string" },
    { name: "date", type: "string", sort: true },
    { name: "age_group", type: "string", facet: true },
    { name: "embedding", type: "float[]", num_dim: 384 },
  ],
  default_sorting_field: "date",
};

const rawDocs = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "data", "events.json"), "utf8"));

async function main() {
  const start = Date.now();
  let stage = "starting";
  let embedded = 0;
  let imported = 0;
  const timer = setInterval(() => {
    const elapsed = Math.round((Date.now() - start) / 1000);
    console.log(`[index] ${stage}; embedded ${embedded}/${rawDocs.length}; imported ${imported}/${rawDocs.length}; elapsed ${elapsed}s`);
  }, 5000);

  try {
    console.log(`[index] Starting indexing of ${rawDocs.length} documents`);
    stage = "loading embedding model";
    await init();

    stage = "preparing collection";
    console.log(`[index] Preparing collection ${COLLECTION}`);
    try {
      await client.collections(COLLECTION).delete();
    } catch (e) {
      // Ignore if the collection does not exist.
    }
    await client.collections().create(schema);

    stage = "embedding and importing";
    for (let offset = 0; offset < rawDocs.length; offset += BATCH_SIZE) {
      const docs = [];
      const end = Math.min(offset + BATCH_SIZE, rawDocs.length);
      for (let i = offset; i < end; i++) {
        const d = rawDocs[i];
        docs.push({ ...d, embedding: await embed(`${d.title} ${d.description} ${d.category}`) });
        embedded++;
      }
      const results = await client.collections(COLLECTION).documents().import(docs, { action: "create" });
      const failed = results.filter((result) => !result.success);
      if (failed.length) {
        throw new Error(`Typesense import failed: ${JSON.stringify(failed.slice(0, 3))}`);
      }
      imported += docs.length;
      console.log(`[index] Imported ${imported}/${rawDocs.length}`);
    }
    stage = "done";
    console.log(`[index] Successfully indexed ${imported} documents into ${COLLECTION}`);
  } finally {
    clearInterval(timer);
  }
}

main().catch((e) => {
  console.error("[index] Failed", e);
  process.exitCode = 1;
});
