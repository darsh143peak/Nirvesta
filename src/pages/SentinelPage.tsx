import { useState } from "react";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";

export function SentinelPage() {
  const [showAlert, setShowAlert] = useState(true);

  return (
    <AppShell
      topNav={[
        { label: "Dashboard", href: "/" },
        { label: "Portfolio", href: "/auditor" },
        { label: "Insights", href: "/sentinel" },
        { label: "Settings", href: "/connect" },
      ]}
      metricValue="$142,050.00"
      rightSlot={
        <button className="rounded-full bg-surface-bright p-2 transition hover:scale-95">
          <MaterialIcon name="notifications_active" className="text-white" fill />
        </button>
      }
    >
      <div className="mx-auto max-w-7xl">
        <header className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-tertiary">Sentinel Protocol Active</span>
            <h1 className="text-5xl font-black tracking-[-0.05em] text-white lg:text-7xl">ZENITH SENTINEL</h1>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-surface-container p-1">
            <button className="rounded-xl bg-white px-6 py-2 text-sm font-bold text-on-primary">LIVE FEED</button>
            <button className="rounded-xl px-6 py-2 text-sm font-medium text-on-surface-variant transition hover:text-white">HISTORICAL</button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant">Live Impact Feed</h3>
              <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-tertiary">
                <span className="h-2 w-2 rounded-full bg-tertiary" />
                Synchronized
              </span>
            </div>
            {[
              ["14:22:01 UTC", "ZENITH IMPACT: -4.2%", "error", "Global Logistics Hub in Singapore reports 48-hour automated system failure."],
              ["13:45:12 UTC", "ZENITH IMPACT: +2.8%", "tertiary", "Clean Fusion Grid announces 99.9% stable uptime for Nordic Sector."],
              ["12:10:05 UTC", "ZENITH IMPACT: NEUTRAL", "secondary", "Lunar Mining Initiative expands to South Pole craters."],
            ].map(([time, impact, tone, title], index) => (
              <Panel key={title} className={`cursor-pointer p-6 transition hover:bg-white/5 ${index === 2 ? "opacity-60" : ""}`}>
                <div className="mb-4 flex items-start justify-between">
                  <span className="text-[10px] font-mono text-neutral-500">{time}</span>
                  <span className={`rounded-full px-3 py-1 text-[10px] font-bold tracking-tight ${tone === "error" ? "border border-error/20 bg-error/10 text-error" : tone === "tertiary" ? "border border-tertiary/20 bg-tertiary/10 text-tertiary" : "border border-secondary/20 bg-secondary/10 text-secondary"}`}>
                    {impact}
                  </span>
                </div>
                <h4 className="text-xl font-bold leading-tight text-white">{title}</h4>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Autonomous signal propagation is tracking first-order, second-order, and portfolio-specific downstream effects.
                </p>
              </Panel>
            ))}
          </section>

          <section className="lg:col-span-7">
            <Panel className="relative h-full overflow-hidden p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(111,251,190,0.08),transparent_45%)] opacity-80" />
              <div className="relative z-10 flex h-full flex-col">
                <div className="mb-12 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-[0.18em] text-on-surface-variant">Propagated Ripple Map</h3>
                  <MaterialIcon name="fullscreen" className="cursor-pointer text-neutral-500 transition hover:text-white" />
                </div>
                <div className="flex flex-grow flex-col items-center justify-around gap-8 py-4 text-center">
                  <Node icon="error" label="News Headline" title="Singapore Port Failure" accent="error" />
                  <div className="h-12 w-px bg-gradient-to-b from-error to-surface-bright" />
                  <Node icon="inventory_2" label="Affected Sector" title="Global Logistics & Tech" accent="white" />
                  <div className="h-12 w-px bg-gradient-to-b from-surface-bright to-tertiary" />
                  <div className="flex flex-wrap items-start justify-center gap-12">
                    <Node icon="memory" label="Your Stock" title="ASML" subtitle="Predicted: -2.4%" accent="error" />
                    <Node icon="local_shipping" label="Your Stock" title="MAERSK" subtitle="Predicted: -5.1%" accent="error" />
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-8">
                  <div>
                    <span className="text-xs text-neutral-500">Aggregate Impact on Portfolio</span>
                    <div className="mt-2 text-2xl font-black text-error">-0.82% ($14,402)</div>
                  </div>
                  <button className="rounded-2xl border border-white/10 bg-white/10 px-8 py-3 font-bold text-white transition hover:bg-white/20">
                    Mitigate Risk
                  </button>
                </div>
              </div>
            </Panel>
          </section>
        </div>
      </div>

      {showAlert ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <Panel className="w-full max-w-lg p-1 shadow-[0_0_128px_rgba(0,0,0,0.8)]">
            <div className="rounded-[1.85rem] bg-surface-container-highest p-8">
              <div className="mb-8 flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-error">
                  <MaterialIcon name="warning" className="text-on-primary" fill />
                </div>
                <button className="text-neutral-500 transition hover:text-white" onClick={() => setShowAlert(false)}>
                  <MaterialIcon name="close" />
                </button>
              </div>
              <h2 className="text-3xl font-black tracking-[-0.04em] text-white">CRITICAL REBALANCING ALERT</h2>
              <p className="mb-8 mt-4 leading-relaxed text-on-surface-variant">
                The sudden Port Failure in Singapore has triggered a <span className="font-bold text-error">Priority-1 Risk Level</span> for your Technology and Logistics exposure.
              </p>
              <div className="mb-8 rounded-2xl bg-surface-container-lowest p-6">
                <div className="mb-4 flex justify-between text-sm">
                  <span className="text-neutral-500">Vulnerability Score</span>
                  <span className="font-bold text-error">88 / 100</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-[88%] bg-error" />
                </div>
                <div className="mt-4 flex justify-between text-sm">
                  <span className="text-neutral-500">Auto-Mitigation Ready</span>
                  <span className="font-bold text-tertiary">Active</span>
                </div>
              </div>
              <div className="space-y-3">
                <button className="w-full rounded-2xl bg-white py-4 text-lg font-black text-on-primary transition hover:scale-[0.99]">REBALANCE NOW</button>
                <button className="w-full rounded-2xl py-4 font-bold text-on-surface-variant transition hover:text-white" onClick={() => setShowAlert(false)}>
                  Ignore Alert
                </button>
              </div>
            </div>
          </Panel>
        </div>
      ) : null}
    </AppShell>
  );
}

function Node(props: { icon: string; label: string; title: string; subtitle?: string; accent: "error" | "white" }) {
  const accentClass = props.accent === "error" ? "bg-error text-on-primary" : "bg-white/10 text-white border border-white/10";
  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`flex h-16 w-16 items-center justify-center rounded-full ${accentClass}`}>
        <MaterialIcon name={props.icon} className="text-2xl" fill={props.accent === "error"} />
      </div>
      <div>
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{props.label}</span>
        <p className="mt-1 text-sm font-semibold text-white">{props.title}</p>
        {props.subtitle ? <p className="mt-1 text-xs font-bold text-error">{props.subtitle}</p> : null}
      </div>
    </div>
  );
}
