import { useEffect, useRef, useState } from "react";
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  Download,
  FlaskConical,
  GitCompareArrows,
  History,
  Layers3,
  LoaderCircle,
  Menu,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Terminal,
  TriangleAlert,
  Workflow,
  X,
  Zap,
} from "lucide-react";
import {
  initialRecords,
  scenarios,
  sampleAnalyze,
  sampleTimeline,
} from "./sample";
import type {
  Analysis,
  Attempt,
  Evidence,
  Incident,
  RecordDoc,
  Resolution,
  Step,
  Timeline,
} from "./types";

type Page = "workspace" | "ledger" | "timeline";
type Tab = "investigation" | "evidence" | "comparison";
const initialIncident = scenarios[0].incident;
function readRecords() {
  try {
    const v = localStorage.getItem("retrace-samples-v1");
    return v ? (JSON.parse(v) as RecordDoc[]) : initialRecords;
  } catch {
    return initialRecords;
  }
}
function apiBase() {
  return (
    localStorage.getItem("retrace-api-url") ||
    import.meta.env.VITE_API_BASE_URL ||
    ""
  );
}
function IconBadge({
  children,
  tone = "teal",
}: {
  children: React.ReactNode;
  tone?: string;
}) {
  return <span className={"icon-badge " + tone}>{children}</span>;
}
function Empty({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="empty">
      <Database size={28} />
      <h3>{title}</h3>
      <p>{detail}</p>
    </div>
  );
}
function App() {
  const [page, setPage] = useState<Page>("workspace"),
    [tab, setTab] = useState<Tab>("investigation");
  const [sample, setSample] = useState(true),
    [records, setRecords] = useState(readRecords);
  const [incident, setIncident] = useState<Incident>(initialIncident),
    [scenario, setScenario] = useState("pool");
  const [analysis, setAnalysis] = useState<Analysis | null>(null),
    [timeline, setTimeline] = useState<Timeline[]>([]);
  const [useMemory, setUseMemory] = useState(true),
    [reflect, setReflect] = useState(false),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false),
    [resolve, setResolve] = useState(false),
    [selected, setSelected] = useState<Evidence | null>(null);
  const [filter, setFilter] = useState(""),
    [mobile, setMobile] = useState(false),
    [connected, setConnected] = useState(false);
  const evidenceRef = useRef<HTMLDivElement>(null);
  const epoch = useRef(0);
  useEffect(() => {
    setAnalysis(null);
    epoch.current += 1;
  }, [incident, sample]);
  useEffect(() => {
    localStorage.setItem("retrace-samples-v1", JSON.stringify(records));
  }, [records]);
  async function request<T>(path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 160000);
    try {
      const response = await fetch(apiBase() + path, {
        method: body ? "POST" : "GET",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          ...(sessionStorage.getItem("retrace-token")
            ? {
                Authorization:
                  "Bearer " + sessionStorage.getItem("retrace-token"),
              }
            : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      const type = response.headers.get("content-type") || "";
      if (!type.includes("application/json"))
        throw new Error(
          "No ReTrace API responded. Open Connection settings and set your backend URL.",
        );
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          typeof data.detail === "string"
            ? data.detail
            : "The request was invalid. Check the field values and try again.",
        );
      return data;
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError")
        throw new Error(
          "The backend timed out. A write may still have completed; retry with the same incident ID.",
        );
      throw e;
    } finally {
      clearTimeout(timeout);
    }
  }
  async function loadTimeline() {
    try {
      setTimeline(await request<Timeline[]>("/api/memory/timeline"));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    if (!sample) void loadTimeline();
  }, [sample]);
  async function investigate() {
    const requestEpoch = epoch.current;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = sample
        ? sampleAnalyze(incident, records, useMemory)
        : await request<Analysis>("/api/incidents/analyze", {
            incident,
            use_memory: useMemory,
            reflect,
          });
      if (requestEpoch === epoch.current) {
        setAnalysis(result);
        setTab("investigation");
        setEditing(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function chooseScenario(id: string) {
    const s = scenarios.find((s) => s.id === id);
    if (s) {
      setIncident({ ...s.incident });
      setScenario(id);
      setAnalysis(null);
      setError("");
      setNotice("");
    }
  }
  const entries = sample ? sampleTimeline(records) : timeline;
  const activeEntries = entries.filter(
    (e) => e.status === "retained" || e.status === "sample",
  );
  const ledger = sample
    ? records
    : Array.from(
        new Map(
          (analysis?.evidence ?? []).flatMap((e) =>
            e.record ? [[e.record.incident_id, e.record] as const] : [],
          ),
        ).values(),
      );
  const failed = activeEntries.reduce((a, e) => a + e.failed_count, 0);
  function go(p: Page) {
    setPage(p);
    setMobile(false);
    setFilter("");
  }
  function exportInvestigation() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            mode: sample ? "synthetic-sample" : "live-backend",
            incident,
            analysis,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "retrace-investigation.json";
    a.click();
    URL.revokeObjectURL(url);
  }
  function viewEvidence(id: string) {
    setTab("evidence");
    setSelected(analysis?.evidence.find((e) => e.memory_id === id) || null);
    setTimeout(
      () =>
        evidenceRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        }),
      0,
    );
  }
  async function saveResolution(r: Resolution) {
    if (sample) {
      if (records.some((d) => d.incident_id === r.incident_id))
        throw new Error("Use a unique sample incident ID.");
      setRecords([
        ...records,
        {
          ...r,
          schema_version: "retrace-v1",
          recorded_at: new Date().toISOString(),
          source: "engineer-confirmed",
        },
      ]);
      setNotice(
        "Sample lesson saved in this browser. Investigate again to see the change. No Hindsight write occurred.",
      );
    } else {
      const result = await request<{ message: string }>(
        "/api/incidents/resolve",
        r,
      );
      setNotice(result.message);
      await loadTimeline();
    }
    setResolve(false);
    setAnalysis(null);
  }
  const nav = [
    { id: "workspace" as Page, label: "Incident workspace", icon: Workflow },
    { id: "ledger" as Page, label: "Failure ledger", icon: BookOpen },
    { id: "timeline" as Page, label: "Learning timeline", icon: History },
  ];
  return (
    <div className="app-shell">
      <aside className={"sidebar " + (mobile ? "mobile-open" : "")}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            go("workspace");
          }}
        >
          <span className="brand-symbol">
            <Layers3 size={24} />
          </span>
          ReTrace<span className="version">BETA</span>
        </a>
        <div className="team-card">
          <span className="team-avatar">RT</span>
          <div>
            <strong>Engineering workspace</strong>
            <small>Incident intelligence</small>
          </div>
        </div>
        <p className="nav-label">WORKSPACE</p>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className={page === n.id ? "nav-item active" : "nav-item"}
            >
              <n.icon size={18} />
              {n.label}
              {n.id === "ledger" && <span className="nav-count">{failed}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="little-line" />
          <p>
            Every incident.
            <br />
            <strong>A lesson remembered.</strong>
          </p>
          <p className="small-note">
            Historical evidence for the next investigation.
          </p>
        </div>
        <div className="sidebar-bottom">
          <button className="nav-item" onClick={() => setSettings(true)}>
            <Settings2 size={17} />
            Connection settings
          </button>
          <div className="profile">
            <span>SB</span>
            <div>
              <strong>Sankirth's workspace</strong>
              <small>ReTrace · v1.0</small>
            </div>
            <ShieldCheck size={16} />
          </div>
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle icon-button"
              aria-label="Toggle navigation"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={19} />
            </button>
            <span>Workspace</span>
            <ChevronRight size={13} />
            <strong>
              {page === "workspace"
                ? "Incident investigation"
                : page === "ledger"
                  ? "Failure ledger"
                  : "Learning timeline"}
            </strong>
          </div>
          <div className="header-actions">
            <span
              className={"connection " + (!sample && connected ? "online" : "")}
            >
              <i />
              {sample
                ? "Sample workspace"
                : connected
                  ? "Hindsight connected"
                  : "Backend not verified"}
            </span>
            <button
              className="icon-button"
              aria-label="Connection settings"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={17} />
            </button>
            <span className="mini-avatar">SB</span>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <div>
              <p className="eyebrow">
                {page === "workspace"
                  ? "INVESTIGATE · RECALL · LEARN"
                  : "YOUR ENGINEERING MEMORY"}
              </p>
              <h1>
                {page === "workspace"
                  ? "The next incident starts smarter."
                  : page === "ledger"
                    ? "Remember what didn’t work."
                    : "From incidents to insight."}
              </h1>
              <p>
                {page === "workspace"
                  ? "Investigate with evidence. Keep the lessons. Skip the repeated mistakes."
                  : page === "ledger"
                    ? "Verified interventions, their outcomes, and the context that matters."
                    : "A traceable history of captured resolutions and memory writes."}
              </p>
            </div>
            <button
              className="button secondary compact"
              onClick={() => {
                go("workspace");
                setResolve(true);
              }}
            >
              <Plus size={16} />
              Record resolution
            </button>
          </div>
          <div className={"mode-banner " + (!sample ? "live-banner" : "")}>
            <FlaskConical size={17} />
            <div>
              <strong>
                {sample ? "Synthetic sample mode" : "Live backend mode"}
              </strong>
              <span>
                {sample
                  ? "Explore the workflow with local sample lessons. No Hindsight calls are made."
                  : "Memory results come from your configured backend. Sample lessons are excluded."}
              </span>
            </div>
            <button
              onClick={() =>
                sample
                  ? setSettings(true)
                  : (setSample(true), setAnalysis(null), setConnected(false))
              }
            >
              {sample ? "Connect Hindsight" : "Use sample mode"}
              <ArrowUpRight size={14} />
            </button>
          </div>
          {error && (
            <div role="alert" className="alert error">
              <TriangleAlert size={17} />
              <span>{error}</span>
              <button
                className="icon-button"
                aria-label="Dismiss error"
                onClick={() => setError("")}
              >
                <X size={16} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="alert success">
              <CheckCircle2 size={17} />
              {notice}
            </div>
          )}
          <section className="stats">
            <div>
              <IconBadge>
                <Database size={18} />
              </IconBadge>
              <div>
                <span>
                  {sample ? "Sample lessons" : "Retained resolutions"}
                </span>
                <strong>
                  {activeEntries.length.toString().padStart(2, "0")}
                </strong>
              </div>
              <small>{sample ? "local fixtures" : "confirmed writes"}</small>
            </div>
            <div>
              <IconBadge tone="amber">
                <TriangleAlert size={18} />
              </IconBadge>
              <div>
                <span>Verified failed interventions</span>
                <strong>{failed.toString().padStart(2, "0")}</strong>
              </div>
              <small>context preserved</small>
            </div>
            <div>
              <IconBadge tone="blue">
                <GitCompareArrows size={18} />
              </IconBadge>
              <div>
                <span>Evidence-backed changes</span>
                <strong>
                  {(analysis?.changes.length || 0).toString().padStart(2, "0")}
                </strong>
              </div>
              <small>this investigation</small>
            </div>
          </section>
          {page === "workspace" && (
            <>
              <div className="workspace-grid">
                <section className="incident-panel panel">
                  <div className="panel-header">
                    <div>
                      <span className="section-number">01</span>
                      <h2>Incident workspace</h2>
                    </div>
                    <span className="tag neutral">
                      {sample ? "SYNTHETIC" : "CURRENT INPUT"}
                    </span>
                  </div>
                  <div className="scenario-bar">
                    <label htmlFor="scenario">Start with a scenario</label>
                    <div className="select-wrap">
                      <select
                        id="scenario"
                        disabled={busy}
                        value={scenario}
                        onChange={(e) => chooseScenario(e.target.value)}
                      >
                        {scenarios.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={14} />
                    </div>
                  </div>
                  <div className="incident-body">
                    <div className="incident-meta">
                      <span
                        className={
                          "severity " + incident.severity.toLowerCase()
                        }
                      >
                        <i />
                        {incident.severity}
                      </span>
                      <span className="mono">{incident.service}</span>
                      <span className="environment">
                        {incident.environment}
                      </span>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => setEditing(!editing)}
                      >
                        {editing ? "Close editor" : "Edit incident"}
                        <ArrowUpRight size={13} />
                      </button>
                    </div>
                    {editing ? (
                      <form
                        className="incident-editor"
                        onSubmit={(e) => {
                          e.preventDefault();
                          void investigate();
                        }}
                      >
                        <label>
                          Incident title
                          <input
                            required
                            minLength={5}
                            maxLength={200}
                            value={incident.title}
                            onChange={(e) =>
                              setIncident({
                                ...incident,
                                title: e.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="field-row">
                          <label>
                            Service
                            <input
                              required
                              minLength={2}
                              maxLength={100}
                              value={incident.service}
                              onChange={(e) =>
                                setIncident({
                                  ...incident,
                                  service: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            Environment
                            <select
                              value={incident.environment}
                              onChange={(e) =>
                                setIncident({
                                  ...incident,
                                  environment: e.target
                                    .value as Incident["environment"],
                                })
                              }
                            >
                              {["production", "staging", "development"].map(
                                (v) => (
                                  <option key={v}>{v}</option>
                                ),
                              )}
                            </select>
                          </label>
                          <label>
                            Severity
                            <select
                              value={incident.severity}
                              onChange={(e) =>
                                setIncident({
                                  ...incident,
                                  severity: e.target
                                    .value as Incident["severity"],
                                })
                              }
                            >
                              {["SEV1", "SEV2", "SEV3"].map((v) => (
                                <option key={v}>{v}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label>
                          Symptoms
                          <textarea
                            required
                            minLength={10}
                            maxLength={8000}
                            value={incident.symptoms}
                            onChange={(e) =>
                              setIncident({
                                ...incident,
                                symptoms: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          Error logs
                          <textarea
                            className="mono"
                            maxLength={16000}
                            value={incident.logs}
                            onChange={(e) =>
                              setIncident({ ...incident, logs: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          Additional context
                          <textarea
                            maxLength={4000}
                            value={incident.context}
                            onChange={(e) =>
                              setIncident({
                                ...incident,
                                context: e.target.value,
                              })
                            }
                          />
                        </label>
                        <button className="button primary" disabled={busy}>
                          Save & investigate
                          <ArrowRight size={15} />
                        </button>
                      </form>
                    ) : (
                      <>
                        <h3 className="incident-title">{incident.title}</h3>
                        <p className="symptoms">{incident.symptoms}</p>
                        <div className="log-window">
                          <div>
                            <Terminal size={13} />
                            <span>ERROR LOGS</span>
                            <span className="log-dots">•••</span>
                          </div>
                          <pre>
                            {incident.logs || "No error logs provided."}
                          </pre>
                        </div>
                        <div className="context-note">
                          <Activity size={15} />
                          <p>
                            {incident.context ||
                              "No additional context provided."}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="investigate-bar">
                    <label className="switch-label">
                      <input
                        type="checkbox"
                        checked={useMemory}
                        onChange={(e) => setUseMemory(e.target.checked)}
                        role="switch"
                      />
                      <span className="switch" />
                      Use incident memory
                    </label>
                    <button
                      className="button primary"
                      disabled={busy || editing}
                      onClick={() => void investigate()}
                    >
                      {busy ? (
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Zap size={16} />
                      )}{" "}
                      {busy ? "Investigating…" : "Investigate incident"}
                      {!busy && <ArrowRight size={16} />}
                    </button>
                  </div>
                </section>
                <aside className="context-panel">
                  <div className="memory-card">
                    <div className="memory-art">
                      <div className="art-node n1" />
                      <div className="art-node n2" />
                      <div className="art-node n3" />
                      <div className="art-node n4" />
                      <div className="art-core">
                        <Layers3 size={32} />
                      </div>
                      <span className="art-orbit" />
                      <span className="art-orbit two" />
                    </div>
                    <span className="tag teal">FAILURE-AWARE MEMORY</span>
                    <h3>
                      Your team has
                      <br />
                      seen this before.
                    </h3>
                    <p>
                      Bring yesterday’s failed fixes into today’s
                      investigation—with the evidence attached.
                    </p>
                    <div className="memory-check">
                      <Check size={14} />
                      Verified outcomes only
                    </div>
                    <div className="memory-check">
                      <Check size={14} />
                      Historical context preserved
                    </div>
                    <div className="memory-check">
                      <Check size={14} />
                      Human decisions, always
                    </div>
                  </div>
                  <div className="advisory-note">
                    <ShieldCheck size={18} />
                    <div>
                      <strong>Advice. Never execution.</strong>
                      <p>
                        Recommendations need your review. ReTrace has no access
                        to your infrastructure.
                      </p>
                    </div>
                  </div>
                </aside>
              </div>
              <section className="results-section" ref={evidenceRef}>
                <div className="results-heading">
                  <div>
                    <span className="section-number">02</span>
                    <h2>Investigation results</h2>
                    {analysis && (
                      <span className="tag neutral">
                        {sample
                          ? "SAMPLE ANALYSIS"
                          : analysis.memory_status.toUpperCase()}
                      </span>
                    )}
                  </div>
                  {analysis && (
                    <button
                      className="text-button"
                      onClick={exportInvestigation}
                    >
                      <Download size={14} />
                      Export JSON
                    </button>
                  )}
                </div>
                <div
                  className="tabs"
                  role="tablist"
                  aria-label="Investigation views"
                >
                  {(
                    [
                      {
                        id: "investigation",
                        icon: Activity,
                        label: "Investigation",
                      },
                      {
                        id: "evidence",
                        icon: Database,
                        label: "Memory evidence",
                      },
                      {
                        id: "comparison",
                        icon: GitCompareArrows,
                        label: "Memory comparison",
                      },
                    ] as const
                  ).map((t) => (
                    <button
                      role="tab"
                      aria-selected={tab === t.id}
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={tab === t.id ? "active" : ""}
                    >
                      <t.icon size={15} />
                      {t.label}
                      {t.id === "evidence" && analysis && (
                        <span>{analysis.evidence.length}</span>
                      )}
                    </button>
                  ))}
                </div>
                {!analysis ? (
                  <div className="results-empty">
                    <div className="empty-orbit">
                      <Search size={24} />
                    </div>
                    <h3>A clearer path starts with context.</h3>
                    <p>
                      Run an investigation to compare current-input triage with
                      <br className="desktop-break" /> lessons from{" "}
                      {sample
                        ? "the sample incident library"
                        : "your Hindsight memory bank"}
                      .
                    </p>
                    <div className="flow-pills">
                      <span>Current incident</span>
                      <ArrowRight size={13} />
                      <span>Historical evidence</span>
                      <ArrowRight size={13} />
                      <span>Better questions</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div
                      className={
                        "analysis-status " +
                        (analysis.memory_status === "unavailable"
                          ? "warning"
                          : "")
                      }
                    >
                      <span className="status-dot" />
                      {analysis.message}
                      <span className="elapsed">{analysis.elapsed_ms} ms</span>
                    </div>
                    {tab === "investigation" && (
                      <div className="analysis-grid">
                        <div className="panel findings">
                          <div className="panel-header">
                            <h3>Investigation hypotheses</h3>
                            <span className="tag amber">UNVERIFIED</span>
                          </div>
                          {analysis.with_memory.causes.map((c, i) => (
                            <div className="hypothesis" key={i}>
                              <span>{String(i + 1).padStart(2, "0")}</span>
                              <p>{c}</p>
                            </div>
                          ))}
                          {analysis.reflection && (
                            <div className="reflection">
                              <strong>
                                Hindsight reflection · generated hypothesis
                              </strong>
                              <p>{analysis.reflection}</p>
                              <small>
                                Generated separately from the source-verified
                                ledger. Not a confirmed finding.
                              </small>
                            </div>
                          )}
                        </div>
                        <div className="panel findings">
                          <div className="panel-header">
                            <h3>Recommended next steps</h3>
                            <span className="tag neutral">HUMAN REVIEW</span>
                          </div>
                          {analysis.with_memory.steps.map((s, i) => (
                            <StepCard
                              step={s}
                              key={i}
                              onEvidence={viewEvidence}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    {tab === "evidence" && (
                      <div className="evidence-grid">
                        {analysis.evidence.length ? (
                          analysis.evidence.map((e) => (
                            <button
                              className="panel evidence-card"
                              key={e.memory_id}
                              onClick={() => setSelected(e)}
                            >
                              <div>
                                <span className="mono">
                                  {e.record?.incident_id || "SOURCE SNIPPET"}
                                </span>
                                <ArrowUpRight size={16} />
                              </div>
                              <h3>
                                {e.record?.incident.title || "Retrieved memory"}
                              </h3>
                              <p>{e.text}</p>
                              <footer>
                                <span className="tag teal">
                                  {sample ? "LOCAL SAMPLE" : "HINDSIGHT RECALL"}
                                </span>
                                <span>
                                  {e.record
                                    ? "View resolution"
                                    : "View evidence"}
                                </span>
                              </footer>
                            </button>
                          ))
                        ) : (
                          <Empty
                            title="No historical evidence"
                            detail="No memory was returned for this investigation. ReTrace has kept its response at current-input triage."
                          />
                        )}
                      </div>
                    )}
                    {tab === "comparison" && (
                      <div className="comparison-grid">
                        <div className="panel comparison">
                          <div className="compare-label">
                            <span className="compare-dot" />
                            WITHOUT MEMORY<span>Baseline</span>
                          </div>
                          <h3>Starting with the current symptoms.</h3>
                          <p className="comparison-note">
                            Deterministic triage. No historical records, recall,
                            or reflection.
                          </p>
                          {analysis.baseline.steps.map((s, i) => (
                            <StepCard
                              key={i}
                              step={s}
                              onEvidence={viewEvidence}
                            />
                          ))}
                        </div>
                        <div className="panel comparison memory-on">
                          <div className="compare-label">
                            <span className="compare-dot" />
                            WITH {sample ? "SAMPLE " : "HINDSIGHT "}MEMORY
                            <span>{analysis.changes.length} changes</span>
                          </div>
                          <h3>
                            {analysis.changes.length
                              ? "Historical outcomes change the questions."
                              : "No supported historical change yet."}
                          </h3>
                          <p className="comparison-note">
                            {sample
                              ? "Local sample results; this is not a live Hindsight comparison."
                              : "Changes below require retrieved source documents and compatible incident context."}
                          </p>
                          {analysis.changes.length ? (
                            analysis.changes.map((s, i) => (
                              <StepCard
                                key={i}
                                step={s}
                                onEvidence={viewEvidence}
                              />
                            ))
                          ) : (
                            <p className="no-changes">
                              ReTrace abstained from inventing historical
                              advice.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="limitations">
                      <ShieldCheck size={16} />
                      <div>
                        {analysis.limitations.map((l) => (
                          <p key={l}>{l}</p>
                        ))}
                      </div>
                    </div>
                    <div className="learn-cta">
                      <IconBadge>
                        <History size={20} />
                      </IconBadge>
                      <div>
                        <h3>Resolved it? Close the learning loop.</h3>
                        <p>
                          Record what worked—and what didn’t—for the next
                          investigation.
                        </p>
                      </div>
                      <button
                        className="button secondary"
                        onClick={() => setResolve(true)}
                      >
                        Record resolution
                        <ArrowRight size={15} />
                      </button>
                    </div>
                  </>
                )}
              </section>
            </>
          )}
          {page === "ledger" && (
            <section className="panel ledger-panel">
              <div className="panel-header">
                <h2>Intervention ledger</h2>
                <label className="search-field">
                  <Search size={15} />
                  <input
                    aria-label="Filter interventions"
                    placeholder="Filter interventions…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </label>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>INTERVENTION</th>
                      <th>SERVICE / SOURCE</th>
                      <th>OUTCOME</th>
                      <th>WHAT WE LEARNED</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger
                      .flatMap((r) =>
                        r.attempts.map((a) => ({ ...a, record: r })),
                      )
                      .filter((a) =>
                        (
                          a.action +
                          " " +
                          a.record.incident.service +
                          " " +
                          a.explanation
                        )
                          .toLowerCase()
                          .includes(filter.toLowerCase()),
                      )
                      .map((a, i) => (
                        <tr key={i}>
                          <td>
                            <strong>{a.action}</strong>
                            <small>
                              {a.verified ? "Engineer verified" : "Unverified"}
                            </small>
                          </td>
                          <td>
                            <span className="mono">
                              {a.record.incident.service}
                            </span>
                            <small>{a.record.incident_id}</small>
                          </td>
                          <td>
                            <span className={"outcome " + a.outcome}>
                              {a.outcome === "failed" ? (
                                <X size={12} />
                              ) : a.outcome === "succeeded" ? (
                                <Check size={12} />
                              ) : (
                                <Clock3 size={12} />
                              )}{" "}
                              {a.outcome}
                            </span>
                          </td>
                          <td>{a.explanation}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {!sample && !analysis?.evidence.some((e) => e.record) && (
                <Empty
                  title="Investigate to retrieve your ledger"
                  detail="Live intervention details are shown only when Hindsight returns their source resolutions. Run an investigation first."
                />
              )}
              <div className="ledger-foot">
                <ShieldCheck size={14} />A past failure is context, not a
                universal prohibition.
              </div>
            </section>
          )}
          {page === "timeline" && (
            <section className="panel timeline-panel">
              <div className="panel-header">
                <h2>Resolution history</h2>
                <span className="tag neutral">
                  {sample ? "LOCAL SAMPLES" : "LOCAL WRITE AUDIT"}
                </span>
              </div>
              {entries.length ? (
                entries.map((e) => (
                  <article className="timeline-event" key={e.incident_id}>
                    <div className={"timeline-dot " + e.status}>
                      <Check size={13} />
                    </div>
                    <div>
                      <div className="timeline-top">
                        <span className="mono">{e.incident_id}</span>
                        <span
                          className={
                            "tag " +
                            (e.status === "retained" ? "teal" : "neutral")
                          }
                        >
                          {e.status}
                        </span>
                        <time>{new Date(e.recorded_at).toLocaleString()}</time>
                      </div>
                      <h3>{e.title}</h3>
                      <p>{e.root_cause}</p>
                      <div className="timeline-tags">
                        <span>{e.service}</span>
                        <span>{e.failed_count} verified failed</span>
                        <span>{e.succeeded_count} verified successful</span>
                        <span>
                          {e.synthetic ? "Synthetic" : "User provided"}
                        </span>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <Empty
                  title="No resolutions recorded here yet"
                  detail="Confirmed submissions will appear with their actual Hindsight write status. Existing remote memories are not automatically imported into this audit."
                />
              )}
            </section>
          )}
          <footer className="page-footer">
            <span>
              <span className="footer-mark">↳</span> ReTrace{" "}
              <span className="footer-divider">/</span> Incident intelligence
              that remembers what failed.
            </span>
            <span>
              {sample
                ? "Synthetic data · Local sample mode"
                : "Advisory only · Human verified outcomes"}
            </span>
          </footer>
        </div>
      </main>
      {settings && (
        <SettingsModal
          sample={sample}
          request={request}
          onClose={() => setSettings(false)}
          onLive={() => {
            setSample(false);
            setAnalysis(null);
            setConnected(true);
            setSettings(false);
            setError("");
          }}
          onSample={() => {
            setSample(true);
            setAnalysis(null);
            setSettings(false);
          }}
          reflect={reflect}
          setReflect={setReflect}
        />
      )}
      {resolve && (
        <ResolutionModal
          incident={incident}
          sample={sample}
          onClose={() => setResolve(false)}
          onSave={saveResolution}
        />
      )}
      {selected && (
        <Modal title="Source evidence" onClose={() => setSelected(null)}>
          <div className="source-meta">
            <span className="tag teal">
              {sample ? "LOCAL SAMPLE" : "LIVE RECALL"}
            </span>
            <code>{selected.document_id || selected.memory_id}</code>
          </div>
          <h3>
            {selected.record?.incident.title || "Retrieved memory snippet"}
          </h3>
          <blockquote>{selected.text}</blockquote>
          {selected.limitation && (
            <p className="source-limitation">{selected.limitation}</p>
          )}
          {selected.record && (
            <>
              <dl className="source-details">
                <dt>Recorded root cause</dt>
                <dd>{selected.record.root_cause}</dd>
                <dt>Source context</dt>
                <dd>
                  {selected.record.incident.service} ·{" "}
                  {selected.record.incident.environment} ·{" "}
                  {new Date(selected.record.recorded_at).toLocaleString()}
                </dd>
                <dt>Provenance</dt>
                <dd>
                  {selected.record.source} ·{" "}
                  {selected.record.synthetic
                    ? "synthetic data"
                    : "user supplied"}
                </dd>
              </dl>
              {selected.record.attempts.map((a, i) => (
                <div className="source-attempt" key={i}>
                  <span className={"outcome " + a.outcome}>{a.outcome}</span>
                  <strong>{a.action}</strong>
                  <p>{a.explanation}</p>
                  <small>
                    {a.verified ? "Engineer verified" : "Unverified"}
                  </small>
                </div>
              ))}
              <p className="source-limitation">
                Lesson: {selected.record.lessons}
              </p>
            </>
          )}
          <small className="mono source-id">
            Evidence ID: {selected.memory_id}
          </small>
        </Modal>
      )}
    </div>
  );
}
function StepCard({
  step,
  onEvidence,
}: {
  step: Step;
  onEvidence: (s: string) => void;
}) {
  return (
    <article className={"step-card " + step.kind}>
      <div className="step-heading">
        {step.kind === "historical-failure" ? (
          <TriangleAlert size={16} />
        ) : step.kind === "historical-success" ? (
          <CheckCircle2 size={16} />
        ) : (
          <Search size={16} />
        )}
        <strong>{step.title}</strong>
      </div>
      <p>{step.detail}</p>
      {step.evidence_ids.map((id) => (
        <button
          className="evidence-link"
          key={id}
          onClick={() => onEvidence(id)}
        >
          <Database size={12} />
          Source evidence
          <ArrowUpRight size={12} />
        </button>
      ))}
    </article>
  );
}
function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement;
    ref.current?.focus();
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = old;
      prev?.focus();
    };
  }, []);
  return (
    <div
      className="modal-overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        tabIndex={-1}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(e) => {
          if (e.key === "Escape") onClose();
          if (e.key === "Tab") {
            const list = ref.current?.querySelectorAll<HTMLElement>(
              "button,input,textarea,select,a[href]",
            );
            if (list?.length) {
              const first = list[0],
                last = list[list.length - 1];
              if (
                e.shiftKey &&
                (document.activeElement === first ||
                  document.activeElement === ref.current)
              ) {
                last.focus();
                e.preventDefault();
              } else if (!e.shiftKey && document.activeElement === last) {
                first.focus();
                e.preventDefault();
              }
            }
          }
        }}
      >
        <div className="modal-header">
          <h2>{title}</h2>
          <button
            className="icon-button"
            aria-label="Close dialog"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
function SettingsModal({
  sample,
  request,
  onClose,
  onLive,
  onSample,
  reflect,
  setReflect,
}: {
  sample: boolean;
  request: <T>(path: string, body?: unknown) => Promise<T>;
  onClose: () => void;
  onLive: () => void;
  onSample: () => void;
  reflect: boolean;
  setReflect: (v: boolean) => void;
}) {
  const [url, setUrl] = useState(apiBase()),
    [token, setToken] = useState(sessionStorage.getItem("retrace-token") || ""),
    [working, setWorking] = useState(false),
    [err, setErr] = useState("");
  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setErr("");
    try {
      const normalized = url.trim().replace(/\/$/, "");
      if (normalized) {
        const u = new URL(normalized);
        if (
          !["http:", "https:"].includes(u.protocol) ||
          u.username ||
          u.password ||
          u.search ||
          u.hash ||
          u.pathname !== "/"
        )
          throw new Error(
            "Use an API origin such as https://retrace-api.onrender.com, without paths or credentials.",
          );
      }
      localStorage.setItem("retrace-api-url", normalized);
      sessionStorage.setItem("retrace-token", token);
      await request("/api/memory/status");
      onLive();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <Modal title="Connect your memory" onClose={onClose}>
      <p className="modal-intro">
        Connect this workspace to your FastAPI backend. The Hindsight API key
        stays on the server.
      </p>
      <form onSubmit={(e) => void connect(e)}>
        <label>
          Backend URL
          <input
            type="url"
            placeholder="http://localhost:8000"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <small>
            Leave empty when this site and its API share a host, including the
            full Render deployment. For a separate backend, enter its HTTPS
            origin.
          </small>
        </label>
        <label>
          ReTrace access token{" "}
          <span className="optional">optional locally</span>
          <input
            type="password"
            autoComplete="off"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Matches RETRACE_API_TOKEN on your backend"
          />
          <small>
            Stored for this browser session. This is not your Hindsight API key.
          </small>
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={reflect}
            onChange={(e) => setReflect(e.target.checked)}
          />
          Request Hindsight reflection after recall
        </label>
        <p className="field-help">
          Optional generated hypotheses. Uses additional credits.
          Source-verified recommendations work without it.
        </p>
        {err && (
          <div className="alert error" role="alert">
            {err}
          </div>
        )}
        <button className="button primary full" disabled={working}>
          {working ? (
            <LoaderCircle size={15} className="spin" />
          ) : (
            <Database size={15} />
          )}{" "}
          {working ? "Verifying existing bank…" : "Verify & use live backend"}
        </button>
      </form>
      <div className="modal-separator">or explore the interface</div>
      <button className="button secondary full" onClick={onSample}>
        <FlaskConical size={15} />
        {sample ? "Continue in sample mode" : "Switch to sample mode"}
      </button>
      <div className="connection-help">
        <strong>First time setup</strong>
        <p>
          Set the exact Hindsight bank ID and API key in your backend service
          environment, or in <code>backend/.env</code> when running locally.
          ReTrace verifies the existing bank and never creates another.
        </p>
      </div>
    </Modal>
  );
}
function ResolutionModal({
  incident,
  sample,
  onClose,
  onSave,
}: {
  incident: Incident;
  sample: boolean;
  onClose: () => void;
  onSave: (r: Resolution) => Promise<void>;
}) {
  const [id, setId] = useState("INC-" + Date.now().toString(36).toUpperCase()),
    [root, setRoot] = useState(""),
    [lessons, setLessons] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [synthetic, setSynthetic] = useState(true);
  const [attempts, setAttempts] = useState<Attempt[]>([
      { action: "", outcome: "failed", explanation: "", verified: false },
    ]),
    [working, setWorking] = useState(false),
    [err, setErr] = useState("");
  function update(i: number, patch: Partial<Attempt>) {
    setAttempts(attempts.map((a, n) => (n === i ? { ...a, ...patch } : a)));
  }
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setWorking(true);
    setErr("");
    try {
      await onSave({
        incident_id: id,
        incident,
        root_cause: root,
        lessons,
        attempts,
        confirmed,
        synthetic: sample || synthetic,
      });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setWorking(false);
    }
  }
  return (
    <Modal title="Record a verified resolution" onClose={onClose}>
      <p className="modal-intro">
        Capture what actually happened for <strong>{incident.service}</strong>.{" "}
        {sample
          ? "This lesson will stay in your local sample workspace."
          : "Confirmation sends this resolution to Hindsight."}
      </p>
      <form onSubmit={(e) => void save(e)}>
        <label>
          Incident ID
          <input
            required
            pattern="[a-zA-Z0-9_-]{3,80}"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <small>Keep this ID for retries. A new finding needs a new ID.</small>
        </label>
        <label>
          Confirmed root cause
          <textarea
            required
            minLength={10}
            maxLength={3000}
            value={root}
            onChange={(e) => setRoot(e.target.value)}
            placeholder="Describe the verified cause and how you confirmed it."
          />
        </label>
        <div className="attempts-label">
          <h3>Interventions & outcomes</h3>
          <button
            type="button"
            className="text-button"
            disabled={attempts.length >= 15}
            onClick={() =>
              setAttempts([
                ...attempts,
                {
                  action: "",
                  outcome: "inconclusive",
                  explanation: "",
                  verified: false,
                },
              ])
            }
          >
            <Plus size={14} />
            Add attempt
          </button>
        </div>
        {attempts.map((a, i) => (
          <div className="attempt-editor" key={i}>
            <div className="field-row">
              <label>
                Intervention
                <input
                  required
                  minLength={3}
                  maxLength={500}
                  value={a.action}
                  onChange={(e) => update(i, { action: e.target.value })}
                />
              </label>
              <label>
                Outcome
                <select
                  value={a.outcome}
                  onChange={(e) =>
                    update(i, { outcome: e.target.value as Attempt["outcome"] })
                  }
                >
                  <option value="failed">Failed</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="inconclusive">Inconclusive</option>
                </select>
              </label>
            </div>
            <label>
              Observed result
              <textarea
                required
                minLength={5}
                maxLength={1500}
                value={a.explanation}
                onChange={(e) => update(i, { explanation: e.target.value })}
              />
            </label>
            <div className="attempt-footer">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={a.verified}
                  onChange={(e) => update(i, { verified: e.target.checked })}
                />
                I verified this outcome
              </label>
              {attempts.length > 1 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() =>
                    setAttempts(attempts.filter((_, n) => n !== i))
                  }
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <label>
          Lesson for the next investigation
          <textarea
            required
            minLength={10}
            maxLength={3000}
            value={lessons}
            onChange={(e) => setLessons(e.target.value)}
            placeholder="What should the next engineer check or reconsider?"
          />
        </label>
        {!sample && (
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={synthetic}
              onChange={(e) => setSynthetic(e.target.checked)}
            />
            This incident uses synthetic data
          </label>
        )}
        <label className="checkbox-label confirmation">
          <input
            required
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
          />
          <span>
            I confirm the root cause and facts are accurate. Unverified
            interventions remain marked as unverified.
          </span>
        </label>
        {err && (
          <div role="alert" className="alert error">
            {err}
          </div>
        )}
        <button
          className="button primary full"
          disabled={working || !confirmed}
        >
          {working ? (
            <LoaderCircle className="spin" size={15} />
          ) : (
            <ShieldCheck size={15} />
          )}{" "}
          {working
            ? "Saving resolution…"
            : sample
              ? "Save sample lesson"
              : "Confirm & retain in Hindsight"}
        </button>
      </form>
    </Modal>
  );
}
export default App;
