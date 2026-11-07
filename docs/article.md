# I Made Hindsight Remember the Fixes That Failed

Restarting a service can make an incident look resolved for two minutes. If the next engineer sees only the eventual successful fix, those two minutes—and the reason the restart failed—disappear from the team's memory.

I built ReTrace around that missing history. It is an incident investigation workspace that records failed interventions alongside successful ones, then makes those outcomes available during a later investigation through Hindsight. The point is not to turn every old failure into a rule. It is to give the next engineer enough evidence to decide whether an apparently familiar fix fits the current incident.

## The record I wanted the next engineer to find

The central example is a synthetic payments incident. Checkout requests time out, the database reports too many clients, and application logs show connection-pool exhaustion. A deployment has increased the number of replicas.

A current-input investigation can reasonably suggest inspecting database sessions, pool utilization, and recent configuration changes. What it cannot know is that the team previously restarted the application pods, watched the errors return, and eventually traced the problem to the total connection budget across replicas.

That historical outcome changes the investigation. It suggests checking whether replica growth multiplied the per-process pool limit beyond database capacity. It also explains why restarting pods did not address the earlier cause. Neither observation proves that the new incident has the same cause.

This distinction shaped the data model. A resolution contains an incident, a root cause, attempted interventions, outcomes, explanations, verification flags, and lessons. The record also carries a timestamp, a source label, and a flag identifying synthetic data. An unsuccessful action without an observed explanation would be a poor lesson to reuse.

## Memory and the audit have different jobs

The application has a React frontend and a FastAPI backend. Hindsight is the agent-memory layer. A small SQLite database records local write status and supports safe retries.

I kept those responsibilities separate because a local database can easily conceal a broken integration. If an application says it recalled a previous incident but actually loaded a matching fixture or local row, the interface might look convincing while the memory service contributes nothing.

In ReTrace, the baseline reasoning function receives only the current incident. It has no memory client and no database handle. A live memory investigation calls the official [Hindsight Python client documentation](https://hindsight.vectorize.io/) workflow and uses the returned evidence. SQLite is never a fallback source for that investigation.

The browser also has a sample workspace so the interface can be explored without credentials. Its local lessons and learning loop are explicitly labeled. They do not count as successful Hindsight operations. That separation makes an unavailable integration visible instead of smoothing it over with a believable answer.

## A citation needs a source, not just an identifier

A recalled sentence might say that restarting failed. That is useful context, but it does not automatically establish which incident it belongs to, whether the outcome was verified, or whether the current service is comparable.

I therefore retain each confirmed resolution as a versioned JSON source document. The document identifier is stable:

```python
document_id=f'retrace-{doc.incident_id}'
```

The memory adapter requests recall results with source chunks and strict ReTrace tag filtering. It reads the actual SDK response fields, including the memory ID, text, and document ID. For a bounded number of returned ReTrace documents, it fetches the original source and validates it against the application's schema.

A valid source has to identify itself as a ReTrace document, carry explicit confirmation, and agree with the document ID that was retrieved. The adapter does not reconstruct intervention outcomes by searching an arbitrary sentence for words such as “failed.”

If the source cannot be fetched or validated, ReTrace can still display the returned snippet with a limitation. It cannot turn that snippet into a structured failed-intervention recommendation. This makes the interface less assertive when provenance is incomplete, which is the behavior I wanted.

## Historical context should narrow the questions

The first compatibility rule is deliberately conservative. A historical resolution must match the current service and environment and share meaningful symptom or log terms. This is a heuristic, not a learned classifier. It can miss an incident described with different vocabulary, and a few shared tokens are not proof of a common root cause.

Once a compatible source is available, the reasoning layer still checks each intervention:

```python
if not attempt.verified or attempt.outcome == 'inconclusive':
    continue
```

A verified failed attempt produces a “Reconsider” recommendation with its observed explanation and an evidence reference. A verified successful attempt produces an investigation suggestion, with a warning to validate it against the current situation before making a change.

This is how I want negative memory to behave. “A restart failed in this connection-budget incident” is actionable context. “Never restart this service” is a much stronger claim that the record does not support.

## Confirmation is part of the learning loop

An agent-generated hypothesis should not quietly become the next incident's historical fact. ReTrace requires an engineer to confirm the resolution before retaining it. Each intervention has its own verification flag, so an uncertain attempt can remain recorded without being promoted to a verified outcome.

The retain operation uses the existing Hindsight bank and a stable document ID. The adapter verifies bank access before writing; it does not create a new bank when an identifier is wrong. A synchronous SDK success is required before the local audit marks the write retained.

Timeouts need a different treatment. The remote service might finish a write after the application stops waiting. ReTrace leaves that result unconfirmed and tells the engineer to retry with the same incident ID. The stable ID prevents recovery from creating a new source document for the same finding.

The database also hashes the resolution payload, excluding its recording timestamp. An unchanged successful retry skips another remote write locally. Reusing the ID for different facts returns a conflict. There is no distributed transaction between SQLite and Hindsight, so an interrupted process can still leave uncertainty; the application records that uncertainty instead of claiming exactly-once delivery.

## A comparison that says what it measures

The comparison view shows current-input triage beside the changes supported by retrieved historical outcomes. The baseline is deterministic. It is not a second language model, and the interface does not present the result as a model-quality benchmark.

Hindsight reflection is available as an explicit optional request. It generates additional hypotheses using the memory service's model, with a low budget. That output is labeled separately and is never automatically retained as a verified resolution. The structured failure ledger can work without enabling reflection.

This keeps two questions distinct: did historical evidence change the investigation, and did a model generate a plausible explanation? I want to inspect both, but I do not want one to stand in for the other.

## What I have actually checked

The implementation includes automated checks for baseline isolation, source mapping using installed SDK response models, context mismatches, unverified outcomes, idempotent resolution retries, quota failures, and common-secret redaction. A separate six-case synthetic evaluation checks whether outcome warnings stay grounded and whether incompatible records are excluded.

Those automated checks are offline. They do not establish Hindsight retrieval relevance across a representative dataset or demonstrate reduced production downtime. In my local Windows setup, the opt-in live smoke test passed: it retained a synthetic document and recalled its source through separate SDK clients. I also completed the dashboard flow of recording a synthetic resolution and seeing it change a later investigation. Hosted testing, restart persistence, and optional reflection are separate checks that still need their own evidence.

Rehearsing the learning demo exposed another practical detail: once the inventory scenario has been taught, it is no longer an unseen case. For a fresh before/after recording, I use an unused service name, preserve the same input through both investigations, and inspect the actual evidence. This keeps the story honest without deleting useful memory or hiding an existing match.

The broader lesson is that [agent memory](https://vectorize.io/what-is-agent-memory) needs a provenance boundary as much as it needs a retrieval mechanism. The [Hindsight open-source repository](https://github.com/vectorize-io/hindsight) supplies the memory operations. ReTrace supplies the application rules about what may be learned, what may influence advice, and what must remain uncertain.

A useful incident assistant should remember the failed fix. It should also remember the limits of what that failure tells us.
