import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel, SectionEyebrow } from "../components/ui";

const brokers = [
  { name: "Zerodha", tag: "Kite API", icon: "rocket_launch", color: "#387ed1" },
  { name: "Upstox", tag: "Direct Link", icon: "account_balance", color: "#673ab7" },
  { name: "Groww", tag: "Fast Connect", icon: "trending_up", color: "#00d09c" },
];

export function AuthConnectPage() {
  return (
    <AppShell
      withSidebar={false}
      topNav={[
        { label: "Terminal", href: "/" },
        { label: "Vault", href: "/auditor" },
        { label: "Insights", href: "/sentinel" },
      ]}
      metricValue="₹12,40,000"
      rightSlot={
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <MaterialIcon name="health_metrics" className="text-xl text-tertiary" fill />
        </div>
      }
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden py-12">
        <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-tertiary/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-secondary/10 blur-[120px]" />
        <div className="relative z-10 grid gap-12 lg:grid-cols-12">
          <section className="space-y-8 py-8 lg:col-span-5">
            <div>
              <SectionEyebrow>The Celestial Ledger</SectionEyebrow>
              <h1 className="mt-4 text-5xl font-black leading-none tracking-[-0.05em] text-white md:text-7xl">
                Connect your capital layer.
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-on-surface-variant">
                Securely synchronize your broker accounts, statements, and holdings into Nirvesta’s autonomous decision engine.
              </p>
            </div>
            <div className="space-y-6">
              {[
                ["security", "Bank-Grade Encryption", "256-bit AES protection for every transaction and portfolio artifact."],
                ["sync_alt", "Real-Time Synchronization", "Live portfolio tracking with zero-latency ingestion paths."],
              ].map(([icon, title, body]) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <MaterialIcon name={icon} className="text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{title}</h3>
                    <p className="mt-1 text-sm text-on-surface-variant">{body}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-6 lg:col-span-7">
            <Panel className="p-8">
              <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Connect Broker</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">Select your primary trading platform</p>
                </div>
                <div className="rounded-full border border-tertiary/20 bg-tertiary/10 px-3 py-1">
                  <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-tertiary">OAuth 2.0 Secure</span>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {brokers.map((broker) => (
                  <button
                    key={broker.name}
                    className="rounded-[1.5rem] border border-white/5 bg-surface-container-high p-6 text-center transition hover:scale-[1.02] hover:bg-surface-bright"
                  >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: `${broker.color}1a` }}>
                      <MaterialIcon name={broker.icon} className="text-3xl" fill />
                    </div>
                    <div className="font-bold text-white">{broker.name}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">{broker.tag}</div>
                  </button>
                ))}
              </div>
              <div className="mt-8 border-t border-white/5 pt-8">
                <div className="mb-4 flex items-center gap-4">
                  <span className="h-px flex-1 bg-white/5" />
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-neutral-500">Manual Entry</span>
                  <span className="h-px flex-1 bg-white/5" />
                </div>
                <div className="relative flex cursor-pointer flex-col items-center justify-center overflow-hidden rounded-[1.5rem] border-2 border-dashed border-white/10 bg-surface-container-lowest p-10 text-center transition hover:border-tertiary/40">
                  <div className="absolute inset-0 rounded-[1.5rem] border-2 border-tertiary/30 opacity-20 animate-pulseSoft" />
                  <div className="relative z-10">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                      <MaterialIcon name="upload_file" className="text-3xl text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-white">Upload Portfolio CSV</h4>
                    <p className="mx-auto mt-2 max-w-sm text-sm text-on-surface-variant">
                      Drag and drop your CAS or broker statement here. We support all major Indian platforms.
                    </p>
                    <div className="mt-6 flex justify-center gap-2">
                      {[".CSV", ".XLSX", ".PDF"].map((ext) => (
                        <span key={ext} className="rounded-lg bg-white/5 px-3 py-1 text-[10px] font-mono text-neutral-400">
                          {ext}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Panel>
            <div className="flex items-center justify-between px-2 text-sm text-on-surface-variant">
              <button className="transition hover:text-white">Don&apos;t have an account? <span className="font-bold text-white">Sign Up</span></button>
              <button className="transition hover:text-white">Need help connecting?</button>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
