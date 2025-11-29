// src/services/ragService.js
import { getIndex } from "../config/vectorDb.js";
import { embedTexts } from "./embeddingService.js";

async function getContextAndExamples(query, k = 5) {
  const index = getIndex();

  const [queryEmbedding] = await embedTexts([query]);

  const results = await index.query({
    vector: queryEmbedding,
    topK: k,
    includeMetadata: true,
  });

  const matches = results.matches || [];

  const contextChunks = matches.map((m) => {
    const md = m.metadata || {};
    return `Q: ${md.question}\nA: ${md.solution}`;
  });

  const contextText = contextChunks.join("\n\n");

  // Use first 2–3 as few-shot examples
  const fewShotExamples = matches.slice(0, 3).map((m) => ({
    question: m.metadata.question,
    solution: m.metadata.solution,
  }));

  return { contextText, fewShotExamples };
}

export default {
  getContextAndExamples,
};
