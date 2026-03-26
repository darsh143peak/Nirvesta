import { FormEvent, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";
import { hasSupabaseEnv, supabase } from "../lib/supabase";

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1";
const riskModes = ["conservative", "balanced", "aggressive"] as const;

type RiskMode = (typeof riskModes)[number];

type StrategyMilestone = {
  title: string;
  target_year: number;
  target_amount: string;
  status: string;
};

type StrategySimulationResponse = {
  recommended_split: Record<string, number>;
  projected_retirement_age: number;
  wealth_at_fifty: string;
  risk_sensitivity: string;
  milestones: StrategyMilestone[];
  summary: string;
};

type EditableGoal = {
  goal_name: string;
  target_amount: string;
  target_year: string;
  icon: string;
  status: string;
};

type StrategyChatMessage = {
  role: "assistant" | "user";
  text: string;
};

type StoredStrategyGoal = {
  goal_name?: string;
  target_amount?: number;
  target_year?: number;
  icon?: string;
  status?: string;
};

export function StrategyPage() {
  const { profile, user, updateProfile, refreshProfile } = useAuth();
  const [riskMode, setRiskMode] = useState<RiskMode>(toRiskMode(profile?.risk_attitude));
  const [monthlySurplus, setMonthlySurplus] = useState<number>(profile?.monthly_investable_surplus ?? 0);
  const [expense, setExpense] = useState(0);
  const [pauseMonths, setPauseMonths] = useState(0);
  const [goal, setGoal] = useState<EditableGoal>(createInitialGoal(profile?.primary_goal, profile?.time_horizon_years, null));
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<StrategyChatMessage[]>([
    {
      role: "assistant",
      text: "Ask me any 'What if...' question about your plan. I’ll use your saved goal, monthly contribution, and live simulation inputs to estimate the impact.",
    },
  ]);
  const [strategy, setStrategy] = useState<StrategySimulationResponse | null>(null);
  const [strategyError, setStrategyError] = useState<string | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(true);
  const [goalError, setGoalError] = useState<string | null>(null);
  const [goalSaveMessage, setGoalSaveMessage] = useState<string | null>(null);
  const [savingGoal, setSavingGoal] = useState(false);

  useEffect(() => {
    setMonthlySurplus(profile?.monthly_investable_surplus ?? 0);
    setRiskMode(toRiskMode(profile?.risk_attitude));
  }, [profile?.monthly_investable_surplus, profile?.risk_attitude]);

  useEffect(() => {
    const storedGoal = getStoredGoalFromUserMetadata(user?.user_metadata?.strategy_goal);
    setGoal(createInitialGoal(profile?.primary_goal, profile?.time_horizon_years, storedGoal));
  }, [profile?.primary_goal, profile?.time_horizon_years, user?.user_metadata]);

  useEffect(() => {
    let cancelled = false;

    async function loadStrategy() {
      if (monthlySurplus <= 0) {
        if (!cancelled) {
          setStrategy(null);
          setStrategyError("No data available. Add a positive monthly contribution to generate projections.");
          setStrategyLoading(false);
        }
        return;
      }

      setStrategyLoading(true);
      setStrategyError(null);

      try {
        const payload = {
          monthly_surplus: monthlySurplus,
          risk_mode: riskMode,
          event: expense > 0 || pauseMonths > 0
            ? {
                label: "Lifestyle Spend",
                amount: expense,
                sip_pause_months: pauseMonths,
              }
            : undefined,
        };

        const response = await fetchJson<StrategySimulationResponse>(`${apiBaseUrl}/strategy/simulate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!cancelled) {
          setStrategy(response);
        }
      } catch {
        if (!cancelled) {
          setStrategy(null);
          setStrategyError("No data available right now. Strategy simulation could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setStrategyLoading(false);
        }
      }
    }

    void loadStrategy();
    return () => {
      cancelled = true;
    };
  }, [expense, monthlySurplus, pauseMonths, riskMode]);

  const goalValidation = useMemo(() => validateGoal(goal), [goal]);
  const hasGoal = Boolean(goal.goal_name.trim() && Number(goal.target_amount) > 0 && Number(goal.target_year) >= new Date().getFullYear());
  const projectedGoalCard = useMemo(
    () => (hasGoal ? buildProjectedGoalCard(goal, monthlySurplus, expense, pauseMonths, strategy?.milestones ?? []) : null),
    [expense, goal, hasGoal, monthlySurplus, pauseMonths, strategy?.milestones],
  );
  const suggestedQuestions = useMemo(
    () => buildSuggestedQuestions(goal, monthlySurplus, expense),
    [goal, monthlySurplus, expense],
  );

  function submitScenario(question: string) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      return;
    }

    setMessages((current) => [
      ...current,
      { role: "user", text: trimmedQuestion },
      {
        role: "assistant",
        text: buildStrategyResponse({
          question: trimmedQuestion,
          monthlySurplus,
          expense,
          pauseMonths,
          strategy,
          goal,
        }),
      },
    ]);
    setChatInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitScenario(chatInput);
  }

  async function handleSaveGoal() {
    setGoalSaveMessage(null);

    if (goalValidation) {
      setGoalError(goalValidation);
      return;
    }

    setGoalError(null);
    setSavingGoal(true);

    try {
      const profileResult = await updateProfile({
        monthly_investable_surplus: monthlySurplus,
        risk_attitude: capitalize(riskMode),
        primary_goal: goal.goal_name.trim(),
        time_horizon_years: Math.max(Number(goal.target_year) - new Date().getFullYear(), 1),
      });

      if (profileResult.error) {
        setGoalError(profileResult.error);
        return;
      }

      if (supabase && hasSupabaseEnv) {
        const { error } = await supabase.auth.updateUser({
          data: {
            strategy_goal: {
              goal_name: goal.goal_name.trim(),
              target_amount: Number(goal.target_amount),
              target_year: Number(goal.target_year),
              icon: goal.icon.trim() || "flag",
              status: goal.status.trim() || "building",
            },
          },
        });

        if (error) {
          setGoalError(error.message);
          return;
        }
      }

      if (user?.id) {
        await refreshProfile(user.id);
      }

      setGoalSaveMessage("Goal saved successfully. We now persist the strategy goal against your existing user/profile records.");
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleDeleteGoal() {
    setGoalError(null);
    setGoalSaveMessage(null);
    setSavingGoal(true);

    try {
      const profileResult = await updateProfile({
        primary_goal: null,
        time_horizon_years: null,
      });

      if (profileResult.error) {
        setGoalError(profileResult.error);
        return;
      }

      if (supabase && hasSupabaseEnv) {
        const { error } = await supabase.auth.updateUser({
          data: {
            strategy_goal: null,
          },
        });

        if (error) {
          setGoalError(error.message);
          return;
        }
      }

      setGoal(blankGoal());
      if (user?.id) {
        await refreshProfile(user.id);
      }
      setGoalSaveMessage("Goal removed successfully.");
    } finally {
      setSavingGoal(false);
    }
  }

  function handleNewGoal() {
    setGoal(createInitialGoal(profile?.primary_goal, profile?.time_horizon_years, null));
    setGoalError(null);
    setGoalSaveMessage(null);
  }

  return (
    <AppShell
      topNav={[
        { label: "Dashboard", href: "/" },
        { label: "Strategies", href: "/strategy" },
        { label: "Rebalancing", href: "/market-engine" },
      ]}
      metricValue={monthlySurplus > 0 ? `INR ${monthlySurplus.toLocaleString("en-IN")}/mo` : "No data available"}
      rightSlot={
        <button
          onClick={() => void handleSaveGoal()}
          className="rounded-2xl bg-white px-5 py-2 text-sm font-bold text-on-primary transition hover:scale-95"
        >
          Save Goal
        </button>
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-5xl font-black tracking-[-0.05em] text-white md:text-7xl">Master Strategy</h1>
            <p className="mt-4 max-w-2xl text-lg text-on-surface-variant">
              Your strategy page now uses the schema you already have. One goal is edited at a time, saved against your current Supabase user/profile, and reflected in the live projections.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-surface-container p-2">
            {riskModes.map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setRiskMode(mode)}
                className={`rounded-xl px-6 py-2 text-xs font-bold uppercase tracking-[0.18em] ${riskMode === mode ? "bg-white text-on-primary" : "text-neutral-500 hover:text-white"}`}
              >
                {capitalize(mode)}
              </button>
            ))}
          </div>
        </div>

        {strategyError ? (
          <Panel className="mb-6 border border-error/20 bg-error/10 p-5 text-sm text-error">
            {strategyError}
          </Panel>
        ) : null}
        {goalError ? (
          <Panel className="mb-6 border border-error/20 bg-error/10 p-5 text-sm text-error">
            {goalError}
          </Panel>
        ) : null}
        {goalSaveMessage ? (
          <Panel className="mb-6 border border-tertiary/20 bg-tertiary/10 p-5 text-sm text-tertiary">
            {goalSaveMessage}
          </Panel>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-12">
          <section className="space-y-8 lg:col-span-7">
            <Panel className="p-8">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Goal Timeline</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Higher monthly contribution brings the date closer. Lifestyle spend and SIP pauses push it out.
                  </p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-400">
                  {strategyLoading ? "Refreshing" : hasGoal ? "Live" : "No Goal"}
                </span>
              </div>

              {projectedGoalCard ? (
                <div className="rounded-[1.5rem] border border-white/5 bg-white/[0.03] p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-surface-container-high">
                      <MaterialIcon name={projectedGoalCard.icon} className={`text-2xl ${projectedGoalCard.toneClass}`} fill />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{projectedGoalCard.label}</div>
                          <h3 className="mt-1 text-xl font-bold text-white">{projectedGoalCard.title}</h3>
                          <p className="mt-2 text-sm text-on-surface-variant">{projectedGoalCard.subtitle}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-white">{projectedGoalCard.amount}</div>
                          <div className={`mt-1 text-[10px] font-bold uppercase tracking-[0.18em] ${projectedGoalCard.statusClass}`}>
                            {projectedGoalCard.status}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                        <div className={`h-full rounded-full ${projectedGoalCard.progressClass}`} style={{ width: `${projectedGoalCard.progress}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <NoDataState message="No data available. Create one goal and save it to start projecting your roadmap." />
              )}
            </Panel>

            <Panel className="p-8">
              <div className="mb-6 flex items-center gap-3">
                <MaterialIcon name="flag" className="text-tertiary" />
                <div>
                  <h3 className="text-xl font-bold text-white">Goal Planner</h3>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    One goal at a time, aligned to your current schema. No missing-table dependency.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Goal Name">
                  <input
                    type="text"
                    value={goal.goal_name}
                    onChange={(event) => setGoal((current) => ({ ...current, goal_name: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-3 text-white outline-none"
                  />
                </Field>
                <Field label="Target Amount">
                  <input
                    type="number"
                    min={1}
                    value={goal.target_amount}
                    onChange={(event) => setGoal((current) => ({ ...current, target_amount: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-3 text-white outline-none"
                  />
                </Field>
                <Field label="Target Year">
                  <input
                    type="number"
                    min={new Date().getFullYear()}
                    max={2100}
                    value={goal.target_year}
                    onChange={(event) => setGoal((current) => ({ ...current, target_year: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-3 text-white outline-none"
                  />
                </Field>
                <Field label="Status">
                  <select
                    value={goal.status}
                    onChange={(event) => setGoal((current) => ({ ...current, status: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-3 text-white outline-none"
                  >
                    <option value="seeded">Seeded</option>
                    <option value="building">Building</option>
                    <option value="on_track">On Track</option>
                    <option value="delayed">Delayed</option>
                  </select>
                </Field>
                <Field label="Icon">
                  <input
                    type="text"
                    value={goal.icon}
                    onChange={(event) => setGoal((current) => ({ ...current, icon: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-3 text-white outline-none"
                  />
                </Field>
                <div className="flex items-end text-xs text-on-surface-variant">
                  This goal is saved through your existing profile and auth metadata instead of a separate table.
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleNewGoal}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  New Goal
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveGoal()}
                  disabled={savingGoal}
                  className="rounded-2xl bg-white px-4 py-3 text-sm font-bold text-on-primary transition hover:scale-[0.99] disabled:opacity-60"
                >
                  {savingGoal ? "Saving..." : "Save Goal"}
                </button>
                <button
                  type="button"
                  onClick={() => void handleDeleteGoal()}
                  disabled={savingGoal}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10 disabled:opacity-60"
                >
                  Delete Goal
                </button>
              </div>
            </Panel>
          </section>

          <section className="space-y-6 lg:col-span-5">
            <Panel className="p-8">
              <h3 className="text-xl font-bold text-white">Live Projection Controls</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                These sliders re-run the live simulation and shift the projected date immediately.
              </p>

              <div className="mt-6 space-y-6">
                <SliderField
                  label="Monthly Contribution"
                  valueLabel={`INR ${monthlySurplus.toLocaleString("en-IN")}`}
                  min={0}
                  max={200000}
                  step={1000}
                  value={monthlySurplus}
                  onChange={setMonthlySurplus}
                />
                <SliderField
                  label="Lifestyle Spend"
                  valueLabel={`INR ${expense.toLocaleString("en-IN")}`}
                  min={0}
                  max={5000000}
                  step={50000}
                  value={expense}
                  onChange={setExpense}
                />
                <SliderField
                  label="SIP Pause"
                  valueLabel={`${pauseMonths} months`}
                  min={0}
                  max={24}
                  step={1}
                  value={pauseMonths}
                  onChange={setPauseMonths}
                />
              </div>
            </Panel>

            <Panel className="relative overflow-hidden p-8 text-center">
              <div className="absolute inset-0 bg-gradient-to-br from-tertiary/20 to-transparent opacity-40" />
              <div className="relative z-10">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-tertiary text-on-tertiary shadow-emerald">
                  <MaterialIcon name="auto_awesome" className="text-4xl" fill />
                </div>
                <h2 className="text-2xl font-black text-white">Projection Snapshot</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-on-surface-variant">
                  {strategy?.summary ?? "No data available. Add a monthly contribution and keep the backend running to generate a strategy projection."}
                </p>
              </div>
            </Panel>

            <Panel className="p-8">
              <h4 className="mb-6 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">What-If Projections</h4>
              {strategy ? (
                <div className="space-y-4">
                  {[
                    ["Retirement Age", String(strategy.projected_retirement_age), "white"],
                    ["Wealth at 50", strategy.wealth_at_fifty, "tertiary"],
                    ["Risk Sensitivity", strategy.risk_sensitivity, "secondary"],
                    ["Active Goal", goal.goal_name || "No data available", "white"],
                  ].map(([label, value, tone]) => (
                    <div key={label} className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                      <span className="text-sm text-on-surface-variant">{label}</span>
                      <span className={`font-bold ${tone === "secondary" ? "text-secondary text-sm uppercase tracking-[0.18em]" : tone === "tertiary" ? "text-xl text-tertiary" : "text-xl text-white"}`}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <NoDataState message="No data available. Strategy outputs will appear here once the simulation is available." />
              )}
            </Panel>

            <Panel className="p-8">
              <div className="mb-6 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary/15 text-tertiary">
                  <MaterialIcon name="forum" className="text-2xl" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">Strategy Copilot</h4>
                  <p className="mt-1 text-sm text-on-surface-variant">Questions use your current saved goal and live strategy inputs.</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex max-h-[280px] flex-col gap-4 overflow-y-auto rounded-[1.5rem] border border-white/5 bg-surface-container-lowest p-4">
                  {messages.map((message, index) => (
                    <div key={`${message.role}-${index}`} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                      {message.role === "assistant" ? (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-tertiary/15 text-tertiary">
                          <MaterialIcon name="auto_awesome" className="text-lg" fill />
                        </div>
                      ) : null}
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                          message.role === "assistant"
                            ? "rounded-tl-sm bg-white/5 text-on-surface-variant"
                            : "rounded-tr-sm bg-white text-on-primary"
                        }`}
                      >
                        {message.text}
                      </div>
                      {message.role === "user" ? (
                        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-white text-on-primary">
                          <MaterialIcon name="person" className="text-lg" fill />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>

                <div className="grid gap-2">
                  {suggestedQuestions.map((question) => (
                    <button
                      key={question}
                      type="button"
                      onClick={() => submitScenario(question)}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-left text-xs uppercase tracking-[0.14em] text-on-surface-variant transition hover:border-tertiary/30 hover:text-white"
                    >
                      {question}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    placeholder="What if I increase my SIP, spend INR 10 lakhs, or retire earlier?"
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high py-4 pl-5 pr-20 text-sm text-white outline-none placeholder:text-neutral-600"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl bg-white text-on-primary transition hover:bg-tertiary"
                  >
                    <MaterialIcon name="arrow_upward" className="text-lg" />
                  </button>
                </form>
              </div>
            </Panel>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Field(props: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{props.label}</div>
      {props.children}
    </label>
  );
}

function SliderField(props: {
  label: string;
  valueLabel: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="mb-3 flex justify-between">
        <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">{props.label}</label>
        <span className="text-sm font-bold text-white">{props.valueLabel}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
        className="w-full"
      />
    </div>
  );
}

function NoDataState(props: { message: string }) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-on-surface-variant">
      {props.message}
    </div>
  );
}

function validateGoal(goal: EditableGoal) {
  if (!goal.goal_name.trim()) {
    return "Goal name is required.";
  }
  const amount = Number(goal.target_amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Goal target amount must be a positive number.";
  }
  const year = Number(goal.target_year);
  if (!Number.isFinite(year) || year < new Date().getFullYear() || year > 2100) {
    return "Goal target year must be a valid future year.";
  }
  return null;
}

function buildProjectedGoalCard(
  goal: EditableGoal,
  monthlySurplus: number,
  expense: number,
  pauseMonths: number,
  strategyMilestones: StrategyMilestone[],
) {
  const matchingMilestone = strategyMilestones.find((milestone) => milestone.title.toLowerCase() === goal.goal_name.trim().toLowerCase());
  const targetAmount = Number(goal.target_amount);
  const baseYear = matchingMilestone?.target_year ?? Number(goal.target_year);
  const projectedDate = calculateProjectedDate({
    targetAmount,
    baseYear,
    monthlySurplus,
    expense,
    pauseMonths,
  });
  const monthDelta = diffMonths(addMonthsToYearStart(baseYear, 0), projectedDate);
  const status = monthDelta > 3 ? "Delayed" : monthDelta < 0 ? "Ahead" : goal.status || matchingMilestone?.status || "Building";
  const statusClass =
    status.toLowerCase() === "delayed"
      ? "text-error"
      : status.toLowerCase() === "on_track" || status.toLowerCase() === "ahead"
        ? "text-tertiary"
        : "text-neutral-500";

  return {
    icon: goal.icon || "flag",
    toneClass: "text-tertiary",
    label: `Projected ${formatMonthYear(projectedDate)}`,
    title: goal.goal_name,
    subtitle: `Target amount ${formatInr(targetAmount)}. Higher monthly contribution brings this closer; spending and SIP pauses push it out.`,
    amount: formatInr(targetAmount),
    progress: calculateProgress(projectedDate.getFullYear(), Number(goal.target_year), monthDelta),
    progressClass: "bg-tertiary",
    status,
    statusClass,
  };
}

function buildSuggestedQuestions(goal: EditableGoal, monthlySurplus: number, expense: number) {
  const primaryGoal = goal.goal_name || "my main goal";
  const roundedBoost = Math.max(1000, Math.round(monthlySurplus * 0.2 / 500) * 500);
  const roundedExpense = expense > 0 ? expense : 500000;

  return [
    `What if I increase my SIP by INR ${roundedBoost.toLocaleString("en-IN")} for ${primaryGoal}?`,
    `What if I spend INR ${roundedExpense.toLocaleString("en-IN")} this year?`,
    `What if I pause SIPs for 6 months and still want to hit ${primaryGoal}?`,
  ];
}

function buildStrategyResponse(input: {
  question: string;
  monthlySurplus: number;
  expense: number;
  pauseMonths: number;
  strategy: StrategySimulationResponse | null;
  goal: EditableGoal;
}) {
  const normalized = input.question.toLowerCase();
  const detectedAmount = parseFinancialAmount(normalized) ?? input.expense;
  const leadGoal = input.goal.goal_name || "your goal";
  const delayMonths = calculateDelayMonths(input.monthlySurplus, detectedAmount, input.pauseMonths, Number(input.goal.target_amount || 0));

  if (normalized.includes("pause") || normalized.includes("stop sip") || normalized.includes("stop my sip")) {
    return `Pausing SIPs with a spend of about INR ${detectedAmount.toLocaleString("en-IN")} would likely push ${leadGoal} by around ${Math.max(delayMonths, 1)} months. Keeping even a smaller core contribution active will help protect the timeline.`;
  }

  if (normalized.includes("increase sip") || normalized.includes("salary hike") || normalized.includes("raise my sip")) {
    const monthlyBoost = Math.max(1000, Math.round(input.monthlySurplus * 0.2));
    return `If you increase your SIP by about INR ${monthlyBoost.toLocaleString("en-IN")}, the system should pull ${leadGoal} closer and improve your overall retirement projection. Your current simulated retirement age is ${input.strategy?.projected_retirement_age ?? "not available"}.`;
  }

  if (normalized.includes("retire") || normalized.includes("retirement")) {
    return `An earlier retirement target works best when you raise the monthly contribution first and avoid long SIP pauses. Right now, contribution growth is a cleaner lever than taking extra allocation risk.`;
  }

  return `At the current settings, your plan is tracking toward ${leadGoal} with ${input.strategy?.wealth_at_fifty ?? "no wealth projection available"} projected at age 50. Give me a spend amount or a new SIP level and I’ll estimate the impact more precisely.`;
}

function calculateDelayMonths(monthlySurplus: number, expense: number, pauseMonths: number, targetAmount: number) {
  if (expense <= 0 && pauseMonths <= 0) {
    return 0;
  }

  const effectiveSurplus = Math.max(monthlySurplus, 1);
  const expenseDelay = expense > 0 ? Math.ceil((expense + targetAmount * 0.1) / effectiveSurplus / 2) : 0;
  return Math.min(60, expenseDelay + pauseMonths);
}

function calculateProjectedDate(input: {
  targetAmount: number;
  baseYear: number;
  monthlySurplus: number;
  expense: number;
  pauseMonths: number;
}) {
  const baseDate = addMonthsToYearStart(input.baseYear, 0);
  if (input.monthlySurplus <= 0) {
    return baseDate;
  }

  const monthlyCapacity = Math.max(1000, input.monthlySurplus * 0.72);
  const adjustedTarget = Math.max(0, input.targetAmount + input.expense * 0.65);
  const monthsNeeded = Math.ceil(adjustedTarget / monthlyCapacity) + input.pauseMonths;
  const projected = new Date();
  projected.setMonth(projected.getMonth() + monthsNeeded);
  return projected;
}

function calculateProgress(projectedYear: number, goalYear: number, monthDelta: number) {
  const yearsAway = Math.max(projectedYear - new Date().getFullYear(), 1);
  const delayPenalty = Math.max(monthDelta, 0) * 2;
  const aheadBonus = monthDelta < 0 ? Math.abs(monthDelta) : 0;
  const base = Math.max(5, 100 - yearsAway * 10 - delayPenalty + aheadBonus);
  return Math.min(100, base);
}

function diffMonths(start: Date, end: Date) {
  return (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
}

function addMonthsToYearStart(year: number, months: number) {
  const date = new Date(year, 0, 1);
  date.setMonth(date.getMonth() + months);
  return date;
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

function formatInr(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function blankGoal(): EditableGoal {
  return {
    goal_name: "",
    target_amount: "",
    target_year: String(new Date().getFullYear() + 3),
    icon: "flag",
    status: "building",
  };
}

function createInitialGoal(
  primaryGoal: string | null | undefined,
  timeHorizonYears: number | null | undefined,
  storedGoal: StoredStrategyGoal | null,
): EditableGoal {
  if (storedGoal?.goal_name && storedGoal.target_amount && storedGoal.target_year) {
    return {
      goal_name: storedGoal.goal_name,
      target_amount: String(storedGoal.target_amount),
      target_year: String(storedGoal.target_year),
      icon: storedGoal.icon ?? "flag",
      status: storedGoal.status ?? "building",
    };
  }

  const normalizedGoal = (primaryGoal ?? "").toLowerCase();
  const goalMap: Record<string, EditableGoal> = {
    retirement: {
      goal_name: "Retirement Corpus",
      target_amount: "18000000",
      target_year: String(new Date().getFullYear() + Math.max(timeHorizonYears ?? 15, 10)),
      icon: "castle",
      status: "seeded",
    },
    "home purchase": {
      goal_name: "Home Down Payment",
      target_amount: "4500000",
      target_year: String(new Date().getFullYear() + Math.max(timeHorizonYears ?? 5, 4)),
      icon: "home",
      status: "building",
    },
    "family milestone": {
      goal_name: "Marriage Fund",
      target_amount: "1800000",
      target_year: String(new Date().getFullYear() + 2),
      icon: "favorite",
      status: "on_track",
    },
    "wealth growth": {
      goal_name: "Freedom Ledger",
      target_amount: "12000000",
      target_year: String(new Date().getFullYear() + Math.max(timeHorizonYears ?? 12, 8)),
      icon: "castle",
      status: "building",
    },
    "emergency buffer": {
      goal_name: "Emergency Buffer",
      target_amount: "600000",
      target_year: String(new Date().getFullYear() + 1),
      icon: "shield",
      status: "building",
    },
  };

  return goalMap[normalizedGoal] ?? {
    goal_name: primaryGoal ?? "",
    target_amount: "",
    target_year: String(new Date().getFullYear() + Math.max(timeHorizonYears ?? 3, 3)),
    icon: "flag",
    status: "building",
  };
}

function getStoredGoalFromUserMetadata(value: unknown): StoredStrategyGoal | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    goal_name: typeof record.goal_name === "string" ? record.goal_name : undefined,
    target_amount: typeof record.target_amount === "number" ? record.target_amount : undefined,
    target_year: typeof record.target_year === "number" ? record.target_year : undefined,
    icon: typeof record.icon === "string" ? record.icon : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
  };
}

function toRiskMode(value: string | null | undefined): RiskMode {
  const normalized = value?.toLowerCase();
  if (normalized === "conservative" || normalized === "aggressive") {
    return normalized;
  }
  return "balanced";
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
  });
  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }
  return response.json() as Promise<T>;
}

function parseFinancialAmount(question: string) {
  const lakhMatch = question.match(/(\d+(?:\.\d+)?)\s*lakh/);
  if (lakhMatch) {
    return Number(lakhMatch[1]) * 100000;
  }

  const croreMatch = question.match(/(\d+(?:\.\d+)?)\s*crore/);
  if (croreMatch) {
    return Number(croreMatch[1]) * 10000000;
  }

  const inrMatch = question.match(/inr\s*([\d,]+)/);
  if (inrMatch) {
    return Number(inrMatch[1].split(",").join(""));
  }

  return null;
}
