import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";
import { apiV1BaseUrl, fetchJson } from "../lib/api";

type SentinelAlert = {
  timestamp_utc: string;
  headline: string;
  impact: string;
  severity: "low" | "medium" | "high" | "critical";
  action: string;
};

type SentinelResponse = {
  vulnerability_score: number;
  aggregate_impact: string;
  auto_mitigation_ready: boolean;
  alerts: SentinelAlert[];
};

type AlertsNewsResponse = {
  workflow: string;
  generated_at: string;
  focus_alert: string | null;
  summary: string;
  highlights: string[];
  actions: string[];
  raw_result: Record<string, unknown>;
};

export function SentinelPage() {
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [sentinel, setSentinel] = useState<SentinelResponse | null>(null);
  const [newsBrief, setNewsBrief] = useState<AlertsNewsResponse | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAlerts() {
      setLoading(true);
      setPageError(null);

      try {
        const response = await fetchJson<SentinelResponse>(`${apiV1BaseUrl}/sentinel/alerts`);
        if (cancelled) {
          return;
        }
        setSentinel(response);
        setSelectedAlert(response.alerts[0]?.headline ?? null);
      } catch {
        if (!cancelled) {
          setPageError("No alerts are available right now. Make sure the backend is running and your portfolio data has been loaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAlerts();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadNewsBrief() {
      if (!selectedAlert) {
        return;
      }
      setNewsLoading(true);
      try {
        const response = await fetchJson<AlertsNewsResponse>(
          `${apiV1BaseUrl}/alerts/news?focus_alert=${encodeURIComponent(selectedAlert)}`,
        );
        if (!cancelled) {
          setNewsBrief(response);
        }
      } catch {
        if (!cancelled) {
          setNewsBrief(null);
        }
      } finally {
        if (!cancelled) {
          setNewsLoading(false);
        }
      }
    }

    void loadNewsBrief();
    return () => {
      cancelled = true;
    };
  }, [selectedAlert]);

  const selectedAlertDetails = useMemo(() => {
    return sentinel?.alerts.find((alert) => alert.headline === selectedAlert) ?? sentinel?.alerts[0] ?? null;
  }, [selectedAlert, sentinel?.alerts]);

  return (
    <AppShell
      topNav={[
        { label: "Dashboard", href: "/command-center" },
        { label: "Portfolio", href: "/auditor" },
        { label: "Insights", href: "/sentinel" },
        { label: "Settings", href: "/connect" },
      ]}
      metricValue={loading ? "Loading alerts..." : sentinel ? `${sentinel.vulnerability_score} / 100` : "No data available"}
      rightSlot={
        <button
          type="button"
          onClick={() => setSelectedAlert(sentinel?.alerts[0]?.headline ?? null)}
          className="rounded-full bg-surface-bright p-2 transition hover:scale-95"
        >
          <MaterialIcon name="notifications_active" className="text-white" fill />
        </button>
      }
    >
      <div className="mx-auto max-w-7xl">
        {pageError ? (
          <Panel className="mb-8 border border-error/20 bg-error/10 p-5 text-sm text-error">
            {pageError}
          </Panel>
        ) : null}

        <header className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-tertiary">Sentinel Protocol Active</span>
            <h1 className="text-5xl font-black tracking-[-0.05em] text-white lg:text-7xl">ZENITH SENTINEL</h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-on-surface-variant">
              Click any live alert to pull a workflow-backed risk and news brief from your master AI system.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface-container p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">Aggregate Impact</div>
            <div className="mt-2 text-2xl font-black text-white">{sentinel?.aggregate_impact ?? "No data available"}</div>
            <div className="mt-2 text-xs uppercase tracking-[0.16em] text-tertiary">
              Auto-Mitigation {sentinel?.auto_mitigation_ready ? "Ready" : "Unavailable"}
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant">Live Impact Feed</h3>
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                <span className="h-2 w-2 rounded-full bg-tertiary" />
                Workflow Linked
              </span>
            </div>
            {sentinel?.alerts?.length ? sentinel.alerts.map((alert) => {
              const selected = selectedAlert === alert.headline;
              return (
                <button
                  key={alert.headline}
                  type="button"
                  onClick={() => setSelectedAlert(alert.headline)}
                  className={`w-full text-left ${selected ? "ring-1 ring-tertiary/35" : ""}`}
                >
                  <Panel className="cursor-pointer p-6 transition hover:bg-white/5">
                    <div className="mb-4 flex items-start justify-between">
                      <span className="text-[10px] font-mono text-neutral-500">{formatUtcTime(alert.timestamp_utc)}</span>
                      <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-tight ${severityClassName(alert.severity)}`}>
                        {alert.impact}
                      </span>
                    </div>
                    <h4 className="text-xl font-bold leading-tight text-white">{alert.headline}</h4>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      Action: {compactText(alert.action.replace(/_/g, " "), 44)}. Click to fetch the AI news brief.
                    </p>
                  </Panel>
                </button>
              );
            }) : (
              <Panel className="p-6 text-sm text-on-surface-variant">No data available.</Panel>
            )}
          </section>

          <section className="space-y-6 lg:col-span-7">
            <Panel className="relative overflow-hidden p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(111,251,190,0.08),transparent_45%)] opacity-80" />
              <div className="relative z-10">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant">AI News Brief</h3>
                    <p className="mt-2 text-sm text-on-surface-variant">
                      {newsBrief ? `Source: ${newsBrief.workflow} • Generated ${formatUtcTime(newsBrief.generated_at)}` : "Waiting for alert selection"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAlert(selectedAlertDetails?.headline ?? null)}
                    className="rounded-2xl border border-white/10 bg-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-white/20"
                  >
                    {newsLoading ? "Refreshing" : "Refresh Brief"}
                  </button>
                </div>

                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-6">
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Focus Alert</p>
                      <h4 className="mt-2 text-2xl font-bold text-white">{selectedAlertDetails?.headline ?? "No alert selected"}</h4>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                      {selectedAlertDetails?.severity ?? "idle"}
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    {newsLoading
                      ? "Building a fresh workflow-backed news brief..."
                      : compactText(newsBrief?.summary ?? "Select an alert to generate a master-agent briefing.", 180)}
                  </p>
                </div>

                <div className="mt-6 grid gap-6 md:grid-cols-2">
                  <Panel className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">Market Highlights</h4>
                      <MaterialIcon name="newspaper" className="text-xl text-tertiary" />
                    </div>
                    <div className="space-y-3">
                      {newsBrief?.highlights?.length ? newsBrief.highlights.map((highlight) => (
                        <div key={highlight} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white">
                          {compactText(highlight, 120)}
                        </div>
                      )) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-on-surface-variant">
                          No data available.
                        </div>
                      )}
                    </div>
                  </Panel>

                  <Panel className="p-6">
                    <div className="mb-4 flex items-center justify-between">
                      <h4 className="text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">Action Queue</h4>
                      <MaterialIcon name="bolt" className="text-xl text-white" />
                    </div>
                    <div className="space-y-3">
                      {newsBrief?.actions?.length ? newsBrief.actions.map((action) => (
                        <div key={action} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-tertiary/15 text-tertiary">
                              <MaterialIcon name="arrow_outward" className="text-lg" />
                            </div>
                            <p className="text-sm leading-relaxed text-white">{compactText(action, 96)}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] p-4 text-sm text-on-surface-variant">
                          No action items returned yet.
                        </div>
                      )}
                    </div>
                  </Panel>
                </div>
              </div>
            </Panel>

            <Panel className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant">Portfolio Risk Snapshot</h3>
                <MaterialIcon name="monitor_heart" className="text-xl text-white" />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <MetricTile label="Vulnerability Score" value={sentinel ? `${sentinel.vulnerability_score} / 100` : "No data"} />
                <MetricTile label="Aggregate Impact" value={sentinel?.aggregate_impact ?? "No data"} />
                <MetricTile label="Workflow Focus" value={newsBrief?.focus_alert ?? "No alert selected"} />
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function MetricTile(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{props.label}</div>
      <div className="mt-2 text-lg font-bold text-white">{props.value}</div>
    </div>
  );
}

function severityClassName(severity: SentinelAlert["severity"]) {
  if (severity === "critical") {
    return "border border-error/30 bg-error/10 text-error";
  }
  if (severity === "high") {
    return "border border-orange-400/30 bg-orange-400/10 text-orange-300";
  }
  if (severity === "medium") {
    return "border border-secondary/30 bg-secondary/10 text-secondary";
  }
  return "border border-tertiary/20 bg-tertiary/10 text-tertiary";
}

function formatUtcTime(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }
  return date.toLocaleString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function compactText(value: string, maxLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const clipped = normalized.slice(0, maxLength - 1);
  const lastSpace = clipped.lastIndexOf(" ");
  return `${(lastSpace > 40 ? clipped.slice(0, lastSpace) : clipped).trim()}...`;
}
