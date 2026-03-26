import { AuthConnectPage } from "./pages/AuthConnectPage";
import { CommandCenterPage } from "./pages/CommandCenterPage";
import { ConciergePage } from "./pages/ConciergePage";
import { LandingPage } from "./pages/LandingPage";
import { MarketEnginePage } from "./pages/MarketEnginePage";
import { PortfolioAuditorPage } from "./pages/PortfolioAuditorPage";
import { SentinelPage } from "./pages/SentinelPage";
import { StrategyPage } from "./pages/StrategyPage";

export const routes = [
  { path: "/", element: LandingPage },
  { path: "/connect", element: AuthConnectPage },
  { path: "/concierge", element: ConciergePage },
  { path: "/strategy", element: StrategyPage },
  { path: "/market-engine", element: MarketEnginePage },
  { path: "/sentinel", element: SentinelPage },
  { path: "/auditor", element: PortfolioAuditorPage },
  { path: "/command-center", element: CommandCenterPage },
] as const;
