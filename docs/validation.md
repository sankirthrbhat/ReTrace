# Validation report — November 7, 2026

## Verified in this build environment

- Python 3.12.14; Node 24.22.1; Git 2.51.1.
- Official `hindsight-client==1.2.0` installed; async method signatures and response fields inspected.
- `python -m pytest backend/tests -q`: 25 passed, 1 live test skipped in the final run.
- `npm test`: 6 frontend logic tests passed in the final run.
- TypeScript validation and production Vite build passed after fixing one modal syntax error.
- Offline source-compatibility evaluation: 6/6 synthetic cases passed. The three compatible incidents produced their expected failed-outcome warning; an unseen service, a mismatched environment, and a mismatched service did not receive unsupported historical warnings. Every added recommendation referenced provided evidence. See evaluation-results.json.
- Browser QA: sample investigation, independent comparison display, source-evidence modal, initially empty learning scenario, confirmed sample resolution capture, and a subsequent changed recommendation were observed working.
- Connection dialog fails visibly when the backend API is unavailable; it does not switch into a falsely connected live mode.

The final test run reproduced 25 backend passes, 6 frontend passes, one intentionally skipped live test, and a successful production build. Starlette emitted one dependency deprecation warning about its current httpx TestClient integration; no test failed.

## Not verified

No Hindsight API key, bank ID environment value, or Windows project files were available in this cloud workspace. Running `scripts/memory_check.py verify` returned `not_configured`. No authenticated external memory operation was performed, and no credits were spent by this build.

Therefore authentication, bank access, real retain/recall source mapping, indexing latency, cross-restart live persistence, and real reflection remain unverified. The live smoke test was intentionally skipped without opt-in. Offline SDK-shaped responses do not prove live behavior.

The managed preview runs the frontend; it does not include the ignored Python virtual environment. Full frontend-to-backend browser QA remains pending a local or deployed backend. API behavior was exercised in-process using FastAPI TestClient. Responsive CSS is included, but a resized mobile browser viewport was not exercised here.

A static preview can be published separately. It starts in sample mode and is not a deployed Python service. Render and Vercel configuration is supplied, but neither provider was configured or deployed during this build. Docker build/run was not executed here.

## Interpretation limits

Test cases use injected memory doubles and real installed SDK response schemas. They verify application contracts and failure handling; they are not evidence of Hindsight retrieval quality. Offline evaluation deliberately supplies source documents to test the downstream filter. It is not a retrieval benchmark. No production data, downtime measurements, customer usage, or percentage improvement claims are available.

## Remaining live acceptance

1. Verify the existing bank with the exact ID and local private key.
2. Seed the three synthetic documents explicitly; confirm their actual appearance in Hindsight.
3. Run the opt-in smoke test and retain its real outcome.
4. Connect the browser to FastAPI and verify the payments comparison.
5. Capture a new inventory resolution, observe a confirmed write, and recall its source in a new request.
6. Restart the backend with the same durable database and repeat recall.
7. If demonstrating reflection, enable it and record its actual result separately from verified facts.
8. Update this report with commands, sample size, timestamps, and any failures actually observed.
