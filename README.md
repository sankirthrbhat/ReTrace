# ReTrace

**Incident intelligence that remembers what failed.**

ReTrace helps engineers investigate recurring incidents using verified historical outcomes. Its Failure Ledger keeps unsuccessful interventions alongside successful ones, so the next investigation can ask better questions with source evidence attached.

**Current verification:** the React interface, FastAPI routes, local persistence, SDK response mapping, and offline grounding rules have been tested. Live Hindsight authentication, retain, recall, and reflect have **not** been verified in the build environment because no Hindsight key was available. Sample mode never makes Hindsight calls and is labeled throughout. This project is not submission-complete until the live checklist below passes.

## Run on Windows

Use your actual project directory. This build was created in a cloud Linux workspace; it did not change `C:\Users\HP\Projects\ReTrace` on your laptop. Extract the source into your intended ReTrace folder, preserving any existing `backend\.env` and prior work.

From PowerShell in the project root:

```powershell
py -3 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
npm.cmd ci
if (!(Test-Path backend\.env)) { Copy-Item backend\.env.example backend\.env }
notepad backend\.env
```

**Only run Copy-Item when backend\.env does not already exist.** Alternatively create the file in your editor. Keep your existing key private and set these values locally:

```dotenv
HINDSIGHT_BASE_URL=https://api.hindsight.vectorize.io
HINDSIGHT_BANK_ID="ReTrace Incident Memory"
HINDSIGHT_API_KEY=YOUR_PRIVATE_KEY
```

The bank ID above comes from the supplied project brief. Verify it; the code never creates a bank. Do not paste the key into prompts or commit it. The app reads `.env` from `backend/` regardless of the shell's working directory.

Verify your bank, then seed three synthetic lessons explicitly:

```powershell
backend\.venv\Scripts\python.exe scripts\memory_check.py verify
backend\.venv\Scripts\python.exe scripts\memory_check.py seed --confirm-synthetic
```

Start both development servers from the project root:

```powershell
npm.cmd run dev:full
```

The development runner starts FastAPI on port 8000 and Vite on its printed frontend port. Stop both with Ctrl+C. For separate terminals, start Uvicorn manually and use `npm.cmd run dev` for Vite.

