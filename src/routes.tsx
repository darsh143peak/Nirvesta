import { AuthConnectPage } from "./pages/AuthConnectPage";
import { CommandCenterPage } from "./pages/CommandCenterPage";
import { ConciergePage } from "./pages/ConciergePage";
import { LandingPage } from "./pages/LandingPage";
import { MarketEnginePage } from "./pages/MarketEnginePage";
import { PortfolioAuditorPage } from "./pages/PortfolioAuditorPage";
import { PortfolioRebalancerPage } from "./pages/PortfolioRebalancerPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SentinelPage } from "./pages/SentinelPage";
import { StrategyPage } from "./pages/StrategyPage";

export const routes = [
  { path: "/", element: LandingPage, protected: false },
  { path: "/connect", element: AuthConnectPage, protected: false },
  { path: "/concierge", element: ConciergePage, protected: true },
  { path: "/strategy", element: StrategyPage, protected: true },
  { path: "/market-engine", element: MarketEnginePage, protected: true },
  { path: "/recommendations", element: MarketEnginePage, protected: true },
  { path: "/sentinel", element: SentinelPage, protected: true },
  { path: "/auditor", element: PortfolioAuditorPage, protected: true },
  { path: "/rebalancer", element: PortfolioRebalancerPage, protected: true },
  { path: "/command-center", element: CommandCenterPage, protected: true },
  { path: "/settings", element: SettingsPage, protected: true },
] as const;
