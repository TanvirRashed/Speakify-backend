// src/controllers/reasoningController.js
import { callModel } from "../services/embeddingService.js";
import ragService from "../services/ragService.js";
const { getContextAndExamples } = ragService;

function buildZeroShotPrompt({ transcript, question, contextText }) {
  return `
You are an education-domain reasoning assistant.

Use the following CONTEXT (problems and solutions from a dataset) plus the TRANSCRIPT to answer.
Show clear reasoning steps, then a short final answer.

CONTEXT:
${contextText || "(no extra context found)"}

TRANSCRIPT:
${transcript}

QUESTION:
${question || "Explain the key ideas from the transcript for a student."}
`;
}

function buildFewShotPrompt({
  transcript,
  question,
  contextText,
  fewShotExamples,
}) {
  const examplesText = fewShotExamples
    .map(
      (ex) => `
Example:
Q: ${ex.question}
A:
Step 1: (explain reasoning...)
Step 2: (continue reasoning...)
Final Answer: ${ex.solution}
`
    )
    .join("\n");

  return `
You are a tutoring assistant. Always:

- Think step by step.
- Then write "Final Answer:" on a separate line.

Here are some example question–answer pairs from a dataset:
${examplesText || "(no examples available)"}

You also have additional CONTEXT:
${contextText || "(no extra context)"}

Now answer this new case:

TRANSCRIPT:
${transcript}

QUESTION:
${question || "Explain the main concepts as if teaching a student."}

A:
`;
}

async function resonate(req, res, next) {
  try {
    console.log('Received request body:', req.body);
    
    const { transcript, question } = req.body;
    
    if (!transcript) {
      return res.status(400).json({ error: "transcript is required" });
    }

    console.log('Processing transcript:', transcript.substring(0, 100) + '...');
    console.log('Question:', question || 'No question provided');

    // Get context from vector DB
    const queryForRetrieval = question || transcript.slice(0, 500);
    
    console.log('Retrieving context from vector DB...');
    const { contextText, fewShotExamples } = await getContextAndExamples(
      queryForRetrieval,
      5
    );

    console.log('Building prompts...');
    const zeroPrompt = buildZeroShotPrompt({
      transcript,
      question,
      contextText,
    });
    const fewPrompt = buildFewShotPrompt({
      transcript,
      question,
      contextText,
      fewShotExamples,
    });

    console.log('Calling OpenAI models...');
    const [zeroShot, fewShot] = await Promise.all([
      callModel(zeroPrompt, 600),
      callModel(fewPrompt, 600),
    ]);

    console.log('Successfully generated responses');
    res.json({ zeroShot, fewShot });
  } catch (err) {
    console.error('Error in resonate controller:', err);
    console.error('Error stack:', err.stack);
    
    // Send detailed error response
    res.status(500).json({ 
      error: err.message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

export default {
  resonate,
};