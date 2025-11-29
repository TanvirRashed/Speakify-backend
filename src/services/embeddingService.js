// src/services/embeddingService.js
import OpenAI from "openai";
import dotenv from "dotenv";
import { encodingForModel } from "js-tiktoken";

dotenv.config();

// OpenAI client
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Use the tokenizer for text-embedding-3-large (cl100k_base)
const enc = encodingForModel("text-embedding-3-large");

/**
 * Accurate token count using OpenAI's tiktoken
 */
function countTokens(text) {
  return enc.encode(text).length;
}

/**
 * Split texts into chunks, respecting token limit (6000 per chunk, model limit is 8192)
 */
function chunkTexts(texts, maxTokensPerChunk = 6000) {
  const chunks = [];
  let currentChunk = [];
  let currentTokens = 0;

  for (const text of texts) {
    const textTokens = countTokens(text);

    // If adding this text exceeds limit, flush current chunk and start new one
    if (
      currentTokens + textTokens > maxTokensPerChunk &&
      currentChunk.length > 0
    ) {
      chunks.push(currentChunk);
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(text);
    currentTokens += textTokens;
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Embed texts with automatic chunking to handle large batches
 * texts: array of strings
 */
export async function embedTexts(texts) {
  if (!Array.isArray(texts)) {
    throw new Error("embedTexts expected an array of strings");
  }

  try {
    // Split into token-safe chunks
    const chunks = chunkTexts(texts);

    if (chunks.length > 1) {
      console.log(
        `⚠️ Large batch: splitting ${texts.length} texts into ${chunks.length} chunks`
      );
    }

    // Embed each chunk and collect results
    const allEmbeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkTokens = chunk.reduce((s, t) => s + countTokens(t), 0);
      console.log(
        `📦 Embedding chunk ${i + 1}/${chunks.length} (${
          chunk.length
        } texts, ${chunkTokens} tokens)`
      );

      const response = await client.embeddings.create({
        model: "text-embedding-3-large",
        input: chunk,
      });

      allEmbeddings.push(...response.data.map((item) => item.embedding));
    }

    // Return embeddings in original order (should match input order)
    return allEmbeddings;
  } catch (err) {
    console.error("❌ OpenAI embedding failed:", err);
    throw err;
  }
}

/**
 * Call OpenAI chat completion model
 * @param {string} prompt - The prompt to send to the model
 * @param {number} maxTokens - Maximum tokens to generate
 * @returns {Promise<string>} - The generated text response
 */
export async function callModel(prompt, maxTokens = 600) {
  try {
    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    });

    return response.choices[0].message.content;
  } catch (err) {
    console.error("❌ OpenAI chat completion failed:", err);
    throw new Error(`Model call failed: ${err.message}`);
  }
}