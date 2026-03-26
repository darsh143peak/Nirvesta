import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";

const tickerItems = [
  ["-4.2%", "RBI raises repo rate by 25bps", "error"],
  ["+2.1%", "Tesla Q3 earnings beat consensus", "tertiary"],
  ["-0.5%", "Crude oil inventories higher than expected", "secondary"],
  ["-1.8%", "Middle East tensions escalate near shipping lanes", "error"],
] as const;

export function CommandCenterPage() {
  return (
    <AppShell
      topNav={[
        { label: "Terminal", href: "/command-center" },
        { label: "Signals", href: "/sentinel" },
        { label: "Assets", href: "/auditor" },
      ]}
      metricValue="Signal Search"
      rightSlot={
        <div className="hidden items-center gap-2 rounded-full bg-surface-container px-4 py-2 md:flex">
          <MaterialIcon name="search" className="text-sm text-on-surface-variant" />
          <span className="text-sm text-neutral-500">Search signals...</span>
        </div>
      }
    >
      <div className="mx-auto max-w-[1500px]">
        <div className="ticker-mask mb-10 overflow-hidden border-b border-white/5 bg-surface-container py-3">
          <div className="flex w-max animate-ticker gap-8 whitespace-nowrap px-4">
            {[...tickerItems, ...tickerItems].map(([impact, headline, tone], index) => (
              <div key={`${headline}-${index}`} className="flex items-center gap-3">
                <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${tone === "error" ? "bg-error/20 text-error" : tone === "tertiary" ? "bg-tertiary/20 text-tertiary" : "bg-secondary/20 text-secondary"}`}>
                  IMPACT
                </span>
                <span className={tone === "error" ? "text-error" : tone === "tertiary" ? "text-tertiary" : "text-secondary"}>{impact}</span>
                <span className="font-semibold text-on-surface">{headline}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-12">
          <section>
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-3xl font-black uppercase tracking-[-0.04em] text-white">Personalized Signals</h2>
                <p className="mt-1 text-sm text-on-surface-variant">AI-driven impact assessment for your active portfolio</p>
              </div>
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-secondary">
                <span className="h-2 w-2 rounded-full bg-secondary" />
                Live Monitoring
              </span>
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <SignalCard
                priority="HIGH PRIORITY"
                priorityTone="error"
                icon="zone_person_alert"
                title="Taiwan Semiconductor Recovery Spike"
                subtitle="Impact Analysis: Supply Chain Vertical"
                origin="NEWS"
                asset="TATA MOTORS"
                target="+5.0% TARGET"
                reasoning="Semiconductor supply chain recovery in Taiwan directly lowers input costs for Tata Motors' EV division. Margin expansion predicted in Q4."
                cta="Rebalance Portfolio Now"
              />
              <SignalCard
                priority="MEDIUM PRIORITY"
                priorityTone="secondary"
                icon="energy_savings_leaf"
                title="European Green Deal Expansion"
                subtitle="Impact Analysis: Regulatory Shift"
                origin="REGULATION"
                asset="SIEMENS ENERGY"
                target="+3.2% TARGET"
                reasoning="New subsidies for wind turbine manufacturers provide direct revenue tailwinds. Potential for multi-year contract backlog growth."
                cta="Analyze Exposure"
              />
            </div>
          </section>

          <section>
            <div className="mb-8">
              <h2 className="text-3xl font-black uppercase tracking-[-0.04em] text-white">Tactical Briefing</h2>
              <p className="mt-1 text-sm text-on-surface-variant">Hedge-fund grade intelligence for goal-based risk management</p>
            </div>

            <Panel className="overflow-hidden">
              <div className="flex flex-col gap-3 border-b border-white/10 bg-surface-bright/50 px-8 py-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-2 font-bold text-error">
                    <MaterialIcon name="report_problem" className="text-base" />
                    [ACTION REQUIRED]
                  </span>
                  <span className="text-sm text-white">Market Signal: High Impact on your &apos;Retirement&apos; Goal</span>
                </div>
                <span className="text-xs font-mono text-on-surface-variant">ID: SB-8892-ALPHA</span>
              </div>
              <div className="grid gap-12 p-8 lg:grid-cols-3">
                <div className="space-y-8 lg:col-span-2">
                  <div>
                    <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">The Event</h4>
                    <p className="text-2xl font-semibold leading-snug text-white">
                      Geopolitical instability in Region X has caused Brent Crude to spike +12% in 48 hours.
                    </p>
                  </div>
                  <div>
                    <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Risk Assessment</h4>
                    <div className="rounded-2xl border border-error/10 bg-error/5 p-6">
                      <p className="leading-relaxed text-on-surface-variant">
                        Your holdings in <span className="font-bold text-white">Indigo (Aviation)</span> are highly sensitive to fuel prices.
                        AI predicts a <span className="font-bold text-error">10-15% dip</span> over the next fiscal quarter.
                      </p>
                    </div>
                  </div>
                  <div>
                    <h4 className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Hedge Recommendation</h4>
                    <div className="flex items-center gap-6">
                      <div className="flex-1 rounded-xl border border-white/5 bg-surface-container p-4">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-on-surface-variant">SELL 50%</div>
                        <div className="flex justify-between">
                          <span className="font-bold text-white">INDIGO.NS</span>
                          <span className="text-error">-$14,200 Est.</span>
                        </div>
                      </div>
                      <MaterialIcon name="arrow_forward" className="text-on-surface-variant" />
                      <div className="flex-1 rounded-xl border border-tertiary/20 bg-tertiary/5 p-4">
                        <div className="mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-tertiary">BUY EQUIVALENT</div>
                        <div className="flex justify-between">
                          <span className="font-bold text-white">ONGC.NS</span>
                          <span className="text-tertiary">+$14,550 Est.</span>
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-xs italic text-on-surface-variant">Result: Portfolio goal impact neutralized. Expected tracking error &lt; 0.05%.</p>
                  </div>
                </div>

                <div className="rounded-2xl bg-surface-container-low p-6">
                  <h4 className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-on-surface-variant">Execution Summary</h4>
                  <div className="space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-on-surface-variant">Current Goal Health</span>
                      <span className="font-bold text-tertiary">94%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div className="h-full w-[94%] bg-tertiary" />
                    </div>
                    <div className="border-t border-white/5 pt-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-on-surface-variant">Hedge Slippage</span>
                        <span className="text-white">0.12%</span>
                      </div>
                      <div className="mt-3 flex justify-between text-sm">
                        <span className="text-on-surface-variant">Execution Fee</span>
                        <span className="text-white">$0.00 (Zenith Tier)</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-8 space-y-3">
                    <button className="w-full rounded-2xl bg-white py-5 text-lg font-black uppercase tracking-tight text-on-primary transition hover:scale-[0.99]">
                      Execute Hedge in 1-Click
                    </button>
                    <button className="w-full rounded-xl border border-white/10 py-3 text-xs text-on-surface-variant transition hover:text-white">
                      Download Full Research Note (PDF)
                    </button>
                  </div>
                </div>
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function SignalCard(props: {
  priority: string;
  priorityTone: "error" | "secondary";
  icon: string;
  title: string;
  subtitle: string;
  origin: string;
  asset: string;
  target: string;
  reasoning: string;
  cta: string;
}) {
  return (
    <Panel className={`relative overflow-hidden p-6 ${props.priorityTone === "error" ? "ring-2 ring-tertiary/30" : "ring-1 ring-white/10"}`}>
      <div className="absolute right-0 top-0 p-4">
        <span className={`rounded-full px-3 py-1 text-[10px] font-bold ${props.priorityTone === "error" ? "bg-error text-on-primary" : "bg-secondary text-on-primary"}`}>{props.priority}</span>
      </div>
      <div className="mb-6 flex items-start gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${props.priorityTone === "error" ? "bg-surface-bright text-tertiary" : "bg-surface-bright text-secondary"}`}>
          <MaterialIcon name={props.icon} className="text-3xl" />
        </div>
        <div className="max-w-[70%]">
          <h3 className="text-xl font-bold leading-tight text-white">{props.title}</h3>
          <p className="mt-1 text-xs text-on-surface-variant">{props.subtitle}</p>
        </div>
      </div>
      <div className="mb-6 flex items-center justify-between rounded-2xl bg-surface-container-low p-6">
        <FlowNode icon={props.origin === "NEWS" ? "radio" : "gavel"} label={props.origin} />
        <div className="mx-4 h-[2px] flex-1 bg-gradient-to-r from-white/5 via-white/20 to-white/5" />
        <FlowNode icon="business" label={props.asset} />
        <div className="mx-4 h-[2px] flex-1 bg-gradient-to-r from-white/5 via-white/20 to-white/5" />
        <FlowNode icon="trending_up" label={props.target} accent />
      </div>
      <div className="space-y-4">
        <div className="flex gap-3">
          <MaterialIcon name="psychology" className="mt-1 text-sm text-on-surface-variant" />
          <p className="text-sm leading-relaxed text-on-surface-variant">
            <span className="font-medium text-white">AI Reasoning:</span> {props.reasoning}
          </p>
        </div>
        <button className={`w-full rounded-2xl py-4 font-bold transition ${props.priorityTone === "error" ? "bg-white text-on-primary hover:scale-[0.99]" : "border border-white/10 bg-white/5 text-white hover:bg-white/10"}`}>
          {props.cta}
        </button>
      </div>
    </Panel>
  );
}

function FlowNode(props: { icon: string; label: string; accent?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <div className={`flex h-10 w-10 items-center justify-center rounded-full ${props.accent ? "border border-tertiary/30 bg-tertiary/20 text-tertiary" : "border border-white/10 bg-surface-bright text-white"}`}>
        <MaterialIcon name={props.icon} className="text-xl" />
      </div>
      <span className={`text-[10px] font-bold uppercase tracking-[0.14em] ${props.accent ? "text-tertiary" : "text-on-surface-variant"}`}>{props.label}</span>
    </div>
  );
}
