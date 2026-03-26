import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";

const options = [
  ["Inject Capital", "Buy the dip aggressively"],
  ["Hold Reserve", "Wait for further stability"],
  ["Rebalance Only", "Shift from Debt to Equity"],
  ["De-risk", "Move to Gold or Cash"],
] as const;

export function ConciergePage() {
  return (
    <AppShell
      withSidebar={false}
      topNav={[
        { label: "Terminal", href: "/" },
        { label: "Vault", href: "/auditor" },
        { label: "Concierge", href: "/concierge" },
      ]}
      metricValue="$42,500.00"
      rightSlot={
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/5 bg-surface-container-high">
          <MaterialIcon name="bolt" className="text-sm" fill />
        </div>
      }
    >
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 lg:flex-row">
        <aside className="order-2 w-full space-y-6 lg:order-1 lg:w-80">
          <Panel className="border-white/5 bg-surface-container-low p-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="h-8 w-2 rounded-full bg-tertiary" />
              <h2 className="text-sm font-bold uppercase tracking-[0.2em]">User Persona</h2>
            </div>
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex justify-between text-[10px] uppercase tracking-[0.2em] text-on-surface-variant">
                  <span>Profile Maturity</span>
                  <span className="text-tertiary">45%</span>
                </div>
                <div className="h-1 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full w-[45%] bg-tertiary" />
                </div>
              </div>
              <div className="rounded-xl border border-white/5 bg-surface-container p-4">
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-xs uppercase tracking-[0.16em] text-on-surface-variant">Risk Archetype</span>
                  <MaterialIcon name="trending_up" className="text-lg text-secondary" />
                </div>
                <div className="text-xl font-bold tracking-tight text-white">Growth Seeker</div>
                <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">
                  System mapping suggests high emotional resilience during volatility.
                </p>
              </div>
              {[
                ["Time Horizon", "12+ Years", "text-white"],
                ["Liquidity Need", "Medium", "text-secondary"],
                ["Volatility Limit", "22.4%", "text-tertiary"],
              ].map(([label, value, tone]) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-neutral-400">{label}</span>
                  <span className={`text-xs font-bold ${tone}`}>{value}</span>
                </div>
              ))}
            </div>
          </Panel>
          <div className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-surface-container-lowest p-6 opacity-60">
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface-container-lowest to-transparent" />
            <div className="relative z-10">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-[0.18em]">Locked Strategy</h3>
                <MaterialIcon name="lock" className="text-xs" />
              </div>
              <div className="flex h-32 items-center justify-center rounded-xl bg-white/5">
                <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">Complete Onboarding</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="order-1 flex-1 space-y-6 lg:order-2">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                <MaterialIcon name="smart_toy" className="text-tertiary" fill />
              </div>
              <div>
                <h1 className="text-lg font-bold tracking-tight">Wealth Concierge</h1>
                <p className="flex items-center gap-2 text-xs text-on-surface-variant">
                  <span className="h-1.5 w-1.5 rounded-full bg-tertiary" />
                  Analyzing portfolio delta in real-time
                </p>
              </div>
            </div>
            <button className="p-2 text-neutral-500 transition hover:text-white">
              <MaterialIcon name="restart_alt" />
            </button>
          </div>

          <div className="flex max-h-[665px] flex-col gap-6 overflow-y-auto rounded-[2rem] border border-white/5 bg-surface-container-lowest p-6">
            <ChatBubble
              kind="ai"
              text="Welcome back. I've processed your initial asset declarations. To calibrate your Autonomous Wealth Engine, I need to understand your physiological response to market shifts."
            />
            <ChatBubble
              kind="ai"
              text="Imagine your ₹100,000 portfolio drops to ₹80,000 in a single week due to a global supply chain disruption. What is your immediate instinct?"
              highlight
            />
            <ChatBubble kind="user" text="I'd likely stay the course, but I'd feel some anxiety about the timeframe for recovery." />
            <ChatBubble
              kind="ai"
              text="Understood. That reflects a Pragmatic Resilience profile. Let's refine that. If you had an additional ₹20,000 liquid during that same 20% drop, would you:"
            />
            <div className="grid max-w-[600px] gap-3 pl-12 md:grid-cols-2">
              {options.map(([title, subtitle]) => (
                <button key={title} className="rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-white/20 hover:bg-white/10">
                  <div className="text-xs font-bold text-white">{title}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-neutral-500">{subtitle}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              placeholder="Type your response here..."
              className="w-full rounded-2xl border-none bg-surface-container-high py-5 pl-6 pr-24 text-sm text-white outline-none placeholder:text-neutral-600"
            />
            <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
              <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 transition hover:bg-white/10">
                <MaterialIcon name="mic" className="text-lg text-neutral-400" />
              </button>
              <button className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-on-primary transition hover:bg-tertiary">
                <MaterialIcon name="arrow_upward" className="text-lg" />
              </button>
            </div>
          </div>
          <p className="text-center text-[10px] uppercase tracking-[0.2em] text-neutral-600">
            Concierge AI can make mistakes. Always review generated strategies.
          </p>
        </section>
      </div>
    </AppShell>
  );
}

function ChatBubble(props: { kind: "ai" | "user"; text: string; highlight?: boolean }) {
  const isUser = props.kind === "user";
  return (
    <div className={`flex max-w-[85%] gap-4 ${isUser ? "ml-auto flex-row-reverse" : ""}`}>
      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${isUser ? "bg-white text-on-primary" : "border border-white/10 bg-surface-container-high"}`}>
        <MaterialIcon name={isUser ? "person" : "support_agent"} className="text-[16px]" fill={isUser} />
      </div>
      <div
        className={`rounded-2xl p-5 text-sm leading-relaxed ${
          isUser
            ? "rounded-br-sm bg-white font-medium text-on-primary"
            : props.highlight
              ? "rounded-bl-sm bg-surface-container text-white"
              : "rounded-bl-sm bg-surface-container text-on-surface-variant"
        }`}
      >
        {props.text}
      </div>
    </div>
  );
}
