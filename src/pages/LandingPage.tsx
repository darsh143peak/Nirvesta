import { Link } from "react-router-dom";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel, RouteCard, SectionEyebrow, StatPill } from "../components/ui";

const routeCards = [
  ["Connect & Authenticate", "Secure broker linking, statement uploads, and zero-latency ingestion for the Nirvesta ledger.", "/connect", "lock"],
  ["Concierge Onboarding", "Conversational risk discovery and persona mapping for autonomous portfolio behavior.", "/concierge", "support_agent"],
  ["Master Strategy Roadmap", "Goal-based planning with surplus sliders, milestone timing, and life-event simulations.", "/strategy", "rocket_launch"],
  ["Market Opportunity Engine", "Precision ETF and SIP recommendations tuned to accelerate your wealth milestones.", "/recommendations", "query_stats"],
  ["Zenith Sentinel", "Live risk propagation, impact alerts, and one-click mitigations for exposed holdings.", "/sentinel", "notifications_active"],
  ["Portfolio Auditor", "Audit active positions, detect overlap, and surface fee-saving optimization swaps.", "/auditor", "account_balance_wallet"],
  ["Portfolio Rebalancer", "Learn what each portfolio ratio means and get guided rebalance moves instead of generic advice.", "/rebalancer", "sync_alt"],
  ["Command Center", "High-density terminal view with AI briefings, live signals, and tactical execution flows.", "/command-center", "terminal"],
] as const;

const tickerItems = [
  "NIFTY 50: +1.24%",
  "ZENITH USERS SAVED: ₹2.4L TAXES TODAY",
  "GOLD ETF SIGNAL: NEUTRAL",
  "PORTFOLIO DRIFT: 0.02%",
  "BTC/USD: +3.8%",
];

export function LandingPage() {
  return (
    <AppShell
      withSidebar={false}
      topNav={[
        { label: "Terminal", href: "/" },
        { label: "Vault", href: "/connect" },
        { label: "Insights", href: "/sentinel" },
        { label: "Recommendations", href: "/recommendations" },
      ]}
      metricValue="₹12,40,000"
      rightSlot={
        <div className="flex items-center gap-3">
          <button className="rounded-2xl border border-white/20 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/10">
            Sign In
          </button>
          <Link to="/connect" className="rounded-2xl bg-white px-5 py-2 text-sm font-semibold text-on-primary transition hover:scale-95">
            Sign Up
          </Link>
        </div>
      }
    >
      <div className="mx-auto max-w-7xl">
        <section className="pb-12 pt-16 text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2">
            <span className="h-2 w-2 rounded-full bg-tertiary" />
            <span className="text-xs uppercase tracking-[0.25em] text-on-surface-variant">The Celestial Ledger Is Live</span>
          </div>
          <h1 className="mx-auto max-w-5xl text-6xl font-black leading-[0.9] tracking-[-0.05em] text-white md:text-8xl">
            The End of
            <br />
            <span className="bg-gradient-to-r from-white via-neutral-400 to-white bg-clip-text text-transparent">
              Financial Anxiety.
            </span>
          </h1>
          <p className="mx-auto mt-8 max-w-3xl text-lg leading-relaxed text-on-surface-variant md:text-xl">
            Nirvesta turns the mockups you shared into a living React product: autonomous planning, live alerts,
            onboarding flows, audit surfaces, and a high-conviction wealth interface.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 md:flex-row">
            <Link to="/connect" className="rounded-[1.25rem] bg-white px-10 py-4 text-lg font-bold text-on-primary shadow-glow transition hover:scale-105">
              Secure Access
            </Link>
            <Link to="/strategy" className="rounded-[1.25rem] border border-white/10 bg-white/5 px-10 py-4 text-lg font-semibold text-white transition hover:bg-white/10">
              View Methodology
            </Link>
          </div>
        </section>

        <section className="ticker-mask mb-20 overflow-hidden border-y border-white/5 bg-surface-container-lowest py-3">
          <div className="flex w-max animate-ticker gap-12 whitespace-nowrap px-4">
            {[...tickerItems, ...tickerItems].map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-center gap-3">
                <span className="text-xs uppercase tracking-[0.18em] text-neutral-500">{item.split(":")[0]}:</span>
                <span className="text-xs font-mono text-white">{item.split(":").slice(1).join(":").trim()}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-12">
          <Panel className="glow-grid relative overflow-hidden p-8 lg:col-span-8 md:p-12">
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-tertiary/5 blur-[120px]" />
            <div className="relative z-10 flex flex-col gap-12">
              <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div>
                  <SectionEyebrow>Zenith Optimized Projection</SectionEyebrow>
                  <h2 className="mt-3 text-3xl font-bold text-white md:text-4xl">Product map, not just a prototype</h2>
                  <p className="mt-3 max-w-xl text-on-surface-variant">
                    Every major mockup has been mapped to a route, wrapped in a shared shell, and styled with a reusable Nirvesta theme.
                  </p>
                </div>
                <div className="text-right">
                  <span className="block text-xs uppercase tracking-[0.25em] text-neutral-500">Pages implemented</span>
                  <span className="text-5xl font-black tracking-[-0.05em] text-tertiary">7+</span>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <StatPill label="Standard Growth" value="Scaffolded from scratch" />
                <StatPill label="Zenith Alpha" value="Routed React + TS app" tone="tertiary" />
              </div>
              <div className="rounded-[2rem] border border-white/5 bg-surface-container-low p-6">
                <div className="mb-6 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Experience Layers</p>
                    <p className="mt-2 text-xl font-bold text-white">Landing, Connect, Concierge, Strategy, Engine, Sentinel</p>
                  </div>
                  <MaterialIcon name="health_and_safety" className="text-4xl text-tertiary" fill />
                </div>
                <div className="flex h-56 items-end justify-between gap-3 rounded-[1.5rem] border border-white/5 bg-black/20 px-4 pb-6 pt-10">
                  {[40, 46, 52, 58, 64, 74, 88, 100].map((height, index) => (
                    <div key={height} className={`w-full rounded-t-xl ${index < 4 ? "bg-white/10" : "bg-tertiary/70"}`} style={{ height: `${height}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </Panel>

          <Panel className="flex flex-col justify-between p-8 lg:col-span-4">
            <div>
              <MaterialIcon name="health_and_safety" className="mb-6 text-4xl text-tertiary" fill />
              <h3 className="text-2xl font-bold text-white">Portfolio Resilience</h3>
              <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">
                Shared tokens, glass surfaces, mobile dock behavior, and sidebar navigation keep the repo cohesive across every screen.
              </p>
            </div>
            <div className="py-10">
              <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border-8 border-tertiary/20">
                <div className="text-center">
                  <div className="text-5xl font-black text-white">82</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.25em] text-neutral-500">Optimum</div>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-xs uppercase tracking-[0.18em] text-neutral-500">
                <span>Route Coverage</span>
                <span className="text-tertiary">Excellent</span>
              </div>
              <div className="h-1 rounded-full bg-white/5">
                <div className="h-1 w-[92%] rounded-full bg-tertiary" />
              </div>
            </div>
          </Panel>
        </section>

        <section className="mt-24">
          <div className="mb-8">
            <SectionEyebrow>Experience Map</SectionEyebrow>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-white">Every page in the repo</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {routeCards.map(([title, description, href, icon]) => (
              <RouteCard key={href} title={title} description={description} href={href} icon={icon} />
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
