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
app.use(express.static("public"));

const COLLECTION = "school_events";

app.get("/health", (_req, res) => res.json({ ok: true }));

app.get("/search", async (req, res) => {
    try {
        const q = req.query.q || "";
        const page = parseInt(req.query.page || "1", 10);
        const perPage = parseInt(req.query.per_page || "20", 10);

        const params = {
            query_by: "title,description,category,location",
            per_page: perPage,
            page: page,
            sort_by: "date:asc",
            exclude_fields: "embedding",
            highlight_fields: "none"
        };
        params.q = q && q !== "*" ? q : "*";
        const results = await client.collections(COLLECTION).documents().search(params);
        if (results.hits) {
            results.hits = results.hits.map((h) => {
                const { highlight, highlights, ...rest } = h;
                return rest;
            });
        }
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
            sort_by: "date:asc",
            per_page: 10,
            exclude_fields: "embedding",
            highlight_fields: "none",
        });
        if (results.hits) results.hits = results.hits.map(({ highlight, highlights, ...r }) => r);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/similar-text", async (req, res) => {
    try {
        const text = req.body.text || "";
        const vec = await embed(text);
        const results = await client.collections(COLLECTION).documents().search({
            q: "*",
            vector_query: `embedding:([${vec.join(",")}], k:10)`,
            sort_by: "date:asc",
            per_page: 10,
            exclude_fields: "embedding",
            highlight_fields: "none",
        });
        if (results.hits) results.hits = results.hits.map(({ highlight, highlights, ...r }) => r);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/hybrid", async (req, res) => {
  try {
    const q = req.query.q || "";
    const page = parseInt(req.query.page || "1", 10);
    const perPage = parseInt(req.query.per_page || "20", 10);
    const vec = await embed(q || "");
    const textRes = await client.collections(COLLECTION).documents().search({
      q: q || "*",
      query_by: "title,description,category,location",
      sort_by: "date:asc",
      per_page: 250,
      exclude_fields: "embedding",
      highlight_fields: "none",
    });
    const vecRes = await client.collections(COLLECTION).documents().search({
      q: "*",
      vector_query: `embedding:([${vec.join(",")}], k:1000)`,
      per_page: 250,
      exclude_fields: "embedding",
      highlight_fields: "none",
    });
    const seen = new Set();
    const merged = [];
    for (const h of textRes.hits || []) {
      if (!seen.has(h.document.id)) { seen.add(h.document.id); merged.push({ ...h, _type: "text" }); }
    }
    for (const h of vecRes.hits || []) {
      if (!seen.has(h.document.id)) { seen.add(h.document.id); merged.push({ ...h, _type: "vector" }); }
    }
    const start = (page - 1) * perPage;
    const slice = merged.slice(start, start + perPage);
    const hits = slice.map(({ highlight, highlights, ...r }) => r);
    res.json({ found: merged.length, page, hits });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


app.listen(3000, () => console.log("Backend listening on 3000"));
