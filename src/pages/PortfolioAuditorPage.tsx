import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";

export function PortfolioAuditorPage() {
  return (
    <AppShell
      topNav={[
        { label: "Dashboard", href: "/" },
        { label: "Portfolio", href: "/auditor" },
        { label: "Strategies", href: "/strategy" },
      ]}
      metricValue="$42,850.00"
      rightSlot={
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-surface-container-highest">
          <MaterialIcon name="favorite" className="text-xl text-tertiary" fill />
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-4xl font-extrabold tracking-tight text-white">Portfolio Auditor</h2>
            <p className="mt-2 max-w-xl text-on-surface-variant">
              Deep scan of your active holdings. AI analysis identifies inefficiencies and recommends high-precision swaps.
            </p>
          </div>
          <span className="flex items-center gap-2 rounded-full border border-tertiary/20 bg-surface-container px-4 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-tertiary">
            <MaterialIcon name="auto_awesome" className="text-xs" />
            AI Live
          </span>
        </header>

        <div className="grid gap-8 lg:grid-cols-3">
          <section className="space-y-6 lg:col-span-1">
            <Panel className="relative overflow-hidden p-6">
              <div className="absolute right-0 top-0 p-4">
                <MaterialIcon name="swap_horizontal_circle" className="rotate-12 text-6xl text-tertiary/20" />
              </div>
              <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-tertiary">Optimization Alert</h3>
              <div className="relative z-10 space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-white/5 p-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Current Holding</p>
                    <p className="font-bold text-white">Gold ETF A</p>
                  </div>
                  <MaterialIcon name="arrow_forward" className="text-neutral-600" />
                  <div className="text-right">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-tertiary">Recommended</p>
                    <p className="font-bold text-white">Gold ETF B</p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed text-on-surface-variant">
                  You own Gold ETF A. Swap to Gold ETF B to save <span className="font-bold text-white">0.5% annual fees</span>. Estimated savings: $1,240/yr.
                </p>
                <button className="w-full rounded-2xl bg-white py-4 text-xs font-bold uppercase tracking-[0.2em] text-on-primary transition hover:scale-[0.99]">
                  Execute Swap
                </button>
              </div>
            </Panel>

            <Panel className="p-6">
              <h3 className="mb-6 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500">Diversification Score</h3>
              <div className="flex items-center justify-center py-8">
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-[8px] border-white/5" />
                  <div className="absolute inset-0 rounded-full border-[8px] border-transparent border-t-tertiary border-r-tertiary rotate-45" />
                  <div className="text-center">
                    <span className="text-4xl font-black text-white">82</span>
                    <span className="block text-[10px] uppercase tracking-[0.2em] text-neutral-500">Optimal</span>
                  </div>
                </div>
              </div>
            </Panel>
          </section>

          <section className="lg:col-span-2">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ["AAPL", "Apple Inc.", "High Expense Ratio", "64/100", "$12,450.00", "+4.2%", "secondary"],
                ["TSLA", "Tesla, Inc.", "Efficient Holding", "88/100", "$8,210.00", "-2.1%", "tertiary"],
                ["VTI", "Vanguard Total Stock", "Overlap Detected", "12/100", "$45,000.00", "+1.8%", "error"],
              ].map(([symbol, name, badge, impact, value, performance, tone]) => (
                <Panel key={symbol} className="p-6">
                  <div className="mb-6 flex items-start justify-between">
                    <div>
                      <h4 className="text-lg font-bold leading-none text-white">{symbol}</h4>
                      <p className="mt-1 text-xs text-neutral-500">{name}</p>
                    </div>
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${tone === "secondary" ? "border border-secondary/20 bg-secondary/10 text-secondary" : tone === "tertiary" ? "border border-tertiary/20 bg-tertiary/10 text-tertiary" : "border border-error/20 bg-error/10 text-error"}`}>
                      {badge}
                    </span>
                  </div>
                  <div className="mb-6">
                    <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                      <span>Volatility Impact</span>
                      <span className="text-white">{impact}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full rounded-full bg-gradient-to-r from-tertiary via-secondary to-error" style={{ width: impact.replace("/100", "%") }} />
                    </div>
                  </div>
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">Value</p>
                      <p className="font-bold text-white">{value}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-[10px] uppercase tracking-[0.18em] ${performance.startsWith("-") ? "text-error" : "text-tertiary"}`}>Performance</p>
                      <p className={`font-bold ${performance.startsWith("-") ? "text-error" : "text-tertiary"}`}>{performance}</p>
                    </div>
                  </div>
                </Panel>
              ))}
              <div className="flex cursor-pointer flex-col items-center justify-center rounded-[2rem] border-2 border-dashed border-white/5 p-6 transition hover:border-white/20">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/5">
                  <MaterialIcon name="add" className="text-white" />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Add Asset to Audit</p>
              </div>
            </div>

            <Panel className="mt-8 bg-surface-container-low p-8">
              <h3 className="mb-6 text-xl font-bold text-white">Annualized Risk Analysis</h3>
              <div className="mb-4 flex h-32 items-end gap-1">
                {[40, 65, 30, 50, 20, 90, 45, 60, 75, 35].map((height, index) => (
                  <div key={height + index} className={`flex-1 rounded-t-lg ${index === 5 ? "bg-tertiary" : index === 8 ? "bg-secondary/30" : index === 1 ? "bg-tertiary/20" : "bg-white/5"}`} style={{ height: `${height}%` }} />
                ))}
              </div>
              <div className="flex justify-between text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                <span>JAN</span>
                <span>MAR</span>
                <span>JUN</span>
                <span>SEP</span>
                <span>DEC</span>
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
