// src/config/vectorDb.js
import { Pinecone } from "@pinecone-database/pinecone";

import dotenv from "dotenv";
dotenv.config();

const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY,
});

const indexName = process.env.PINECONE_INDEX || "scp-116k-index";

export function getPineconeClient() {
  return pinecone;
}

export function getIndex() {
  return pinecone.index(indexName);
}

export default {
  getPineconeClient,
  getIndex,
};
