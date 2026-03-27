import { useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel, SectionEyebrow } from "../components/ui";
import { apiV1BaseUrl, fetchJson } from "../lib/api";

type OverviewStat = {
  label: string;
  value: string;
  tone: "neutral" | "positive" | "warning" | "negative";
};

type Recommendation = {
  symbol: string;
  category: string;
  last_price: number;
  percent_change: number;
  last_updated: string;
  thesis: string;
  action: string;
  why_recommended_now?: string | null;
  why_invest?: string | null;
  ai_summary?: string | null;
  why_ai_likes_it: string[];
  goal_name?: string | null;
  months_accelerated: number;
  recommended_investment?: string | null;
  estimated_brokerage?: string | null;
  estimated_exit_fee?: string | null;
  net_goal_impact?: string | null;
  risk_flag?: string | null;
};

type MarketEngineResponse = {
  sentiment: string;
  summary: string;
  why_ai_is_used: string[];
  recommendations: Recommendation[];
  recommended_etfs: Recommendation[];
  projected_acceleration: OverviewStat[];
};

export function MarketEnginePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [engine, setEngine] = useState<MarketEngineResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRecommendations() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchJson<MarketEngineResponse>(`${apiV1BaseUrl}/market-engine/recommendations`);
        if (!cancelled) {
          setEngine(response);
        }
      } catch {
        if (!cancelled) {
          setError("No recommendations are available right now. Make sure the backend is running and market data can be reached.");
          setEngine(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRecommendations();
    return () => {
      cancelled = true;
    };
  }, []);

  const primaryIdea = engine?.recommendations?.[0] ?? null;
  const secondaryIdeas = engine?.recommendations?.slice(1) ?? [];
  const etfIdeas = engine?.recommended_etfs ?? [];
  const aiWhy = useMemo(() => engine?.why_ai_is_used?.slice(0, 3) ?? [], [engine?.why_ai_is_used]);

  return (
    <AppShell
      topNav={[
        { label: "Recommendations", href: "/market-engine" },
        { label: "History", href: "/command-center" },
        { label: "Watchlist", href: "/auditor" },
      ]}
      metricValue={engine?.sentiment ?? "No data available"}
      rightSlot={
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface-container-high">
          <MaterialIcon name="health_and_safety" className="text-tertiary" />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        {error ? (
          <Panel className="mb-8 border border-error/20 bg-error/10 p-5 text-sm text-error">
            {error}
          </Panel>
        ) : null}

        <section className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="text-4xl font-extrabold tracking-[-0.05em] text-white md:text-6xl">
              AI <span className="text-tertiary">Recommendations</span>
            </h2>
            <p className="mt-4 max-w-2xl text-on-surface-variant">
              Groq compresses the reasoning, but the engine still uses deterministic brokerage, exit-fee, and goal-acceleration math underneath.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface-container px-6 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">Market Pulse</p>
            <div className="mt-2 flex items-center gap-2 font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-tertiary" />
              {loading ? "Refreshing..." : engine?.sentiment ?? "No data available"}
            </div>
          </div>
        </section>

        <section className="mb-12 grid gap-6 md:grid-cols-12">
          <Panel className="relative overflow-hidden p-8 md:col-span-8">
            <div className="absolute right-0 top-0 p-8">
              <MaterialIcon name="stars" className="text-5xl text-secondary/30" fill />
            </div>
            <div className="relative z-10">
              <div className="mb-8 flex items-center gap-2">
                <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                  {primaryIdea?.category ?? "Recommendation"}
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">
                  {primaryIdea ? `${primaryIdea.goal_name ?? "Goal"}: ${primaryIdea.months_accelerated} month(s) sooner` : "Waiting for live market analysis"}
                </span>
              </div>
              <h3 className="text-3xl font-bold text-white">{primaryIdea?.symbol ?? "No live recommendation"}</h3>
              <p className="mb-8 mt-2 max-w-2xl text-sm text-on-surface-variant">
                {primaryIdea?.ai_summary ?? engine?.summary ?? "No recommendation summary available."}
              </p>
              <div className="flex flex-wrap items-end gap-12">
                <div>
                  <p className="text-4xl font-black tracking-[-0.05em] text-white">
                    {primaryIdea?.recommended_investment ?? "No data"}
                  </p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Suggested deployment</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <MetricChip label="Brokerage" value={primaryIdea?.estimated_brokerage ?? "No data"} />
                  <MetricChip label="Exit Fee" value={primaryIdea?.estimated_exit_fee ?? "No data"} />
                </div>
              </div>
              <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
                <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Why invest now</div>
                <div className="mt-2 text-sm leading-relaxed text-white">
                  {primaryIdea?.why_recommended_now ?? primaryIdea?.why_invest ?? primaryIdea?.thesis ?? "No thesis available."}
                </div>
              </div>
              <button className="mt-12 w-full rounded-2xl bg-white py-4 text-sm font-bold text-on-primary transition hover:scale-[0.99]">
                {primaryIdea?.action ? formatAction(primaryIdea.action) : "Review Opportunity"}
              </button>
            </div>
          </Panel>

          <Panel className="flex flex-col justify-between p-8 md:col-span-4">
            <div>
              <h4 className="mb-6 text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">Why AI Is Used</h4>
              <div className="space-y-4">
                {aiWhy.length > 0 ? aiWhy.map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-on-surface-variant">
                    {item}
                  </div>
                )) : (
                  <div className="text-sm text-on-surface-variant">No AI explanation available.</div>
                )}
              </div>
            </div>
            <div className="mt-8 border-t border-white/5 pt-8">
              <p className="text-xs italic leading-relaxed text-on-surface-variant">
                {engine?.summary ?? "The market engine will summarize why each recommendation matters once live data is available."}
              </p>
            </div>
          </Panel>

          {secondaryIdeas.map((idea) => (
            <Panel key={idea.symbol} className="p-8 md:col-span-6">
              <div className="mb-8 flex items-center justify-between">
                <span className="rounded-full border border-tertiary/20 bg-tertiary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-tertiary">
                  {idea.category}
                </span>
                <MaterialIcon name={idea.action.includes("sip") ? "trending_up" : "bolt"} className="text-neutral-500" />
              </div>
              <h3 className="text-2xl font-bold text-white">{idea.symbol}</h3>
              <p className="mt-2 text-sm text-on-surface-variant">{idea.ai_summary ?? idea.thesis}</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white">
                {idea.why_recommended_now ?? "No timing rationale available."}
              </div>
              <div className="mb-8 mt-8 grid gap-3 sm:grid-cols-2">
                <MetricChip label="Goal" value={idea.goal_name ?? "Wealth Growth"} />
                <MetricChip label="Months Saved" value={`${idea.months_accelerated}`} />
                <MetricChip label="Brokerage" value={idea.estimated_brokerage ?? "No data"} />
                <MetricChip label="Exit Fee" value={idea.estimated_exit_fee ?? "No data"} />
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-on-surface-variant">
                {idea.net_goal_impact ?? "No net goal-impact summary available."}
              </div>
              <div className="mt-4 space-y-2">
                {idea.why_ai_likes_it.slice(0, 2).map((point) => (
                  <div key={point} className="flex items-start gap-3 rounded-2xl bg-white/[0.03] p-3 text-sm text-white">
                    <MaterialIcon name="subdirectory_arrow_right" className="mt-0.5 text-base text-tertiary" />
                    <span>{point}</span>
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </section>

        <section className="mb-16">
          <SectionEyebrow>Recommended ETFs</SectionEyebrow>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {etfIdeas.length > 0 ? etfIdeas.map((idea) => (
              <Panel key={idea.symbol} className="p-6">
                <div className="mb-5 flex items-center justify-between">
                  <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                    ETF
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-tertiary">
                    {idea.months_accelerated} month(s) sooner
                  </span>
                </div>
                <h3 className="text-2xl font-bold text-white">{idea.symbol}</h3>
                <p className="mt-2 text-sm text-on-surface-variant">{idea.ai_summary ?? idea.thesis}</p>
                <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white">
                  {idea.why_recommended_now ?? idea.why_invest ?? "No ETF rationale available."}
                </div>
                <div className="mt-5 grid gap-3">
                  <MetricChip label="Suggested SIP" value={idea.recommended_investment ?? "No data"} />
                  <MetricChip label="Goal Impact" value={idea.net_goal_impact ?? "No data"} />
                </div>
              </Panel>
            )) : (
              <Panel className="p-6 text-sm text-on-surface-variant">No ETF recommendations available right now.</Panel>
            )}
          </div>
        </section>

        <section className="mb-24">
          <SectionEyebrow>Projected Acceleration</SectionEyebrow>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {engine?.projected_acceleration?.length ? engine.projected_acceleration.map((item) => (
              <Panel key={item.label} className="bg-surface-container-low p-6">
                <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">{item.label}</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{item.value}</span>
                  <span className={`text-xs font-bold ${item.tone === "positive" ? "text-tertiary" : item.tone === "negative" ? "text-error" : "text-secondary"}`}>
                    {item.tone === "positive" ? "Tailwind" : item.tone === "negative" ? "Pressure" : "Neutral"}
                  </span>
                </div>
              </Panel>
            )) : (
              <Panel className="bg-surface-container-low p-6 text-sm text-on-surface-variant">No acceleration data available.</Panel>
            )}
          </div>
        </section>

        <div className="fixed bottom-20 left-6 right-6 z-40 lg:bottom-6 lg:left-[calc(16rem+1.5rem)]">
          <Panel className="overflow-hidden">
            <div className="flex cursor-pointer items-center justify-between bg-white/5 px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-tertiary shadow-emerald" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em]">AI Recommendation Engine</span>
              </div>
              <MaterialIcon name="keyboard_arrow_up" className="text-sm" />
            </div>
            <div className="space-y-2 p-6 text-sm text-neutral-400">
              <div>Deterministic math estimates brokerage and exit fees for every idea.</div>
              <div>Groq compresses the &quot;why now&quot; and &quot;why this goal&quot; explanation.</div>
              <div className="font-bold text-white">{primaryIdea?.net_goal_impact ?? "Goal acceleration insights will appear here."}</div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}

function MetricChip(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{props.label}</div>
      <div className="mt-2 text-sm font-bold text-white">{props.value}</div>
    </div>
  );
}

function formatAction(action: string) {
  return action
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
