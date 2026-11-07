# Validation report — November 7, 2026

This report separates reviewer-run checks from owner-reported credentialed local results. It does not claim a deployed application has been tested.

## Reviewer-run checks

Reviewed source commit: `5235492c99d1eddc9e7378415c6cb99da04ef051` from https://github.com/sankirthrbhat/ReTrace.

| Check | Actual result |
|---|---|
| Backend tests, excluding opt-in live test | 25 passed; 1 live test deselected |
| Frontend tests with Vitest 4.1.12 | 6 passed |
| TypeScript and Vite production build | Passed |
| Full npm audit, including development dependencies | 0 reported vulnerabilities |
| Production-only npm audit | 0 reported vulnerabilities |
| Offline source-compatibility evaluation | 6/6 synthetic cases passed |
| Bank-check endpoint inspection | `get_bank_config` used for verification and pre-retain checks |
| Current Git-tracked files | No private `.env`, database, installed dependencies, or temporary fix backup tracked |
| Example environment file | Hindsight key left blank |

Commands actually run:

```bash
npm ci
npm test
npm run build
npm audit
npm audit --omit=dev
backend/.venv/bin/python -m pytest backend/tests -m 'not live' -q
backend/.venv/bin/python scripts/evaluate.py
```

Environment: Python 3.12.14 and Node 24.22.1. Starlette emitted a deprecation warning about its httpx TestClient integration; the tests passed. The six-case evaluation supplies source documents to the downstream compatibility filter. It is not a Hindsight retrieval benchmark.

Earlier browser QA observed the labeled local sample investigation, comparison, source-evidence view, resolution capture, later changed recommendation, searchable ledger, and timeline. That sample-mode QA is not a substitute for real memory testing.

## Owner-reported local live verification

The owner reported these results from the Windows project on November 7:

- The private Hindsight key loads from local `backend/.env`.
- The retired bank profile route produced HTTP 410; both bank checks were changed to `get_bank_config`.
- Existing-bank access succeeded.
- The explicit real retain/recall smoke test returned **1 passed**. This test verifies a source document returned through separate SDK client calls.
- The dashboard connected in **Live backend mode**, with a screenshot showing three retained synthetic resolutions.
- The owner recorded a synthetic inventory resolution through the dashboard and reported that subsequent recall changed the recommendations.

These credentialed results were reported by the owner; the reviewer did not receive the API key, run those external calls, or observe the local live browser directly. No latency, retrieval-accuracy percentage, production incident, or downtime improvement is asserted.

## Still pending explicit evidence

- Recall after a backend restart using the same incident input and exact service name.
- Optional Hindsight reflection, if it will be demonstrated.
- Docker build and hosted frontend/backend end-to-end verification.
- Judge access to the hosted application, including the app's separate access-token workflow.
- A resized mobile viewport check on the deployed application.
- Completed Band AI task and review artifact.
- Published individual articles/social posts, team video, and final submission links.

The current Dockerfile and Render configuration were inspected, but no Render service was deployed or tested by this review. Render Free uses an ephemeral filesystem: the local SQLite audit can reset while remote Hindsight memory remains separate. A fresh deployment's counters do not inventory the entire remote bank.

## Repeating the live learning demonstration

The default inventory scenario has already been taught. For a fresh before/after recording, edit its service to an unused name such as `inventory-demo-002`, inspect the initial evidence, record a clearly synthetic resolution, and investigate the same input again. Related evidence from other services can still be returned; do not describe that as an empty bank. Keep the exact service name when repeating the request after a restart.

Do not delete memories just to manufacture an empty before-state. Do not splice sample-mode output into a live demonstration. Keep current-incident causes hypothetical and synthetic intervention outcomes labeled as such.

## Interpretation limits

Offline tests validate application contracts, source grounding, context filtering, retries, and safe failure behavior. The one owner-reported live smoke test verifies one concrete integration case, not general retrieval quality. The local UI learning result demonstrates one synthetic workflow. Neither establishes production readiness or reduced downtime.
