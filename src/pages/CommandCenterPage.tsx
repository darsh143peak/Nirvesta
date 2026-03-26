import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";

const zenithPurple = "#7c5cff";
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const sectorIndexNames = ["NIFTY IT", "NIFTY PHARMA", "NIFTY BANK", "NIFTY AUTO", "NIFTY FMCG", "NIFTY ENERGY"];

type OverviewStat = {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning" | "negative";
};

type OverviewResponse = {
  total_portfolio_value: string;
  monthly_surplus: string;
  risk_profile: string;
  stats: OverviewStat[];
};

type StrategySimulationResponse = {
  recommended_split: Record<string, number>;
  projected_retirement_age: number;
  wealth_at_fifty: string;
  risk_sensitivity: string;
  summary: string;
};

type AuditHolding = {
  symbol: string;
  name: string;
  badge: string;
  volatility_impact: number;
  market_value: string;
  performance: string;
};

type AuditorResponse = {
  diversification_score: number;
  annualized_risk_trend: number[];
  recommendation: {
    current_holding: string;
    suggested_holding: string;
    expected_benefit: string;
    reason: string;
  };
  holdings: AuditHolding[];
};

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

type CommandCenterResponse = {
  headlines: string[];
  signals: Array<{
    priority: string;
    title: string;
    asset: string;
    target: string;
    reasoning: string;
    action: string;
  }>;
  execution_summary: Record<string, string>;
};

type MarketIndexResponse = {
  indices: Array<{
    index: string;
    last: number;
    change: number;
    percent_change: number;
  }>;
};

