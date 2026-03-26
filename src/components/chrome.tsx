import { NavLink } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { MaterialIcon } from "./MaterialIcon";

type NavItem = {
  label: string;
  href: string;
  icon: string;
};

const primaryNav: NavItem[] = [
  { label: "Terminal", href: "/", icon: "terminal" },
  { label: "Portfolio", href: "/auditor", icon: "account_balance_wallet" },
  { label: "Strategies", href: "/strategy", icon: "query_stats" },
  { label: "Alerts", href: "/sentinel", icon: "notifications_active" },
  { label: "Settings", href: "/connect", icon: "settings" },
];

export function TopBar(props: {
  nav?: Array<{ label: string; href: string }>;
  metricLabel?: string;
  metricValue?: string;
  rightSlot?: React.ReactNode;
  withSidebar?: boolean;
}) {
  const { metricLabel = "Investable Surplus", metricValue = "$42,500.00", rightSlot, withSidebar = true } = props;
  const { isAuthenticated, profile, signOut } = useAuth();
  const visibleNav = primaryNav.filter((item) => isAuthenticated || item.href === "/" || item.href === "/connect");

  return (
    <header className={`fixed left-0 right-0 top-0 z-50 border-b border-white/5 bg-background/80 px-6 py-4 backdrop-blur-xl ${withSidebar ? "lg:left-64" : ""}`}>
      <div className="flex w-full items-center justify-between gap-6">
        <NavLink to="/" className="text-2xl font-black tracking-tighter text-white">
          Nirvesta
        </NavLink>
        {visibleNav.length > 0 ? (
          <nav className="hidden items-center gap-8 md:flex">
            {visibleNav.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) =>
                  `text-sm uppercase tracking-[0.2em] transition-colors ${
                    isActive ? "text-white" : "text-neutral-500 hover:text-white"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        ) : <div className="hidden md:block" />}
        <div className="ml-auto flex items-center gap-4">
          <div className="hidden items-end text-right lg:flex lg:flex-col">
            <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-500">{metricLabel}</span>
            <span className="text-sm font-bold text-tertiary">{metricValue}</span>
          </div>
          {rightSlot}
          {isAuthenticated ? (
            <div className="hidden items-center gap-3 md:flex">
              <div className="text-right">
                <div className="text-sm font-semibold text-white">{profile?.full_name ?? "Verified User"}</div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">JWT Session Active</div>
              </div>
              <button
                onClick={() => void signOut()}
                className="rounded-2xl border border-white/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white transition hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export function Sidebar() {
  const { isAuthenticated } = useAuth();

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-white/5 bg-surface-container-lowest px-4 pb-6 pt-24 lg:flex">
      <div className="mb-8 px-4">
        <h2 className="text-sm font-bold uppercase tracking-[0.22em] text-white">Wealth Ledger</h2>
        <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-neutral-500">Autonomous Mode</p>
      </div>
      <nav className="space-y-1">
        {primaryNav.filter((item) => isAuthenticated || item.href === "/" || item.href === "/connect").map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-2xl px-4 py-3 text-sm uppercase tracking-[0.18em] transition-all ${
                isActive ? "bg-white/10 text-white" : "text-neutral-500 hover:bg-white/5 hover:text-white"
              }`
            }
          >
            <MaterialIcon name={item.icon} className="text-xl" fill={item.href === "/sentinel"} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <button className="mt-auto rounded-2xl border border-tertiary/20 bg-tertiary/10 px-4 py-4 text-[10px] font-bold uppercase tracking-[0.3em] text-tertiary transition hover:bg-tertiary/20">
        New Strategy
      </button>
    </aside>
  );
}

export function MobileDock() {
  const { isAuthenticated } = useAuth();
  const visibleNav = primaryNav.filter((item) => isAuthenticated || item.href === "/" || item.href === "/connect");

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex items-center justify-around rounded-t-[2rem] border-t border-white/10 bg-background/90 px-4 py-3 backdrop-blur-xl lg:hidden">
      {visibleNav.slice(0, 4).map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) =>
            `flex min-w-[74px] flex-col items-center justify-center rounded-2xl px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition ${
              isActive ? "bg-white text-on-primary" : "text-neutral-400"
            }`
          }
        >
          <MaterialIcon name={item.icon} className="text-xl" fill={item.href === "/sentinel"} />
          <span className="mt-1">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell(props: {
  children: React.ReactNode;
  topNav?: Array<{ label: string; href: string }>;
  metricLabel?: string;
  metricValue?: string;
  rightSlot?: React.ReactNode;
  withSidebar?: boolean;
}) {
  const { children, metricLabel, metricValue, rightSlot, withSidebar = true } = props;

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <TopBar metricLabel={metricLabel} metricValue={metricValue} rightSlot={rightSlot} withSidebar={withSidebar} />
      {withSidebar ? <Sidebar /> : null}
      <main className={`${withSidebar ? "lg:ml-64" : ""} px-6 pb-32 pt-24`}>{children}</main>
      <MobileDock />
    </div>
  );
}
