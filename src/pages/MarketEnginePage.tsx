import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel, SectionEyebrow } from "../components/ui";

export function MarketEnginePage() {
  return (
    <AppShell
      topNav={[
        { label: "Opportunities", href: "/market-engine" },
        { label: "History", href: "/command-center" },
        { label: "Watchlist", href: "/auditor" },
      ]}
      metricValue="$12,450.00"
      rightSlot={
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface-container-high">
          <MaterialIcon name="health_and_safety" className="text-tertiary" />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <section className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h2 className="text-4xl font-extrabold tracking-[-0.05em] text-white md:text-6xl">
              Market <span className="text-tertiary">Engine</span>
            </h2>
            <p className="mt-4 max-w-xl text-on-surface-variant">
              Precision-engineered SIP and ETF allocations designed to accelerate your capital milestones using high-frequency NAV analysis.
            </p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-surface-container px-6 py-4">
            <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">Global Sentiment</p>
            <div className="mt-2 flex items-center gap-2 font-bold text-white">
              <span className="h-2 w-2 rounded-full bg-tertiary" />
              Bullish +2.4%
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
                <span className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">Commodity</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">Yield Predictor: 8.2%</span>
              </div>
              <h3 className="text-3xl font-bold text-white">Digital Gold ETF</h3>
              <p className="mb-8 mt-2 max-w-md text-sm text-on-surface-variant">
                Hedge against fiat volatility with automated rebalancing in physical-backed gold certificates.
              </p>
              <div className="flex flex-wrap items-end gap-12">
                <div>
                  <p className="text-4xl font-black tracking-[-0.05em] text-white">$2,450.00</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-neutral-500">Target Monthly SIP</p>
                </div>
                <div className="relative h-16 min-w-[220px] flex-1">
                  <div className="absolute inset-0 rounded-lg bg-gradient-to-t from-secondary/5 to-transparent" />
                  <svg className="h-full w-full" viewBox="0 0 200 60">
                    <path d="M0 50 Q 25 45, 50 55 T 100 30 T 150 40 T 200 10" fill="none" stroke="#ffb95f" strokeWidth="2" />
                  </svg>
                </div>
              </div>
              <button className="mt-12 w-full rounded-2xl bg-white py-4 text-sm font-bold text-on-primary transition hover:scale-[0.99]">
                Execute Buy
              </button>
            </div>
          </Panel>

          <Panel className="flex flex-col justify-between p-8 md:col-span-4">
            <div>
              <h4 className="mb-6 text-sm font-bold uppercase tracking-[0.18em] text-neutral-400">Efficiency Matrix</h4>
              <div className="space-y-6">
                {[
                  ["Expense Ratio", "0.04%", "text-tertiary"],
                  ["Tracking Error", "0.01%", "text-white"],
                  ["Alpha Generation", "+1.2%", "text-secondary"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-sm text-on-surface-variant">{label}</span>
                    <span className={`font-mono ${tone}`}>{value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="mt-8 border-t border-white/5 pt-8">
              <p className="text-xs italic leading-relaxed text-on-surface-variant">
                &quot;High-frequency rebalancing is currently active for this asset class.&quot;
              </p>
            </div>
          </Panel>

          {[
            ["Equity: Large Cap", "Alpha Bluechip SIP", "$4,200.00", "trending_up", "tertiary"],
            ["Equity: Mid Cap", "Momentum 100 ETF", "$1,850.00", "bolt", "secondary"],
          ].map(([tag, title, value, icon, tone]) => (
            <Panel key={title} className="p-8 md:col-span-6">
              <div className="mb-8 flex items-center justify-between">
                <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${tone === "tertiary" ? "border border-tertiary/20 bg-tertiary/10 text-tertiary" : "border border-secondary/20 bg-secondary/10 text-secondary"}`}>
                  {tag}
                </span>
                <MaterialIcon name={icon} className="text-neutral-500" />
              </div>
              <h3 className="text-2xl font-bold text-white">{title}</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                {tone === "tertiary" ? "Exposure to top 50 capital leaders with volatility dampening logic." : "Aggressive growth focused on mid-sized industry disruptors."}
              </p>
              <div className="mb-8 mt-8 flex items-end justify-between">
                <span className="text-3xl font-black tracking-[-0.05em] text-white">{value}</span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{tone === "tertiary" ? "Min Entry" : "Lumpsum Opt."}</span>
              </div>
              <button className="w-full rounded-2xl border border-white/10 bg-white/5 py-4 text-sm font-bold text-white transition hover:bg-white/10">
                {tone === "tertiary" ? "Initiate SIP" : "Execute Buy"}
              </button>
            </Panel>
          ))}
        </section>

        <section className="mb-24">
          <SectionEyebrow>Projected Acceleration</SectionEyebrow>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {[
              ["Milestone: Retirement", "2038", "-2 Years", "text-tertiary"],
              ["Milestone: Education", "2030", "-8 Months", "text-tertiary"],
              ["Milestone: Leisure Fund", "2026", "On Track", "text-secondary"],
            ].map(([label, year, delta, tone]) => (
              <Panel key={label} className="bg-surface-container-low p-6">
                <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">{label}</p>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-white">{year}</span>
                  <span className={`text-xs font-bold ${tone}`}>{delta}</span>
                </div>
              </Panel>
            ))}
          </div>
        </section>

        <div className="fixed bottom-20 left-6 right-6 z-40 lg:bottom-6 lg:left-[calc(16rem+1.5rem)]">
          <Panel className="overflow-hidden">
            <div className="flex cursor-pointer items-center justify-between bg-white/5 px-6 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-tertiary shadow-emerald" />
                <span className="text-[10px] font-bold uppercase tracking-[0.22em]">MCP Agent: Active</span>
              </div>
              <MaterialIcon name="keyboard_arrow_up" className="text-sm" />
            </div>
            <div className="space-y-1 p-6 font-mono text-[11px] text-neutral-500">
              <div><span className="text-tertiary">&gt;</span> [14:22:01] Fetching Live NAV from Global Ledger...</div>
              <div><span className="text-tertiary">&gt;</span> [14:22:03] Comparing Expense Ratios across 412 ETFs...</div>
              <div><span className="text-tertiary">&gt;</span> [14:22:04] Cross-referencing risk appetite with Portfolio #829...</div>
              <div className="font-bold text-white"><span className="text-tertiary">&gt;</span> [14:22:05] Strategy Generated: Optimal Allocation weighting ready.</div>
            </div>
          </Panel>
        </div>
      </div>
    </AppShell>
  );
}
