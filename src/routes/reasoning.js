// src/routes/reasoning.js
import { Router } from "express";
import reasoningController from "../controllers/reasoningController.js";

const router = Router();

// ✅ This becomes POST /api/reason
router.post("/", reasoningController.resonate);

// Optional: GET /api/reason for quick testing
router.get("/", async (req, res, next) => {
  try {
    req.body = req.body || {};
    if (req.query.transcript) req.body.transcript = req.query.transcript;
    if (req.query.question) req.body.question = req.query.question;

    return await reasoningController.resonate(req, res, next);
  } catch (err) {
    next(err);
  }
});

export default router;
