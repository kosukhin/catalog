require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Typesense = require("typesense");
const { embed } = require("./lib/embed");

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

const app = express();
app.use(cors());
app.use(express.json());

const COLLECTION = "school_events";

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    const params = { query_by: "title,description,category,location", per_page: 20, sort_by: "date:asc" };
    params.q = q && q !== "*" ? q : "*";
    const results = await client.collections(COLLECTION).documents().search(params);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/similar/:id", async (req, res) => {
  try {
    const doc = await client.collections(COLLECTION).documents(req.params.id).retrieve();
    const vec = doc.embedding;
    const results = await client.collections(COLLECTION).documents().search({
      q: "*",
      vector_query: `embedding:([${vec.join(",")}], k:10)`,
      per_page: 10,
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/similar-text", async (req, res) => {
  try {
    const text = req.body.text || "";
    const vec = embed(text);
    const results = await client.collections(COLLECTION).documents().search({
      q: "*",
      vector_query: `embedding:([${vec.join(",")}], k:10)`,
      per_page: 10,
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Backend listening on 3000"));
