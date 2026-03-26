import { useCallback, useEffect, useMemo, useState } from "react";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";

type AuditHolding = {
  symbol: string;
  name: string;
  badge: string;
  volatility_impact: number;
  market_value: string;
  performance: string;
  average_buy_price?: string | null;
  current_price?: string | null;
  break_even_price?: string | null;
  unrealized_profit?: string | null;
  estimated_brokerage?: string | null;
  safe_to_sell: boolean;
  sell_signal: string;
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

type MarketSnapshotResponse = {
  generated_at: string;
  tracked_symbols: string[];
};

export function PortfolioAuditorPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [auditor, setAuditor] = useState<AuditorResponse | null>(null);
  const [snapshot, setSnapshot] = useState<MarketSnapshotResponse | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const loadPortfolioAudit = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const [auditorResponse, snapshotResponse] = await Promise.all([
        fetchJson<AuditorResponse>(`${apiBaseUrl}/auditor/report`, { signal }),
        fetchJson<MarketSnapshotResponse>(`${apiBaseUrl}/market/snapshot`, { signal }),
      ]);

      if (signal?.aborted) {
        return;
      }

      setAuditor(auditorResponse);
      setSnapshot(snapshotResponse);
    } catch {
      if (!signal?.aborted) {
        setError("No data available right now. Upload a portfolio CSV and make sure the backend is running.");
        setAuditor(null);
        setSnapshot(null);
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadPortfolioAudit(controller.signal);
    return () => {
      controller.abort();
    };
  }, [loadPortfolioAudit, reloadTick]);

  useEffect(() => {
    function triggerRefresh() {
      setReloadTick((current) => current + 1);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        triggerRefresh();
      }
    }

    window.addEventListener("focus", triggerRefresh);
    window.addEventListener("nirvesta:portfolio-uploaded", triggerRefresh as EventListener);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", triggerRefresh);
      window.removeEventListener("nirvesta:portfolio-uploaded", triggerRefresh as EventListener);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const hasData = Boolean(auditor?.holdings?.length);
  const refreshLabel = useMemo(() => {
    if (!snapshot?.generated_at) {
      return "No data available";
    }
    return `Fresh snapshot: ${snapshot.generated_at}`;
  }, [snapshot]);

  return (
    <AppShell
      topNav={[
        { label: "Dashboard", href: "/" },
        { label: "Portfolio", href: "/auditor" },
        { label: "Strategies", href: "/strategy" },
      ]}
      metricValue={hasData ? `${auditor?.holdings.length ?? 0} live holdings` : "No data available"}
      rightSlot={
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface-container-highest">
          <MaterialIcon name="favorite" className="text-xl text-tertiary" fill />
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
            <h2 className="text-4xl font-extrabold tracking-tight text-white">Portfolio Auditor</h2>
            <p className="mt-2 max-w-xl text-on-surface-variant">
              Deep scan of your imported holdings. This page now reads live backend data and gracefully falls back when no portfolio is available.
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-tertiary/20 bg-surface-container px-4 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-tertiary">
            <MaterialIcon name="auto_awesome" className="text-xs" />
            {loading ? "Refreshing" : refreshLabel}
          </span>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-1">
            <Panel className="relative overflow-hidden p-6">
              <div className="absolute right-0 top-0 p-4">
                <MaterialIcon name="swap_horizontal_circle" className="rotate-12 text-6xl text-tertiary/20" />
              </div>
              <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-tertiary">Optimization Alert</h3>
              {hasData && auditor ? (
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Current Holding</p>
                      <p className="font-bold text-white">{auditor.recommendation.current_holding}</p>
                    </div>
                    <MaterialIcon name="arrow_forward" className="text-neutral-600" />
                    <div className="text-right">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-tertiary">Recommended</p>
                      <p className="font-bold text-white">{auditor.recommendation.suggested_holding}</p>
                    </div>
                  </div>
                  <p className="text-sm leading-relaxed text-on-surface-variant">
                    {auditor.recommendation.reason}
                  </p>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs uppercase tracking-[0.16em] text-tertiary">
                    {auditor.recommendation.expected_benefit}
                  </div>
                </div>
              ) : (
                <NoDataState message="No data available" />
              )}
            </Panel>

            <Panel className="p-6">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">Diversification Score</h3>
              {typeof auditor?.diversification_score === "number" && auditor.diversification_score > 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="relative flex h-40 w-40 items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-[8px] border-white/5" />
                    <div
                      className="absolute inset-0 rounded-full border-[8px] border-transparent border-t-tertiary border-r-tertiary"
                      style={{ transform: `rotate(${Math.round((auditor.diversification_score / 100) * 180)}deg)` }}
                    />
                    <div className="text-center">
                      <span className="text-4xl font-black text-white">{auditor.diversification_score}</span>
                      <span className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500">Live Score</span>
                    </div>
                  </div>
                </div>
              ) : (
                <NoDataState message="No data available" />
              )}
            </Panel>
          </section>

          <section className="lg:col-span-2">
            {hasData && auditor ? (
              <div className="grid gap-4 md:grid-cols-2">
                {auditor.holdings.map((holding) => (
                  <Panel key={holding.symbol} className="p-6">
                    <div className="mb-6 flex items-start justify-between">
                      <div>
                        <h4 className="text-lg font-bold leading-none text-white">{holding.symbol}</h4>
                        <p className="mt-1 text-xs text-neutral-500">{holding.name}</p>
                      </div>
                      <span className={badgeClassName(holding.badge)}>
                        {holding.badge}
                      </span>
                    </div>
                    <div className="mb-6">
                      <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                        <span>Volatility Impact</span>
                        <span className="text-white">{holding.volatility_impact}/100</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className="h-full rounded-full bg-gradient-to-r from-tertiary via-secondary to-error" style={{ width: `${holding.volatility_impact}%` }} />
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Value</p>
                        <p className="font-bold text-white">{holding.market_value}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-[10px] uppercase tracking-[0.18em] ${holding.performance.startsWith("-") ? "text-error" : "text-tertiary"}`}>Performance</p>
                        <p className={`font-bold ${holding.performance.startsWith("-") ? "text-error" : "text-tertiary"}`}>{holding.performance}</p>
                      </div>
                    </div>
                    <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                      <MetricRow label="Buy Price" value={holding.average_buy_price ?? "No data available"} />
                      <MetricRow label="Current Price" value={holding.current_price ?? "No data available"} />
                      <MetricRow label="Break-even" value={holding.break_even_price ?? "No data available"} />
                      <MetricRow label="Profit / Loss" value={holding.unrealized_profit ?? "No data available"} />
                      <MetricRow label="Est. Brokerage" value={holding.estimated_brokerage ?? "No data available"} />
                    </div>
                    <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-medium ${holding.safe_to_sell ? "border-tertiary/20 bg-tertiary/10 text-tertiary" : "border-error/20 bg-error/10 text-error"}`}>
                      {holding.sell_signal}
                    </div>
                  </Panel>
                ))}
              </div>
            ) : (
              <Panel className="p-8">
                <NoDataState message="No data available. Upload a portfolio CSV to populate your live audit holdings." />
              </Panel>
            )}

            <Panel className="mt-8 bg-surface-container-low p-8">
              <h3 className="mb-6 text-xl font-bold text-white">Annualized Risk Analysis</h3>
              {auditor?.annualized_risk_trend?.length ? (
                <>
                  <div className="mb-4 flex h-32 items-end gap-1">
                    {auditor.annualized_risk_trend.map((height, index) => (
                      <div
                        key={`${height}-${index}`}
                        className={`flex-1 rounded-t-lg ${index === auditor.annualized_risk_trend.length - 1 ? "bg-tertiary" : index % 2 === 0 ? "bg-white/5" : "bg-secondary/30"}`}
                        style={{ height: `${Math.max(height, 8)}%` }}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    {auditor.holdings.slice(0, auditor.annualized_risk_trend.length).map((holding) => (
                      <span key={holding.symbol}>{holding.symbol}</span>
                    ))}
                  </div>
                </>
              ) : (
                <NoDataState message="No data available" />
              )}
            </Panel>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });
  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

function badgeClassName(badge: string) {
  if (badge.toLowerCase().includes("high") || badge.toLowerCase().includes("range")) {
    return "rounded-lg border border-error/20 bg-error/10 px-2 py-1 text-[10px] font-bold text-error";
  }
  if (badge.toLowerCase().includes("momentum")) {
    return "rounded-lg border border-tertiary/20 bg-tertiary/10 px-2 py-1 text-[10px] font-bold text-tertiary";
  }
  return "rounded-lg border border-secondary/20 bg-secondary/10 px-2 py-1 text-[10px] font-bold text-secondary";
}

function NoDataState(props: { message: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-on-surface-variant">
      {props.message}
    </div>
  );
}

function MetricRow(props: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{props.label}</span>
      <span className="text-right font-semibold text-white">{props.value}</span>
    </div>
  );
}
