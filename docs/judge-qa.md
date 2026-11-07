# Judge Q&A

**What is new here?**
The focused differentiator is a failure ledger that changes the next investigation using verified unsuccessful interventions, with source evidence and contextual caveats. The project is not presented as the first incident-memory system.

**Why Hindsight rather than just SQLite?**
Hindsight retains and recalls agent memory. SQLite is only the structured local write audit and retry mechanism. Live investigation never loads evidence from SQLite as a substitute for Hindsight recall.

**Does the baseline get the history?**
No. The backend baseline function receives only current incident input. Tests assert that a memory-disabled investigation makes no recall or reflect call. The baseline is deterministic symptom triage, not a generative-model performance comparison.

**How does new learning happen?**
An engineer confirms a resolution and intervention outcomes. Retain stores a versioned source document. A subsequent recall returns its document reference; the adapter fetches the original source and checks its schema and context before using it. Live proof of this sequence remains a required verification step.

**How do you prevent fabricated incident citations?**
Structured intervention recommendations need a source record obtained from a document ID returned by recall. The source must validate as a confirmed ReTrace resolution and match its document ID. An unmapped snippet may be shown but cannot create a failed-fix claim.

**What happens when credits run out?**
The analysis returns current-input triage with memory unavailable. A failed write stays unconfirmed. The SDK does not automatically retry potentially chargeable writes. Reflection is optional, budgets are low, seeding is explicit, and successful unchanged local retries skip another write.

**Could a past failed fix still be useful now?**
Yes. The ledger says that an intervention failed in its recorded context. Service, environment, and symptom checks reduce irrelevant transfer, but the current root cause still requires verification.

**Where is the LLM?**
Hindsight handles its own memory operations; optional `reflect` generates hypotheses with its configured model. Baseline and structured outcome selection are deterministic. No Codex subscription is assumed to grant a runtime API key.

**What does the evaluation prove?**
Offline tests verify API behavior, grounding, isolation, retries, and error handling. A six-case synthetic evaluation checks source compatibility and grounded outcome warnings. Neither establishes production downtime improvement or Hindsight retrieval relevance. The live smoke test is opt-in and must be run with credentials.

**Is it production-ready?**
No. The MVP needs tenant isolation, stronger authentication, durable shared storage, distributed rate limiting, retention controls, broader redaction, and observability before a production rollout.

**What work used Band AI?**
The owner reports that Band and the ReTrace Builder agent were configured. This cloud build did not execute Band. A bounded review task is provided in continue-locally.md; the team must complete and document actual usage.
