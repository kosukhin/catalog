require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Typesense = require("typesense");

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
    const results = await client.collections(COLLECTION).documents().search({
      q,
      query_by: "title,description,category,location",
      per_page: 20,
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Backend listening on 3000"));
