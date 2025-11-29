// import dotenv from "dotenv";
// dotenv.config();

// import { embedTexts } from "./embeddingService.js";

// (async () => {
//   try {
//     const texts = [
//       "This is a test sentence for embeddings.",
//       "Another short sample to embed.",
//     ];
//     const embs = await embedTexts(texts);
//     console.log(
//       "Embeddings shapes:",
//       embs.map((e) => e.length)
//     );
//     console.log("First vector (first 8 dims):", embs[0].slice(0, 8));
//   } catch (err) {
//     console.error("Test embed failed:", err);
//     process.exit(1);
//   }
// })();
