// src/services/ingestJsonlToPinecone.js
import dotenv from "dotenv";
dotenv.config();

import { existsSync, createReadStream } from "fs";
import { join, dirname } from "path";
import { createInterface } from "readline";
import { fileURLToPath } from "url";

import { getIndex } from "../config/vectorDb.js";
import { embedTexts } from "./embeddingService.js";
import { readFileSync, writeFileSync } from "fs";

async function ingestJsonl() {
  const index = getIndex();
  // __dirname is not defined in ESM; derive from import.meta.url
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const filePath = join(__dirname, "../../data/scp116k.jsonl");
  const checkpointFile = join(__dirname, "../../.ingestion-checkpoint.json");

  if (!existsSync(filePath)) {
    console.error("JSONL file not found at:", filePath);
    process.exit(1);
  }

  // Load checkpoint to resume from last processed record
  let lastProcessedLine = 0;
  if (existsSync(checkpointFile)) {
    try {
      const checkpoint = JSON.parse(readFileSync(checkpointFile, "utf8"));
      lastProcessedLine = checkpoint.lastProcessedLine || 0;
      console.log(`📍 Resuming from line ${lastProcessedLine + 1}...`);
    } catch (err) {
      console.warn(
        "⚠️ Could not read checkpoint, starting fresh:",
        err.message
      );
    }
  }

  const fileStream = createReadStream(filePath);
  const rl = createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  const batchSize = 64;
  let batch = [];
  let count = 0;
  let lineNumber = 0;

  async function flushBatch() {
    if (batch.length === 0) return;

    // 1) Build texts to embed, with truncation to keep them reasonable
    const MAX_TEXT_LENGTH = 2000; // Chars per record (roughly 500 tokens)
    const texts = batch.map((rec) => {
      let q = rec.text?.[1] || rec.question || rec.prompt || "";
      let a = rec.text?.[2] || rec.solution || rec.answer || "";

      // Truncate each field if too long
      if (q.length > MAX_TEXT_LENGTH) {
        q = q.substring(0, MAX_TEXT_LENGTH) + "...";
      }
      if (a.length > MAX_TEXT_LENGTH) {
        a = a.substring(0, MAX_TEXT_LENGTH) + "...";
      }

      return `QUESTION: ${q}\nSOLUTION: ${a}`;
    });

    // 2) Get embeddings from OpenAI (with automatic chunking)
    const embeddings = await embedTexts(texts);

    // 3) Build vectors for upsert
    const vectors = batch.map((rec, i) => ({
      id: String(rec.id || rec._id || `rec-${count - batch.length + i}`),
      values: embeddings[i],
      metadata: {
        question: (rec.text?.[1] || rec.question || rec.prompt || "").substring(
          0,
          500
        ),
        solution: (rec.text?.[2] || rec.solution || rec.answer || "").substring(
          0,
          500
        ),
        source: rec.source || "SCP-116K",
      },
    }));

    // 4) Upsert into Pinecone
    await index.upsert(vectors);
    console.log(`Upserted batch of ${batch.length} records (total: ${count})`);

    // Save checkpoint after successful upsert
    writeFileSync(
      checkpointFile,
      JSON.stringify(
        { lastProcessedLine: lineNumber - 1, totalProcessed: count },
        null,
        2
      )
    );

    batch = [];
  }

  for await (const line of rl) {
    lineNumber++;

    // Skip already-processed lines
    if (lineNumber <= lastProcessedLine) {
      continue;
    }

    const trimmed = line.trim();
    if (!trimmed) continue;

    let rec;
    try {
      rec = JSON.parse(trimmed);
    } catch (err) {
      console.error("Could not parse line, skipping:", trimmed.slice(0, 80));
      continue;
    }

    batch.push(rec);
    count++;

    if (batch.length >= batchSize) {
      await flushBatch();
    }
  }

  await flushBatch();
  console.log(`✅ Ingestion complete. Total records processed: ${count}`);
  console.log(`📍 Checkpoint saved at: ${checkpointFile}`);
}

ingestJsonl().catch((err) => {
  console.error("Ingestion error:", err);
  process.exit(1);
});
