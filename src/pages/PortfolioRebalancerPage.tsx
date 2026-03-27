import { useEffect, useState } from "react";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";
import { apiV1BaseUrl, fetchJson } from "../lib/api";

type RebalancerRatio = {
  name: string;
  value: string;
  meaning: string;
  impact: string;
  suggested_action: string;
};

type RebalancerMove = {
  title: string;
  why: string;
  expected_effect: string;
};

type RebalancerResponse = {
  summary: string;
  current_mix: Record<string, number>;
  target_mix: Record<string, number>;
  ratios: RebalancerRatio[];
  suggested_moves: RebalancerMove[];
};

export function PortfolioRebalancerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rebalancer, setRebalancer] = useState<RebalancerResponse | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadRebalancer() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetchJson<RebalancerResponse>(`${apiV1BaseUrl}/portfolio/rebalancer`);
        if (!cancelled) {
          setRebalancer(response);
        }
      } catch {
        if (!cancelled) {
          setError("No rebalancer data is available right now. Upload a portfolio CSV and make sure the backend is running.");
          setRebalancer(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadRebalancer();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <AppShell
      metricLabel="Rebalance Readiness"
      metricValue={loading ? "Loading..." : rebalancer ? `${rebalancer.ratios.length} ratios` : "No data"}
      rightSlot={
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface-container-highest">
          <MaterialIcon name="sync_alt" className="text-xl text-tertiary" />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        {error ? (
          <Panel className="mb-8 border border-error/20 bg-error/10 p-5 text-sm text-error">
            {error}
          </Panel>
        ) : null}

        <header className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.22em] text-tertiary">Portfolio Rebalancer</span>
            <h2 className="mt-3 text-4xl font-extrabold tracking-tight text-white">Rebalance with context, not guesswork</h2>
            <p className="mt-3 max-w-3xl text-on-surface-variant">
              This page explains what each key ratio means, why it matters, and what change is usually worth making next.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-surface-container p-4 text-sm text-on-surface-variant">
            {rebalancer?.summary ?? "Waiting for portfolio data."}
          </div>
        </header>

        <section className="mb-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Object.entries(rebalancer?.current_mix ?? {}).map(([key, value]) => (
            <Panel key={key} className="p-5">
              <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Current {key}</div>
              <div className="mt-2 text-3xl font-black text-white">{value}%</div>
              <div className="mt-2 text-xs uppercase tracking-[0.14em] text-tertiary">
                Target {rebalancer?.target_mix?.[key] ?? 0}%
              </div>
            </Panel>
          ))}
        </section>

        <section className="mb-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Panel className="p-6">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Ratio Education</p>
                <h3 className="mt-2 text-2xl font-bold text-white">What each ratio leads to</h3>
              </div>
              <MaterialIcon name="school" className="text-2xl text-white" />
            </div>
            <div className="space-y-4">
              {rebalancer?.ratios?.length ? rebalancer.ratios.map((ratio) => (
                <div key={ratio.name} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-lg font-bold text-white">{ratio.name}</h4>
                    <span className="rounded-full border border-tertiary/20 bg-tertiary/10 px-3 py-1 text-xs font-bold text-tertiary">
                      {ratio.value}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    <span className="font-semibold text-white">Meaning:</span> {ratio.meaning}
                  </p>
                  <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                    <span className="font-semibold text-white">Impact:</span> {ratio.impact}
                  </p>
                  <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                    <span className="font-semibold text-tertiary">What to do:</span> {ratio.suggested_action}
                  </p>
                </div>
              )) : (
                <div className="text-sm text-on-surface-variant">No ratio data available.</div>
              )}
            </div>
          </Panel>

          <div className="space-y-6">
            <Panel className="p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Suggested Moves</p>
                  <h3 className="mt-2 text-2xl font-bold text-white">How to rebalance now</h3>
                </div>
                <MaterialIcon name="tips_and_updates" className="text-2xl text-white" />
              </div>
              <div className="space-y-4">
                {rebalancer?.suggested_moves?.length ? rebalancer.suggested_moves.map((move) => (
                  <div key={move.title} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                    <h4 className="text-lg font-bold text-white">{move.title}</h4>
                    <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{move.why}</p>
                    <p className="mt-4 rounded-2xl border border-tertiary/20 bg-tertiary/10 px-4 py-3 text-sm text-white">
                      {move.expected_effect}
                    </p>
                  </div>
                )) : (
                  <div className="text-sm text-on-surface-variant">No suggested moves available.</div>
                )}
              </div>
            </Panel>

            <Panel className="p-6">
              <div className="mb-4 flex items-center gap-3">
                <MaterialIcon name="info" className="text-xl text-tertiary" />
                <h3 className="text-lg font-bold text-white">Why call it Portfolio Rebalancer?</h3>
              </div>
              <p className="text-sm leading-relaxed text-on-surface-variant">
                Because this section goes beyond diagnosis. It teaches what each ratio means and connects those ratios to concrete allocation moves, which is the actual rebalancing decision users need to make.
              </p>
            </Panel>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