Open the localhost URL printed by Vite (normally http://localhost:5173). Choose **Connect Hindsight**, leave Backend URL empty to use the development proxy, and choose **Verify & use live backend**. If you set `RETRACE_API_TOKEN`, supply that separate access token in the dialog. The Hindsight key stays on the backend.

Python 3.12 and Node 24 were used for this build. Other supported Python versions may work but were not tested. The commands use the venv executable directly, avoiding PowerShell activation policy issues.

### Linux / macOS

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements-dev.txt
npm ci
# Create backend/.env from the example only if it does not already exist.
backend/.venv/bin/python scripts/memory_check.py verify
backend/.venv/bin/python scripts/memory_check.py seed --confirm-synthetic
# Start FastAPI and Vite together
npm run dev:full
```

## Demo in 60 seconds

1. Choose **Connection pool exhaustion** and investigate.
2. Open **Memory comparison**. The baseline inspects the current symptoms; the memory side cites a prior failed pod restart and a successful connection-budget correction.
3. Open **Source evidence** to inspect the recorded incident, context, attempts, and verification flags.
4. Choose **A new lesson to remember** and investigate. No matching seeded resolution should be available for `inventory-api`.
5. Record a root cause and failed/successful interventions, verify only observed outcomes, and explicitly confirm the resolution.
6. Investigate again. The new record should influence the evidence-backed steps.

In sample mode this is a browser-local illustration. For judging, complete the same steps in live mode and show the Hindsight dashboard / smoke-test output. A successful retain alone is not proof of later recall.

## How Hindsight is used

- The official `hindsight-client==1.2.0` Python SDK performs asynchronous retain, recall, and optional reflect calls.
- Before retention, the app reads the existing bank profile. It never calls bank creation APIs.
- Confirmed resolutions are serialized as versioned JSON documents under stable `retrace-<incident_id>` document IDs and the `retrace` tag.
- Recall requests use strict tag filtering and a low token budget. For up to four returned ReTrace document IDs, the source document is fetched and validated.
- Only a confirmed, compatible source record may contribute structured failed-fix or successful-fix advice. Unmapped snippets remain evidence without intervention claims.
- SQLite stores a local write audit and supports retry idempotency. **It is never used as a hidden recall fallback.**
- An explicit optional reflection requests Hindsight-generated hypotheses. These are labeled separately, never promoted to confirmed facts, and never retained automatically.

See [architecture](docs/architecture.md) and [Hindsight integration](docs/hindsight-integration.md).

## API

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/health` | Liveness and configuration presence; not proof of live connectivity |
| GET | `/api/memory/status` | Verify existing bank access |
| GET | `/api/demo/scenarios` | Four labeled synthetic scenario inputs |
| POST | `/api/incidents/analyze` | Independent baseline plus optional real memory evidence |
| POST | `/api/incidents/resolve` | Explicitly confirmed resolution retention |
| GET | `/api/memory/timeline` | Local audit with retained / pending / unconfirmed statuses |

Interactive API docs are at `/docs`. Request and response schemas are defined in `backend/app/models.py`. No API endpoint seeds automatically.

## Tests and evaluation

```powershell
backend\.venv\Scripts\python.exe -m pytest backend\tests -q
npm.cmd test
npm.cmd run build
backend\.venv\Scripts\python.exe scripts\evaluate.py
```

To opt into the real smoke test (uses credits and writes one stable synthetic document):

```powershell
$env:RETRACE_LIVE_TESTS="1"
backend\.venv\Scripts\python.exe -m pytest backend\tests\test_live.py -m live -s
Remove-Item Env:RETRACE_LIVE_TESTS
```

The smoke test verifies the bank, retains `SMOKE-RETRACE-V1`, and recalls its source using separate SDK clients. It polls briefly for indexing. If retention succeeds but recall does not return the document, the test fails rather than substituting local data. Run the UI's resolution flow afterward to verify end-to-end new learning.

Offline evaluation measures source compatibility and grounding on six synthetic cases. It does not measure Hindsight retrieval precision, LLM quality, or production downtime reduction. See [validation report](docs/validation.md).

## Deployment

The easiest full-stack option is the supplied Dockerfile: it builds React and serves `dist/` from FastAPI at the same origin. `render.yaml` describes this deployment; no Render account or service was created during the build.

1. Push this source to your own GitHub repository, excluding `.env`, databases, and dependencies.
2. Create the Render Docker service / Blueprint from `render.yaml`.
3. Set the private Hindsight key and exact bank ID. Keep the generated `RETRACE_API_TOKEN` secret.
4. For same-origin hosting, leave the frontend Backend URL empty and enter the ReTrace access token in connection settings.
5. For a separate Vercel/static frontend, add its exact origin to `RETRACE_ALLOWED_ORIGINS`, then set the deployed HTTPS backend origin in the connection dialog. You may also build with `VITE_API_BASE_URL` set to that origin. Never put a Hindsight key in a `VITE_` variable.

Free container storage is ephemeral. Hindsight remains the agent memory, but the local write audit and skip-on-retry state require a persistent disk for durable deployment. Configure `RETRACE_DATABASE=/var/data/retrace.db` only when a disk is actually attached. The frontend preview is static; it starts in sample mode until a deployed backend is connected. Render/Vercel deployment was prepared but not executed.

## Scope and limitations

ReTrace is advisory. It cannot execute shell commands or change infrastructure. Baseline triage and structured outcome mapping are deterministic; optional Hindsight reflection provides the generative component. Source compatibility currently requires matching service, matching environment, and at least two meaningful overlapping symptom/log tokens. This conservative heuristic can miss paraphrases and is not a learned incident classifier.

The MVP has a shared access token, exact-origin CORS, bounded inputs, common-secret redaction, and an in-process rate limit. It does not implement per-user login, tenant isolation, comprehensive PII detection, distributed rate limiting, or production observability. Do not treat it as a production multi-tenant service. Review logs manually before uploading; regex redaction is best effort.

## Submission materials

- [Submission checklist and known gaps](docs/submission-checklist.md)
- [Three-minute demo script](docs/demo-script.md)
- [Judge Q&A](docs/judge-qa.md)
- [Technical article draft](docs/article.md)
- [Additional member angles](docs/member-content.md)
- [Social post draft](docs/social-post.md)
- [Local Codex / Band continuation](docs/continue-locally.md)

Nothing has been posted publicly. Band AI usage must be completed by the team; configuring an agent alone is not recorded as completed work.
