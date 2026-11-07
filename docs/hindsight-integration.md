# Hindsight integration contract

Reviewed against the official Python SDK and installed `hindsight-client==1.2.0` on November 7, 2026:

- Python client: https://hindsight.vectorize.io/sdks/python
- Source documents and idempotent document IDs: https://hindsight.vectorize.io/developer/api/documents

## Actual SDK surface

The adapter uses `Hindsight(..., api_key=..., timeout=..., max_attempts=1)`, `banks.get_bank_config`, `aretain`, `arecall`, `documents.get_document`, `areflect`, and `aclose`. Both verification and the pre-retain check use the read-only configuration route. The previous profile route returned HTTP 410 during the owner's local testing and was replaced in both locations. SDK 1.2.0 exposes the supported async `get_bank_config(bank_id=...)` method.

Official endpoint references: https://docs.hindsight.vectorize.io/api-reference/get-bank-config/ and https://docs.hindsight.vectorize.io/api-reference/get-bank-profile/.

The retained document is `StoredDocument`: a strict, versioned JSON resolution containing current incident fields, intervention outcomes and verification flags, source, synthetic status, and timestamp. Source IDs are `retrace-<incident_id>`; the tag is `retrace`.

```python
result = await client.aretain(
    bank_id=settings.hindsight_bank_id,
    content=record.model_dump_json(),
    document_id=f'retrace-{record.incident_id}',
    tags=['retrace'],
    retain_async=False,
)
```

The production adapter also supplies metadata and checks `result.success` and `result.var_async`. Only synchronous confirmed retention returns success. The app reads the existing bank configuration before retaining, so a bank typo does not silently create another bank.

```python
response = await client.arecall(
    bank_id=settings.hindsight_bank_id,
    query=query,
    budget='low',
    max_tokens=1800,
    include_chunks=True,
    max_chunk_tokens=2500,
    tags=['retrace'],
    tags_match='all_strict',
)
```

Each `response.results` entry uses the installed SDK's `id`, `text`, and `document_id`. ReTrace fetches at most four unique source documents and validates `original_text` as `StoredDocument`. It checks confirmation and document-ID consistency. If parsing or fetching fails, a source snippet may still be displayed with a limitation, but it cannot create a structured failed-fix claim. The local SQLite copy is never substituted for a missing source.

Reflection is optional and uses a low budget with the same tag scope. It produces a labeled hypothesis, never a verified resolution or a source-verified ledger entry. It is skipped when memory is disabled, empty, or unavailable. Turn it on in Connection settings only when needed.

## Cost and failure controls

There is no startup seeding, automatic polling, or automatic retain retry. Read/write SDK calls use one attempt and bounded timeouts. The analysis route tolerates unavailable memory and returns an honest baseline-only result. Resolution errors return a safe 503 and leave an unconfirmed audit status. 401/403, 404, 402/429, timeouts, and generic failures get distinct safe messages. Raw provider responses and stack traces are not returned.

On November 7, the owner reported successful local bank access, `1 passed` for the real retain/recall smoke test, and a working synthetic learning loop in the live dashboard. The reviewer independently reran offline checks without credentials; it did not reproduce those external calls. Hosted verification, restart persistence, and optional reflection remain pending explicit evidence. See validation.md. Before recording a fresh learning demo, use an unused service name and inspect the actual returned context rather than assuming the existing inventory scenario is unseen.
