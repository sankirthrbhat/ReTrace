# Three-minute demo script

**Record only after live verification passes.** Keep all keys, `.env` files, access tokens, and personal tabs off screen. A sample-mode recording must be identified as sample mode and cannot stand in for the live memory demo.

| Time | Screen | Narration |
|---|---|---|
| 0:00–0:20 | Workspace in live backend mode | “I'm Sankirth R Bhat. This is ReTrace. It helps engineers investigate incidents using their team's verified history, including fixes that failed.” |
| 0:20–0:45 | Payments scenario, memory off; investigate | “A database connection error tells us what to inspect, but it doesn't tell us what our team already tried. This baseline sees only the current input. It's deterministic triage, not a benchmark against another model.” |
| 0:45–1:10 | Enable memory; investigate; comparison tab | “Now the same input goes through Hindsight recall. We have a previous connection incident. A pod restart failed because it didn't change the pool configuration. The new recommendation asks us to check the total connection budget.” |
| 1:10–1:30 | Source evidence modal | “Here's the source incident, service, environment, root cause, and recorded outcomes. Past failure doesn't mean never restart. It means this intervention needs context. The current cause is still a hypothesis.” |
| 1:30–1:50 | Inventory scenario; investigate before learning | “This scenario has no seeded resolution. ReTrace should say so, instead of inventing history.” |
| 1:50–2:20 | Record resolution | “I record that unbounded retries amplified dependency latency. Increasing retries failed; bounded backoff succeeded in our synthetic scenario. I explicitly verify these outcomes and confirm the resolution. This makes a real retain request.” |
| 2:20–2:45 | Wait for confirmed write; investigate again; show Hindsight memory dashboard if ready | “A separate request now recalls the new lesson. Its source is attached. The advice changed because we captured an observed outcome, not because we hardcoded a second response.” |
| 2:45–3:00 | Comparison and ledger | “The key lesson is that memory needs provenance. ReTrace keeps hypotheses out of verified history and makes the failed attempts available to the next engineer. It advises; people decide.” |

If a call fails or indexing is delayed, show the real state and explain it. Do not cut together a sample result as a live success. Actual downtime reduction has not been measured.

## Video title ideas

- ReTrace: Incident Memory That Remembers Failed Fixes
- Why Our Incident Assistant Keeps a Failure Ledger
- From Repeated Restarts to Evidence With Hindsight
- Watch an Incident Investigation Learn a New Lesson
- Building Traceable Incident Memory With Hindsight