export function CommandCenterPage() {
  const { profile } = useAuth();
  const [sipAmount, setSipAmount] = useState(profile?.monthly_investable_surplus ?? 4500);
  const [retirementAge, setRetirementAge] = useState(52);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [strategy, setStrategy] = useState<StrategySimulationResponse | null>(null);
  const [auditor, setAuditor] = useState<AuditorResponse | null>(null);
  const [sentinel, setSentinel] = useState<SentinelResponse | null>(null);
  const [briefing, setBriefing] = useState<CommandCenterResponse | null>(null);
  const [indices, setIndices] = useState<MarketIndexResponse["indices"]>([]);
  const fullName = profile?.full_name?.split(" ")[0] ?? "Investor";
  const hasPortfolio = Boolean(auditor?.holdings?.length);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      setLoading(true);
      setPageError(null);

      try {
        const [overviewResponse, auditorResponse, sentinelResponse, briefingResponse, indicesResponse] = await Promise.all([
          fetchJson<OverviewResponse>(`${apiBaseUrl}/overview`),
          fetchJson<AuditorResponse>(`${apiBaseUrl}/auditor/report`),
          fetchJson<SentinelResponse>(`${apiBaseUrl}/sentinel/alerts`),
          fetchJson<CommandCenterResponse>(`${apiBaseUrl}/command-center/briefing`),
          fetchJson<MarketIndexResponse>(`${apiBaseUrl}/market/indices?index_names=${encodeURIComponent(sectorIndexNames.join(","))}`),
        ]);

        if (cancelled) {
          return;
        }

        setOverview(overviewResponse);
        setAuditor(auditorResponse);
        setSentinel(sentinelResponse);
        setBriefing(briefingResponse);
        setIndices(indicesResponse.indices);
      } catch {
        if (!cancelled) {
          setPageError("No data available right now. Make sure the backend is running and a portfolio CSV has been uploaded.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadStrategy() {
      try {
        const response = await fetchJson<StrategySimulationResponse>(`${apiBaseUrl}/strategy/simulate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            monthly_surplus: sipAmount,
            risk_mode: "balanced",
          }),
        });

        if (!cancelled) {
          setStrategy(response);
        }
      } catch {
        if (!cancelled) {
          setStrategy(null);
        }
      }
    }

    void loadStrategy();
    return () => {
      cancelled = true;
    };
  }, [sipAmount]);

  const radarMetrics = useMemo(() => {
    if (!auditor || !sentinel) {
      return [];
    }

    const holdings = auditor.holdings;
    const negativeCount = holdings.filter((holding) => parsePercent(holding.performance) < 0).length;
    const etfCount = holdings.filter((holding) => holding.name.toUpperCase().includes("ETF") || holding.symbol.includes("BEES")).length;
    const averageRisk =
      holdings.length > 0 ? holdings.reduce((sum, holding) => sum + holding.volatility_impact, 0) / holdings.length : 0;

    return [
      { label: "Diversification", value: auditor.diversification_score },
      { label: "Tax Efficiency", value: clamp(45 + negativeCount * 12, 0, 100) },
      { label: "Risk vs Reward", value: clamp(100 - averageRisk * 0.6, 0, 100) },
      { label: "Goal Alignment", value: clamp(100 - sentinel.vulnerability_score / 2, 0, 100) },
      { label: "Low Fees", value: clamp(40 + etfCount * 10, 0, 100) },
    ];
  }, [auditor, sentinel]);

  const rebalanceData = useMemo(() => {
    if (!auditor?.holdings || !strategy?.recommended_split) {
      return [];
    }

    const actualBuckets = {
      equity: 0,
      debt: 0,
      gold: 0,
      international: 0,
    };

    let total = 0;
    for (const holding of auditor.holdings) {
      const value = parseCurrency(holding.market_value);
      total += value;
      const name = `${holding.symbol} ${holding.name}`.toUpperCase();
      if (name.includes("GOLD")) {
        actualBuckets.gold += value;
      } else {
        actualBuckets.equity += value;
      }
    }

    return [
      { label: "Equity", actual: total ? Math.round((actualBuckets.equity / total) * 100) : 0, target: Math.round((strategy.recommended_split.equity ?? 0) * 100), color: "#76f7bf" },
      { label: "Debt", actual: total ? Math.round((actualBuckets.debt / total) * 100) : 0, target: Math.round((strategy.recommended_split.debt ?? 0) * 100), color: "#9dc1ff" },
      { label: "Gold", actual: total ? Math.round((actualBuckets.gold / total) * 100) : 0, target: Math.round((strategy.recommended_split.gold ?? 0) * 100), color: "#ffb95f" },
      { label: "International", actual: total ? Math.round((actualBuckets.international / total) * 100) : 0, target: Math.round((strategy.recommended_split.international ?? 0) * 100), color: zenithPurple },
    ];
  }, [auditor, strategy]);

  const scatterPoints = useMemo(() => {
    if (!auditor?.holdings) {
      return [];
    }

    return auditor.holdings.map((holding) => {
      const performance = parsePercent(holding.performance);
      return {
        label: holding.symbol,
        risk: clamp(holding.volatility_impact, 5, 95),
        returns: clamp(50 + performance * 8, 5, 95),
        tone: performance < 0 ? "slacker" : performance > 1 ? "star" : "steady",
      };
    });
  }, [auditor]);

  const microInsights = useMemo(() => {
    const insights: string[] = [];
    if (overview?.risk_profile) {
      insights.push(`Portfolio stance: ${overview.risk_profile}.`);
    }
    if (briefing?.headlines?.length) {
      insights.push(...briefing.headlines.slice(0, 2));
    }
    if (sentinel?.alerts?.length) {
      insights.push(...sentinel.alerts.slice(0, 2).map((alert) => alert.headline));
    }
    return insights;
  }, [briefing, overview, sentinel]);

  const executionActions = useMemo(() => {
    if (!briefing?.signals?.length) {
      return [];
    }
    return briefing.signals.map((signal) => ({
      title: signal.title,
      subtitle: signal.reasoning,
      icon: signal.action.includes("rebalance") ? "sync_alt" : "bolt",
    }));
  }, [briefing]);

  const sectorHeatmap = useMemo(() => {
    return indices.map((index) => ({
      label: index.index.replace("NIFTY ", ""),
      value: `${index.percent_change >= 0 ? "+" : ""}${index.percent_change.toFixed(2)}%`,
      tone: index.percent_change >= 0 ? "gain" : "loss",
    }));
  }, [indices]);

  const projection = useMemo(() => {
    const principalSeries = Array.from({ length: 8 }, (_, index) => Math.round((sipAmount * 12 * (index + 1)) / 1000));
    const marketLift = sentinel ? 1 + Math.max(parseLeadingPercent(sentinel.aggregate_impact) / 100, -0.2) : 1;
    const growthMultiplier = Math.max(1.2, (2.4 - (retirementAge - 45) * 0.05) * marketLift);
    const projectedSeries = principalSeries.map((value, index) => Math.round(value * (1 + index * 0.1) * growthMultiplier));
    return { principalSeries, projectedSeries };
  }, [retirementAge, sentinel, sipAmount]);

  const projectedCorpusLakhs = projection.projectedSeries[projection.projectedSeries.length - 1] ?? 0;
  const dayMove = parseLeadingPercent(sentinel?.aggregate_impact);
  const dayPnl = overview?.stats.find((stat) => stat.label === "Day P&L")?.value;
  const totalPortfolioValue = overview?.total_portfolio_value ?? "No data available";
  const gaugeValue = auditor?.diversification_score;

  return (
    <AppShell metricLabel="Zenith Dashboard" metricValue={overview?.monthly_surplus ?? `INR ${sipAmount.toLocaleString()}/mo`}>
      <div className="mx-auto max-w-[1600px] space-y-8">
        {pageError ? (
          <Panel className="border border-error/20 bg-error/10 p-5 text-sm text-error">
            {pageError}
          </Panel>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            eyebrow="Total Portfolio Value"
            value={loading ? "Loading..." : totalPortfolioValue}
            caption={overview ? `Welcome back, ${fullName}. ${overview.risk_profile}.` : "No data available"}
            icon="account_balance_wallet"
          />
          <KpiCard
            eyebrow="Day's Gain / Loss"
            value={sentinel ? `${dayMove >= 0 ? "+" : ""}${dayMove.toFixed(2)}%` : "No data available"}
            caption={dayPnl ?? "No data available"}
            tone={dayMove >= 0 ? "gain" : "default"}
            icon="candlestick_chart"
            sparkline={sentinel ? <Sparkline positive={dayMove >= 0} /> : undefined}
          />
          <KpiCard
            eyebrow="Zenith Health Score"
            value={typeof gaugeValue === "number" ? `${gaugeValue} / 100` : "No data available"}
            caption={auditor?.recommendation.reason ?? "No data available"}
            icon="health_and_safety"
            gaugeValue={gaugeValue}
          />
          <KpiCard
            eyebrow="Execution Readiness"
            value={briefing?.signals?.length ? `${briefing.signals.length} actions` : "No data available"}
            caption={briefing?.execution_summary.market_status ?? "No data available"}
            icon="bolt"
          />
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="space-y-6">
            <section className="grid gap-6 xl:grid-cols-[1.45fr_1fr]">
              <ChartCard
                title='What-If Projection'
                description="Guaranteed savings versus projected market growth"
                help="Shows how principal builds steadily while market growth expands when you increase SIPs or give compounding more time."
                accent="purple"
              >
                {hasPortfolio && strategy ? (
                  <WhatIfProjectionChart
                    sipAmount={sipAmount}
                    retirementAge={retirementAge}
                    projectedCorpusLakhs={projectedCorpusLakhs}
                    principalSeries={projection.principalSeries}
                    projectedSeries={projection.projectedSeries}
                    onSipChange={setSipAmount}
                    onRetirementAgeChange={setRetirementAge}
                    wealthAtFifty={strategy.wealth_at_fifty}
                    strategySummary={strategy.summary}
                  />
                ) : (
                  <NoDataCard title="No data available" body="Upload a portfolio CSV and keep the backend running to generate live strategy projections." />
                )}
              </ChartCard>

              <ChartCard
                title="Portfolio Health Radar"
                description="Balance across diversification, tax efficiency, and fee discipline"
                help="Each spoke represents one pillar of portfolio quality. Any inward dip marks a weak spot worth fixing."
              >
                {hasPortfolio && radarMetrics.length > 0 ? <RadarChart metrics={radarMetrics} /> : <NoDataCard title="No data available" body="Radar metrics will appear after live portfolio analytics are available." compact />}
              </ChartCard>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.05fr_1fr]">
              <ChartCard
                title="Dynamic Rebalancing"
                description="Target versus actual allocation with drift layers"
                help="The outer ring is your AI target mix and the inner ring is your live allocation. Mismatches reveal where rebalancing matters most."
              >
                {hasPortfolio && rebalanceData.length > 0 ? <RebalancingDonut data={rebalanceData} /> : <NoDataCard title="No data available" body="Rebalancing targets require both a live basket and a strategy simulation response." compact />}
              </ChartCard>

              <ChartCard
                title="Risk-Return Scatter"
                description="Find stars and slackers in your holdings"
                help="Assets in high-risk, low-return territory are bugs in the portfolio. The best candidates move toward lower risk and higher return."
              >
                {hasPortfolio && scatterPoints.length > 0 ? <ScatterChart points={scatterPoints} /> : <NoDataCard title="No data available" body="Scatter points need live holdings and volatility analytics." compact />}
              </ChartCard>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_1fr]">
              <ChartCard
                title="Goal Progress Waterfall"
                description="See how contributions and markets built the corpus"
                help="This breaks your current balance into starting capital, fresh savings, market gains, and drag from taxes or fees."
              >
                <NoDataCard title="No data available" body="Waterfall attribution needs contribution and cost-basis history, which is not yet exposed by the backend." compact />
              </ChartCard>

              <ChartCard
                title="Tax-Loss Harvesting"
                description="Match red losses against green gains"
                help="Large red loss bars that can offset green gains become harvest candidates, turning tax optimization into a simple visual decision."
              >
                <NoDataCard title="No data available" body="Tax-loss harvesting needs lot-level cost basis data. Once the backend exposes that, this panel can populate automatically." compact />
              </ChartCard>
            </section>
          </div>

          <aside className="space-y-6">
            <Panel className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tertiary">Agent Intelligence</p>
                  <h3 className="mt-2 text-xl font-bold text-white">Live micro-insights</h3>
                </div>
                <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-tertiary">
                  <span className="h-2 w-2 rounded-full bg-tertiary" />
                  Watching
                </span>
              </div>
              <div className="space-y-4">
                {microInsights.length > 0 ? microInsights.map((insight, index) => (
                  <div key={insight} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Agent note #{index + 1}</span>
                      <MaterialIcon name="psychology" className="text-sm text-tertiary" />
                    </div>
                    <p className="text-sm leading-relaxed text-on-surface-variant">{insight}</p>
                  </div>
                )) : <InlineNoData message="No data available" />}
              </div>
            </Panel>

            <Panel className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tertiary">Execution Sidebar</p>
                  <h3 className="mt-2 text-xl font-bold text-white">Action Center</h3>
                </div>
                <MaterialIcon name="task_alt" className="text-2xl text-white" />
              </div>
              <div className="space-y-3">
                {executionActions.length > 0 ? executionActions.map((action) => (
                  <button key={action.title} className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-tertiary/40 hover:bg-white/10">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-tertiary/15 text-tertiary">
                        <MaterialIcon name={action.icon} className="text-xl" />
                      </div>
                      <div>
                        <div className="font-semibold text-white">{action.title}</div>
                        <div className="mt-1 text-xs uppercase tracking-[0.16em] text-on-surface-variant">{action.subtitle}</div>
                      </div>
                    </div>
                  </button>
                )) : <InlineNoData message="No data available" />}
              </div>
            </Panel>

            <Panel className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-tertiary">Market Sentiment</p>
                  <h3 className="mt-2 text-xl font-bold text-white">Indian sector heatmap</h3>
                </div>
                <MaterialIcon name="grid_view" className="text-2xl text-white" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {sectorHeatmap.length > 0 ? sectorHeatmap.map((sector) => (
                  <div
                    key={sector.label}
                    className={`rounded-2xl border p-4 ${
                      sector.tone === "gain"
                        ? "border-emerald-400/20 bg-emerald-400/10"
                        : "border-red-400/20 bg-red-400/10"
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">{sector.label}</div>
                    <div className={`mt-2 text-xl font-black ${sector.tone === "gain" ? "text-tertiary" : "text-error"}`}>{sector.value}</div>
                  </div>
                )) : <InlineNoData message="No data available" />}
              </div>
              <p className="mt-4 text-xs leading-relaxed text-on-surface-variant">
                Live NSE sector indices populate this heatmap when market breadth data is available.
              </p>
            </Panel>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function parseCurrency(value: string) {
  const normalized = value.replace("INR", "").split(",").join("").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePercent(value: string) {
  const parsed = Number(value.replace("%", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseLeadingPercent(value?: string) {
  if (!value) {
    return 0;
  }
  const match = value.match(/[+-]?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

function KpiCard(props: {
  eyebrow: string;
  value: string;
  caption: string;
  icon: string;
  tone?: "gain" | "default";
  sparkline?: React.ReactNode;
  gaugeValue?: number;
}) {
  return (
    <Panel className="relative overflow-hidden p-6">
      <div className="absolute right-0 top-0 h-28 w-28 rounded-full bg-tertiary/10 blur-3xl" />
      <div className="relative z-10 flex h-full flex-col gap-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">{props.eyebrow}</p>
            <h2 className={`mt-3 text-4xl font-black tracking-[-0.04em] ${props.tone === "gain" ? "text-tertiary" : "text-white"}`}>{props.value}</h2>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
            <MaterialIcon name={props.icon} className="text-2xl" fill={props.icon === "health_and_safety"} />
          </div>
        </div>
        {typeof props.gaugeValue === "number" ? <Gauge value={props.gaugeValue} /> : null}
        {props.sparkline}
        <p className="text-sm leading-relaxed text-on-surface-variant">{props.caption}</p>
      </div>
    </Panel>
  );
}

function Sparkline({ positive }: { positive: boolean }) {
  return (
    <svg viewBox="0 0 180 44" className="h-11 w-full">
      <path d="M0 34 C 18 28, 30 31, 44 20 S 74 16, 92 23 S 126 27, 142 15 S 166 8, 180 10" fill="none" stroke={positive ? "#76f7bf" : "#ff6b7d"} strokeWidth="3" strokeLinecap="round" />
      <path d="M0 43 L0 34 C 18 28, 30 31, 44 20 S 74 16, 92 23 S 126 27, 142 15 S 166 8, 180 10 L180 43 Z" fill={`url(#spark-fill-${positive ? "up" : "down"})`} opacity="0.2" />
      <defs>
        <linearGradient id={`spark-fill-${positive ? "up" : "down"}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={positive ? "#76f7bf" : "#ff6b7d"} />
          <stop offset="100%" stopColor={positive ? "#76f7bf" : "#ff6b7d"} stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function Gauge({ value }: { value: number }) {
  const degrees = Math.round((value / 100) * 360);

  return (
    <div className="flex items-center gap-4">
      <div
        className="relative h-20 w-20 rounded-full"
        style={{
          background: `conic-gradient(#76f7bf 0deg ${degrees}deg, rgba(255,255,255,0.08) ${degrees}deg 360deg)`,
        }}
      >
        <div className="absolute inset-[8px] flex items-center justify-center rounded-full bg-surface-container-lowest">
          <span className="text-lg font-black text-white">{value}</span>
        </div>
      </div>
      <div className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">
        Balanced score across quality, drift, cost, and goal alignment.
      </div>
    </div>
  );
}

function ChartCard(props: {
  title: string;
  description: string;
  help: string;
  accent?: "default" | "purple";
  children: React.ReactNode;
}) {
  return (
    <Panel className={`overflow-hidden p-6 ${props.accent === "purple" ? "ring-1 ring-[rgba(124,92,255,0.35)]" : ""}`}>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">{props.title}</h3>
            <InfoChip text={props.help} />
          </div>
          <p className="mt-2 text-sm text-on-surface-variant">{props.description}</p>
        </div>
      </div>
      {props.children}
    </Panel>
  );
}

function InfoChip({ text }: { text: string }) {
  return (
    <details className="group relative">
      <summary className="flex h-7 w-7 cursor-pointer list-none items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400 transition hover:text-white">
        <MaterialIcon name="help" className="text-base" />
      </summary>
      <div className="absolute right-0 top-10 z-20 w-64 rounded-2xl border border-white/10 bg-surface-container-high p-4 text-sm leading-relaxed text-on-surface-variant shadow-2xl">
        {text}
      </div>
    </details>
  );
}

function GhostChart(props: { title: string; body: string; compact?: boolean }) {
  return (
    <div className={`rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] ${props.compact ? "p-6" : "p-8"}`}>
      <div className="pointer-events-none mb-6 space-y-3 opacity-40 blur-[1px]">
        <div className="h-4 w-28 rounded-full bg-white/10" />
        <div className="grid h-36 grid-cols-6 items-end gap-2">
          {[28, 44, 31, 62, 58, 77].map((height) => (
            <div key={height} className="rounded-t-xl bg-white/10" style={{ height: `${height}%` }} />
          ))}
        </div>
      </div>
      <h4 className="text-lg font-bold text-white">{props.title}</h4>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-on-surface-variant">{props.body}</p>
      <button className="mt-5 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-on-primary transition hover:scale-[0.98]">
        Upload your portfolio
      </button>
    </div>
  );
}

function NoDataCard(props: { title: string; body: string; compact?: boolean }) {
  return (
    <div className={`rounded-[1.75rem] border border-dashed border-white/10 bg-white/[0.03] ${props.compact ? "p-6" : "p-8"}`}>
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-neutral-400">
        <MaterialIcon name="database" className="text-3xl" />
      </div>
      <h4 className="text-lg font-bold text-white">{props.title}</h4>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-on-surface-variant">{props.body}</p>
    </div>
  );
}

function InlineNoData(props: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-on-surface-variant">
      {props.message}
    </div>
  );
}

function WhatIfProjectionChart(props: {
  sipAmount: number;
  retirementAge: number;
  projectedCorpusLakhs: number;
  principalSeries: number[];
  projectedSeries: number[];
  onSipChange: (value: number) => void;
  onRetirementAgeChange: (value: number) => void;
  wealthAtFifty: string;
  strategySummary: string;
}) {
  const principalPath = buildAreaPath(props.principalSeries, 420, 220);
  const projectionPath = buildAreaPath(props.projectedSeries, 420, 220);
  const linePath = buildLinePath(props.projectedSeries, 420, 220);

  return (
    <div>
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Projected corpus</div>
          <div className="mt-2 text-3xl font-black text-white">INR {props.projectedCorpusLakhs.toLocaleString()}K</div>
          <div className="mt-2 text-xs uppercase tracking-[0.16em] text-tertiary">Zenith Purple = AI-advised growth layer</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Wealth at fifty</div>
          <div className="mt-2 text-lg font-semibold text-white">{props.wealthAtFifty}</div>
          <div className="mt-2 text-sm leading-relaxed text-on-surface-variant">{props.strategySummary}</div>
        </div>
      </div>

      <svg viewBox="0 0 420 220" className="h-[260px] w-full rounded-[1.5rem] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-3">
        {[0, 1, 2, 3].map((index) => (
          <line key={index} x1="20" y1={35 + index * 44} x2="400" y2={35 + index * 44} stroke="rgba(255,255,255,0.06)" strokeDasharray="4 8" />
        ))}
        <path d={projectionPath} fill="rgba(124,92,255,0.22)" />
        <path d={principalPath} fill="rgba(118,247,191,0.20)" />
        <path d={linePath} fill="none" stroke={zenithPurple} strokeWidth="3" strokeLinecap="round" />
      </svg>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <SliderControl
          label="Monthly SIP"
          value={`INR ${props.sipAmount.toLocaleString()}`}
          min={1000}
          max={25000}
          step={500}
          current={props.sipAmount}
          onChange={props.onSipChange}
        />
        <SliderControl
          label="Retirement age"
          value={`${props.retirementAge} years`}
          min={45}
          max={65}
          step={1}
          current={props.retirementAge}
          onChange={props.onRetirementAgeChange}
        />
      </div>
    </div>
  );
}

function SliderControl(props: {
  label: string;
  value: string;
  min: number;
  max: number;
  step: number;
  current: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{props.label}</span>
        <span className="text-sm font-bold text-white">{props.value}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.current}
        onChange={(event) => props.onChange(Number(event.target.value))}
        className="w-full accent-[#7c5cff]"
      />
    </div>
  );
}

function RadarChart({ metrics }: { metrics: ReadonlyArray<{ label: string; value: number }> }) {
  const center = 120;
  const radius = 78;
  const steps = [20, 40, 60, 80, 100];

  const points = metrics.map((metric, index) => {
    const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
    const scaled = (metric.value / 100) * radius;
    return {
      label: metric.label,
      value: metric.value,
      x: center + Math.cos(angle) * scaled,
      y: center + Math.sin(angle) * scaled,
      labelX: center + Math.cos(angle) * (radius + 28),
      labelY: center + Math.sin(angle) * (radius + 28),
      axisX: center + Math.cos(angle) * radius,
      axisY: center + Math.sin(angle) * radius,
    };
  });

  const polygon = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="grid gap-5 md:grid-cols-[240px_1fr] md:items-center">
      <svg viewBox="0 0 240 240" className="mx-auto h-[240px] w-[240px]">
        {steps.map((step) => {
          const ring = metrics.map((_metric, index) => {
            const angle = (Math.PI * 2 * index) / metrics.length - Math.PI / 2;
            const scaled = (step / 100) * radius;
            const x = center + Math.cos(angle) * scaled;
            const y = center + Math.sin(angle) * scaled;
            return `${x},${y}`;
          });
          return <polygon key={step} points={ring.join(" ")} fill="none" stroke="rgba(255,255,255,0.08)" />;
        })}
        {points.map((point) => (
          <line key={point.label} x1={center} y1={center} x2={point.axisX} y2={point.axisY} stroke="rgba(255,255,255,0.08)" />
        ))}
        <polygon points={polygon} fill="rgba(124,92,255,0.24)" stroke={zenithPurple} strokeWidth="2" />
        {points.map((point) => (
          <circle key={`${point.label}-dot`} cx={point.x} cy={point.y} r="4" fill="#76f7bf" />
        ))}
        {points.map((point) => (
          <text key={`${point.label}-label`} x={point.labelX} y={point.labelY} fill="#a0a0b8" fontSize="10" textAnchor="middle">
            {point.label}
          </text>
        ))}
      </svg>

      <div className="space-y-3">
        {metrics.map((metric) => (
          <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-on-surface-variant">{metric.label}</span>
              <span className="font-bold text-white">{metric.value}</span>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-white/5">
              <div className="h-1.5 rounded-full bg-[linear-gradient(90deg,#7c5cff,#76f7bf)]" style={{ width: `${metric.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RebalancingDonut({ data }: { data: ReadonlyArray<{ label: string; actual: number; target: number; color: string }> }) {
  const targetGradient = `conic-gradient(${data.map((item, index) => `${item.color} ${sumTo(data, index, "target")}deg ${sumTo(data, index + 1, "target")}deg`).join(", ")})`;
  const actualGradient = `conic-gradient(${data.map((item, index) => `${item.color} ${sumTo(data, index, "actual")}deg ${sumTo(data, index + 1, "actual")}deg`).join(", ")})`;

  return (
    <div className="grid gap-5 md:grid-cols-[260px_1fr] md:items-center">
      <div className="relative mx-auto h-64 w-64">
        <div className="absolute inset-0 rounded-full opacity-35" style={{ background: targetGradient }} />
        <div className="absolute inset-[26px] rounded-full border-[18px] border-background" />
        <div className="absolute inset-[42px] rounded-full" style={{ background: actualGradient }} />
        <div className="absolute inset-[86px] flex items-center justify-center rounded-full bg-surface-container-lowest text-center">
          <div>
            <div className="text-3xl font-black text-white">6.8%</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Net drift</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {data.map((item) => {
          const drift = item.actual - item.target;
          return (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="font-semibold text-white">{item.label}</span>
                </div>
                <span className={drift > 0 ? "text-error" : drift < 0 ? "text-tertiary" : "text-white"}>
                  {drift > 0 ? "+" : ""}
                  {drift}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.16em] text-on-surface-variant">
                <span>Actual {item.actual}%</span>
                <span style={{ color: zenithPurple }}>Target {item.target}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScatterChart({ points }: { points: ReadonlyArray<{ label: string; risk: number; returns: number; tone: string }> }) {
  return (
    <div>
      <div className="relative h-[320px] rounded-[1.5rem] border border-white/10 bg-white/[0.03]">
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/10" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-white/10" />
        <div className="absolute left-4 top-4 text-[10px] uppercase tracking-[0.18em] text-neutral-500">High return</div>
        <div className="absolute bottom-4 right-4 text-[10px] uppercase tracking-[0.18em] text-neutral-500">High risk</div>
        <div className="absolute left-5 top-5 rounded-full bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500">Bug Zone</div>
        {points.map((point) => (
          <div
            key={point.label}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${point.risk}%`, top: `${100 - point.returns}%` }}
          >
            <div
              className={`flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-background ${
                point.tone === "slacker" ? "bg-error" : point.tone === "star" ? "bg-tertiary" : "bg-secondary"
              }`}
            />
            <div className="mt-2 whitespace-nowrap text-[10px] font-bold uppercase tracking-[0.12em] text-white">{point.label}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
        <span className="rounded-full border border-tertiary/20 bg-tertiary/10 px-3 py-1 text-tertiary">Star = lower risk, higher return candidate</span>
        <span className="rounded-full border border-error/20 bg-error/10 px-3 py-1 text-error">Bug = high risk, low return</span>
      </div>
    </div>
  );
}

function WaterfallChart({ items }: { items: ReadonlyArray<{ label: string; value: number; tone: string }> }) {
  const maxValue = Math.max(...items.map((item) => Math.abs(item.value)));

  return (
    <div>
      <div className="grid h-[280px] grid-cols-5 items-end gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-6">
        {items.map((item) => {
          const height = Math.max(18, (Math.abs(item.value) / maxValue) * 200);
          const color =
            item.tone === "negative"
              ? "bg-error"
              : item.tone === "total"
                ? "bg-[linear-gradient(180deg,#7c5cff,#76f7bf)]"
                : item.tone === "neutral"
                  ? "bg-white/30"
                  : "bg-tertiary";

          return (
            <div key={item.label} className="flex flex-col items-center justify-end gap-3">
              <div className={`w-full rounded-t-2xl ${color}`} style={{ height }} />
              <div className="text-center">
                <div className="text-sm font-bold text-white">INR {(item.value / 1000).toFixed(0)}K</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500">{item.label}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-on-surface-variant">
        Market gains feel like free money because the chart shows them as a distinct expansion layer above your own contributions.
      </div>
    </div>
  );
}

function TaxHarvestChart({ items }: { items: ReadonlyArray<{ label: string; gains: number; losses: number; harvest: boolean }> }) {
  const maxValue = Math.max(...items.flatMap((item) => [item.gains, item.losses]));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 rounded-[1.5rem] border border-white/10 bg-white/[0.03] p-5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-white">{item.label}</span>
              {item.harvest ? (
                <span className="rounded-full border border-tertiary/20 bg-tertiary/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-tertiary">AI harvest candidate</span>
              ) : null}
            </div>
            <div className="grid grid-cols-[1fr_1fr] gap-3">
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500">Gain</div>
                <div className="h-3 rounded-full bg-white/5">
                  <div className="h-3 rounded-full bg-tertiary" style={{ width: `${(item.gains / maxValue) * 100}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500">Loss</div>
                <div className="h-3 rounded-full bg-white/5">
                  <div className="h-3 rounded-full bg-error" style={{ width: `${(item.losses / maxValue) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-on-surface-variant">
        The optimizer pairs the largest red bars against green bars first so the tax-saving opportunity is immediately visible.
      </div>
    </div>
  );
}

function buildAreaPath(values: number[], width: number, height: number) {
  const max = Math.max(...values);
  const stepX = (width - 60) / (values.length - 1);
  const points = values.map((value, index) => {
    const x = 20 + index * stepX;
    const y = height - 20 - (value / max) * (height - 60);
    return [x, y] as const;
  });

  return `M 20 ${height - 20} ${points.map(([x, y]) => `L ${x} ${y}`).join(" ")} L ${20 + (values.length - 1) * stepX} ${height - 20} Z`;
}

function buildLinePath(values: number[], width: number, height: number) {
  const max = Math.max(...values);
  const stepX = (width - 60) / (values.length - 1);
  return values
    .map((value, index) => {
      const x = 20 + index * stepX;
      const y = height - 20 - (value / max) * (height - 60);
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");
}

function sumTo(
  data: ReadonlyArray<{ actual: number; target: number }>,
  index: number,
  key: "actual" | "target",
) {
  const total = data.slice(0, index).reduce((sum, item) => sum + item[key], 0);
  return (total / 100) * 360;
}
