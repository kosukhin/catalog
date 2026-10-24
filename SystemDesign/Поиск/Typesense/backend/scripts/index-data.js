require("dotenv").config();
const fs = require("fs");
const path = require("path");
const Typesense = require("typesense");
const { embed } = require(path.join(__dirname, "..", "lib", "embed.js"));

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
  try {
    await client.collections(COLLECTION).delete();
  } catch (e) {
    // ignore if not exists
  }
  await client.collections().create(schema);
  const docs = [];
  let processed = 0;
  const start = Date.now();
  const timer = setInterval(() => {
    console.log(`Indexed ${processed}/${rawDocs.length} (elapsed ${Math.round((Date.now()-start)/1000)}s)`);
  }, 5000);
  for (const d of rawDocs) {
    docs.push({ ...d, embedding: await embed(`${d.title} ${d.description} ${d.category}`) });
    processed++;
  }
  clearInterval(timer);
  console.log(`Embedded ${docs.length}/${rawDocs.length}`);
  await client.collections(COLLECTION).documents().import(docs, { action: "create" });
  console.log("Indexed", docs.length, "documents into", COLLECTION);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
