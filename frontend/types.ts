export type Incident = {
  title: string;
  service: string;
  environment: "production" | "staging" | "development";
  severity: "SEV1" | "SEV2" | "SEV3";
  symptoms: string;
  logs: string;
  context: string;
};
export type Attempt = {
  action: string;
  outcome: "failed" | "succeeded" | "inconclusive";
  explanation: string;
  verified: boolean;
};
export type Resolution = {
  incident_id: string;
  incident: Incident;
  root_cause: string;
  attempts: Attempt[];
  lessons: string;
  confirmed: boolean;
  synthetic: boolean;
};
export type RecordDoc = Resolution & {
  schema_version: "retrace-v1";
  recorded_at: string;
  source: "engineer-confirmed";
};
export type Evidence = {
  memory_id: string;
  document_id: string | null;
  text: string;
  record: RecordDoc | null;
  compatible: boolean;
  limitation: string | null;
};
export type Step = {
  title: string;
  detail: string;
  evidence_ids: string[];
  kind: "investigation" | "historical-success" | "historical-failure";
};
export type Assessment = { causes: string[]; steps: Step[] };
export type Analysis = {
  investigation_id: string;
  baseline: Assessment;
  with_memory: Assessment;
  evidence: Evidence[];
  changes: Step[];
  memory_status: "recalled" | "empty" | "disabled" | "unavailable";
  message: string;
  reflection: string | null;
  reflection_status: string;
  limitations: string[];
  elapsed_ms: number;
};
export type Timeline = {
  incident_id: string;
  title: string;
  service: string;
  status: string;
  recorded_at: string;
  synthetic: boolean;
  failed_count: number;
  succeeded_count: number;
  root_cause: string;
};
export type Scenario = {
  id: string;
  name: string;
  label: string;
  incident: Incident;
};
