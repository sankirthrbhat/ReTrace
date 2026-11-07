import { describe, it, expect } from "vitest";
import {
  initialRecords,
  sampleAnalyze,
  scenarios,
  sampleTimeline,
} from "./sample";
import type { RecordDoc } from "./types";
describe("sample workflow (not live Hindsight)", () => {
  it("keeps baseline independent of all stored sample outcomes", () => {
    const a = sampleAnalyze(scenarios[0].incident, initialRecords, false);
    const b = sampleAnalyze(scenarios[0].incident, [], false);
    expect(a.baseline).toEqual(b.baseline);
    expect(a.changes).toEqual([]);
    expect(a.evidence).toEqual([]);
  });
  it("links every failed intervention to a visible sample source", () => {
    const r = sampleAnalyze(scenarios[0].incident, initialRecords);
    const failed = r.changes.filter((s) => s.kind === "historical-failure");
    expect(failed).toHaveLength(1);
    expect(r.evidence.map((e) => e.memory_id)).toContain(
      failed[0].evidence_ids[0],
    );
    expect(r.message).toContain("No Hindsight");
  });
  it("abstains until a new sample lesson is recorded, then changes recommendations", () => {
    const i = scenarios[3].incident;
    expect(sampleAnalyze(i, initialRecords).changes).toEqual([]);
    const learned: RecordDoc = {
      ...initialRecords[0],
      incident: i,
      incident_id: "LEARN-001",
      root_cause: "Unbounded client retries amplified dependency latency.",
      attempts: [
        {
          action: "Increase retry count",
          outcome: "failed",
          explanation: "Higher retry counts amplified warehouse saturation.",
          verified: true,
        },
      ],
      lessons: "Bound retries and validate a backoff policy.",
    };
    const r = sampleAnalyze(i, [...initialRecords, learned]);
    expect(r.changes).toHaveLength(1);
    expect(r.changes[0].title).toContain("Increase retry count");
  });
  it("does not transfer fixes across environments", () => {
    expect(
      sampleAnalyze(
        { ...scenarios[0].incident, environment: "staging" },
        initialRecords,
      ).changes,
    ).toEqual([]);
  });
  it("does not promote unverified interventions", () => {
    const records = initialRecords.map((r) => ({
      ...r,
      attempts: r.attempts.map((a) => ({ ...a, verified: false })),
    }));
    expect(sampleAnalyze(scenarios[0].incident, records).changes).toHaveLength(
      0,
    );
  });
  it("labels every sample timeline entry honestly", () => {
    expect(
      sampleTimeline(initialRecords).every(
        (e) => e.status === "sample" && e.synthetic,
      ),
    ).toBe(true);
  });
});
