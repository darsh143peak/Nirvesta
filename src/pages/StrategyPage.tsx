import { useState } from "react";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";

const milestones = [
  { icon: "rocket_launch", label: "Active Now", title: "System Activation", subtitle: "Deploying $4,500 monthly surplus across all channels.", amount: "", tone: "white", progress: 100 },
  { icon: "favorite", label: "Projected May 2026", title: "Marriage Fund", subtitle: "", amount: "$45,000", tone: "tertiary", progress: 65 },
  { icon: "home", label: "Projected Sep 2030", title: "Coastal Residence", subtitle: "", amount: "$280,000", tone: "secondary", progress: 15 },
  { icon: "castle", label: "Projected 2045", title: "Freedom Ledger", subtitle: "", amount: "$4.2M", tone: "white", progress: 5 },
] as const;

export function StrategyPage() {
  const [surplus] = useState(4500);
  const [expense, setExpense] = useState(1500000);

  return (
    <AppShell
      topNav={[
        { label: "Dashboard", href: "/" },
        { label: "Strategies", href: "/strategy" },
        { label: "Rebalancing", href: "/market-engine" },
      ]}
      metricValue={`$${surplus.toLocaleString()}/mo`}
      rightSlot={<button className="rounded-2xl bg-white px-5 py-2 text-sm font-bold text-on-primary transition hover:scale-95">Optimize</button>}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-5xl font-black tracking-[-0.05em] text-white md:text-7xl">Master Strategy</h1>
            <p className="mt-4 max-w-2xl text-lg text-on-surface-variant">
              Your autonomous wealth roadmap. Adjust your surplus and risk profile to see the future of your capital.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-surface-container p-2">
            {["Conservative", "Balanced", "Aggressive"].map((mode, index) => (
              <button key={mode} className={`rounded-xl px-6 py-2 text-xs font-bold uppercase tracking-[0.18em] ${index === 1 ? "bg-white text-on-primary" : "text-neutral-500 hover:text-white"}`}>
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-12">
          <section className="relative space-y-12 lg:col-span-7">
            <div className="absolute bottom-12 left-8 top-12 w-px bg-gradient-to-b from-tertiary to-transparent" />
            {milestones.map((item, index) => (
              <div key={item.title} className="relative flex items-start gap-8 md:gap-12">
                <div className={`z-10 flex h-16 w-16 items-center justify-center rounded-full ${index === 0 ? "bg-white shadow-glow" : "border border-white/10 bg-surface-container-high"}`}>
                  <MaterialIcon
                    name={item.icon}
                    className={`text-3xl ${index === 0 ? "text-on-primary" : item.tone === "secondary" ? "text-secondary" : item.tone === "tertiary" ? "text-tertiary" : "text-white"}`}
                    fill={index === 0}
                  />
                </div>
                {index === 0 ? (
                  <div className="pt-2">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-tertiary">{item.label}</span>
                    <h3 className="mt-1 text-2xl font-bold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm text-on-surface-variant">{item.subtitle}</p>
                  </div>
                ) : (
                  <Panel className="flex-1 p-6">
                    <div className="mb-4 flex items-start justify-between">
                      <div>
                        <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{item.label}</span>
                        <h3 className="mt-1 text-2xl font-bold text-white">{item.title}</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-bold text-white">{item.amount}</span>
                        <span className={`mt-1 block text-[10px] font-bold uppercase tracking-[0.18em] ${item.tone === "tertiary" ? "text-tertiary" : "text-neutral-500"}`}>
                          {item.progress > 20 ? "On Track" : "Waiting Allocation"}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className={`h-full rounded-full ${item.tone === "secondary" ? "bg-secondary" : item.tone === "tertiary" ? "bg-tertiary" : "bg-white/20"}`} style={{ width: `${item.progress}%` }} />
                    </div>
                  </Panel>
                )}
              </div>
            ))}
          </section>

          <section className="space-y-6 lg:col-span-5">
            <Panel className="relative overflow-hidden p-8 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-tertiary/20 to-transparent opacity-40" />
              <div className="relative z-10">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-tertiary text-on-tertiary shadow-emerald">
                  <MaterialIcon name="auto_awesome" className="text-4xl" fill />
                </div>
                <h2 className="text-2xl font-black text-white">AI Magic Distribute</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-on-surface-variant">
                  Optimize your ${surplus.toLocaleString()} surplus across all goals using our predictive engine.
                </p>
                <button className="mt-8 w-full rounded-2xl bg-white py-4 text-sm font-black uppercase tracking-[0.25em] text-on-primary transition hover:bg-tertiary">
                  Run Allocation
                </button>
              </div>
            </Panel>

            <Panel className="p-8">
              <h4 className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">&quot;What-If&quot; Projections</h4>
              <div className="space-y-4">
                {[
                  ["Retirement Age", "42", "white"],
                  ["Wealth at 50", "$12.4M", "tertiary"],
                  ["Risk Sensitivity", "Medium-High", "secondary"],
                ].map(([label, value, tone]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="text-sm text-on-surface-variant">{label}</span>
                    <span className={`font-bold ${tone === "secondary" ? "text-secondary text-sm uppercase tracking-[0.18em]" : tone === "tertiary" ? "text-xl text-tertiary" : "text-xl text-white"}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel className="p-8">
              <div className="mb-6 flex items-center gap-3">
                <MaterialIcon name="model_training" className="text-secondary" />
                <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">Simulate Life Events</h4>
              </div>
              <div className="space-y-6">
                <div className="rounded-2xl border border-secondary/20 bg-secondary/5 p-4">
                  <p className="text-xs font-medium italic text-secondary/80">&quot;What if I buy an SUV for ₹15 Lakhs and stop my SIP for 1 year?&quot;</p>
                </div>
                <div>
                  <div className="mb-3 flex justify-between">
                    <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Expense Amount</label>
                    <span className="text-sm font-bold text-white">₹{expense.toLocaleString("en-IN")}</span>
                  </div>
                  <input type="range" min={0} max={5000000} step={100000} value={expense} onChange={(event) => setExpense(Number(event.target.value))} className="w-full" />
                </div>
                <div>
                  <label className="mb-3 block text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">Simulated Adjustment</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button className="rounded-xl border border-white/5 bg-white/10 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-white transition hover:bg-white/20">
                      Pause Marriage SIP
                    </button>
                    <button className="rounded-xl border border-secondary bg-secondary/20 py-3 text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
                      Pause All SIPs
                    </button>
                  </div>
                </div>
                <button className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary py-4 text-sm font-black uppercase tracking-[0.24em] text-on-primary-container transition hover:brightness-110">
                  <MaterialIcon name="refresh" className="text-xl" />
                  Recalculate Roadmap
                </button>
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
