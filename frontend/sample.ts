import data from "./data.json";
import type {
  Analysis,
  Assessment,
  Incident,
  RecordDoc,
  Scenario,
  Timeline,
  Step,
} from "./types";
export const scenarios = data.scenarios as Scenario[];
export const initialRecords = data.records as RecordDoc[];
export function sampleBaseline(i: Incident): Assessment {
  const t = (i.symptoms + " " + i.logs).toLowerCase();
  const topic = /connection|pool/.test(t)
    ? "database sessions, replica counts, and connection-pool limits"
    : /redis|oom/.test(t)
      ? "cache capacity, key growth, and eviction configuration"
      : /502|gateway/.test(t)
        ? "upstream health, ports, and readiness checks"
        : "dependency latency, retry counts, and recent changes";
  return {
    causes: [
      "Current symptoms suggest a resource or configuration issue. The root cause is unverified.",
    ],
    steps: [
      {
        title: "Inspect " + topic + ".",
        detail:
          "Read-only triage from the current input. No historical evidence is available to this baseline.",
        evidence_ids: [],
        kind: "investigation",
      },
      {
        title: "Establish the incident timeline.",
        detail:
          "Correlate deployment changes with errors before attempting an intervention.",
        evidence_ids: [],
        kind: "investigation",
      },
    ],
  };
}
export function sampleAnalyze(
  i: Incident,
  records: RecordDoc[],
  useMemory = true,
): Analysis {
  const start = performance.now();
  const baseline = sampleBaseline(i);
  const words = (s: string) =>
    new Set(
      (s.toLowerCase().match(/[a-z0-9_]{3,}/g) || []).filter(
        (w) =>
          ![
            "the",
            "and",
            "for",
            "with",
            "from",
            "after",
            "error",
            "errors",
            "requests",
            "request",
            "have",
            "this",
            "that",
          ].includes(w),
      ),
    );
  const current = words(i.symptoms + " " + i.logs);
  const matching = useMemory
    ? records.filter(
        (r) =>
          r.confirmed &&
          r.incident.service === i.service &&
          r.incident.environment === i.environment &&
          [...words(r.incident.symptoms + " " + r.incident.logs)].filter((w) =>
            current.has(w),
          ).length >= 2,
      )
    : [];
  const evidence = matching.map((r) => ({
    memory_id: "sample-" + r.incident_id,
    document_id: "sample-" + r.incident_id,
    text: r.root_cause,
    record: r,
    compatible: true,
    limitation:
      "Local synthetic sample. This is not a Hindsight recall result.",
  }));
  const changes: Step[] = matching.flatMap((r) =>
    r.attempts
      .filter((a) => a.verified && a.outcome !== "inconclusive")
      .map((a) => ({
        title:
          (a.outcome === "failed"
            ? "Reconsider: "
            : "Investigate prior fix: ") + a.action,
        detail:
          a.explanation +
          " Historical outcomes are context-specific; verify before acting.",
        evidence_ids: ["sample-" + r.incident_id],
        kind:
          a.outcome === "failed" ? "historical-failure" : "historical-success",
      })),
  );
  return {
    investigation_id:
      globalThis.crypto?.randomUUID?.() ??
      "sample-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2),
    baseline,
    with_memory: {
      causes: [
        ...baseline.causes,
        ...matching.map(
          (r) =>
            "Historical hypothesis [" + r.incident_id + "]: " + r.root_cause,
        ),
      ],
      steps: [...changes, ...baseline.steps],
    },
    evidence,
    changes,
    memory_status: !useMemory
      ? "disabled"
      : evidence.length
        ? "recalled"
        : "empty",
    message: !useMemory
      ? "Sample memory disabled. Current-input triage only."
      : evidence.length
        ? `${evidence.length} local sample resolution(s) matched. No Hindsight calls were made.`
        : "No matching sample lessons. Record a sample resolution, then investigate again.",
    reflection: null,
    reflection_status: "not_requested",
    limitations: [
      "Synthetic sample mode uses local records and deterministic triage. It does not demonstrate live Hindsight.",
      "All current causes are hypotheses. Past outcomes may not apply.",
    ],
    elapsed_ms: Math.round(performance.now() - start),
  };
}
export function sampleTimeline(records: RecordDoc[]): Timeline[] {
  return [...records]
    .reverse()
    .map((r) => ({
      incident_id: r.incident_id,
      title: r.incident.title,
      service: r.incident.service,
      status: "sample",
      recorded_at: r.recorded_at,
      synthetic: true,
      failed_count: r.attempts.filter(
        (a) => a.verified && a.outcome === "failed",
      ).length,
      succeeded_count: r.attempts.filter(
        (a) => a.verified && a.outcome === "succeeded",
      ).length,
      root_cause: r.root_cause,
    }));
}
