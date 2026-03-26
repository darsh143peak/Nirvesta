import { FormEvent, useEffect, useMemo, useState } from "react";
import type { Dispatch, ReactNode, SetStateAction } from "react";
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
  id: string;
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
  id?: string;
  goal_name?: string;
  target_amount?: number;
  target_year?: number;
  icon?: string;
  status?: string;
};

export function StrategyPage() {
  const { profile, user, updateProfile, refreshProfile } = useAuth();
  const goalsStorageKey = useMemo(() => `nirvesta:strategy-goals:${user?.id ?? "guest"}`, [user?.id]);
  const [riskMode, setRiskMode] = useState<RiskMode>(toRiskMode(profile?.risk_attitude));
  const [monthlySurplus, setMonthlySurplus] = useState<number>(profile?.monthly_investable_surplus ?? 0);
  const [expense, setExpense] = useState(0);
  const [pauseMonths, setPauseMonths] = useState(0);
  const [goals, setGoals] = useState<EditableGoal[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);
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
    const storedGoals = getStoredGoalsFromUserMetadata(
      user?.user_metadata?.strategy_goals,
      user?.user_metadata?.strategy_goal,
      loadStoredGoalsFromLocalStorage(goalsStorageKey),
    );
    const nextGoals =
      storedGoals.length > 0
        ? storedGoals.map((storedGoal) => createInitialGoal(profile?.primary_goal, profile?.time_horizon_years, storedGoal))
        : [createInitialGoal(profile?.primary_goal, profile?.time_horizon_years, null)];
    setGoals(nextGoals);
    setSelectedGoalId((current) => (current && nextGoals.some((goal) => goal.id === current) ? current : nextGoals[0]?.id ?? null));
  }, [goalsStorageKey, profile?.primary_goal, profile?.time_horizon_years, user?.user_metadata]);

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

  const selectedGoal = useMemo(
    () => goals.find((goal) => goal.id === selectedGoalId) ?? goals[0] ?? blankGoal(),
    [goals, selectedGoalId],
  );
  const goalValidation = useMemo(() => validateGoal(selectedGoal), [selectedGoal]);
  const hasGoal = Boolean(selectedGoal.goal_name.trim() && Number(selectedGoal.target_amount) > 0 && Number(selectedGoal.target_year) >= new Date().getFullYear());
  const projectedGoalCard = useMemo(
    () => (hasGoal ? buildProjectedGoalCard(selectedGoal, monthlySurplus, expense, pauseMonths, strategy?.milestones ?? []) : null),
    [expense, selectedGoal, hasGoal, monthlySurplus, pauseMonths, strategy?.milestones],
  );
  const suggestedQuestions = useMemo(
    () => buildSuggestedQuestions(selectedGoal, monthlySurplus, expense),
    [selectedGoal, monthlySurplus, expense],
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
          goal: selectedGoal,
        }),
      },
    ]);
    setChatInput("");
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitScenario(chatInput);
  }

  function toStoredGoal(goal: EditableGoal): StoredStrategyGoal {
    return {
      id: goal.id,
      goal_name: goal.goal_name.trim(),
      target_amount: Number(goal.target_amount),
      target_year: Number(goal.target_year),
      icon: goal.icon.trim() || "flag",
      status: goal.status.trim() || "building",
    };
  }

  async function handleSaveGoal(goalId = selectedGoal.id) {
    setGoalSaveMessage(null);
    const goalToSave = goals.find((goal) => goal.id === goalId) ?? selectedGoal;
    const validationError = validateGoal(goalToSave);

    if (validationError) {
      setGoalError(validationError);
      return;
    }

    setGoalError(null);
    setSavingGoal(true);

    try {
      const profileResult = await updateProfile({
        monthly_investable_surplus: monthlySurplus,
        risk_attitude: capitalize(riskMode),
        primary_goal: goalToSave.goal_name.trim(),
        time_horizon_years: Math.max(Number(goalToSave.target_year) - new Date().getFullYear(), 1),
      });

      if (profileResult.error) {
        setGoalError(profileResult.error);
        return;
      }

      if (supabase && hasSupabaseEnv) {
        const { error } = await supabase.auth.updateUser({
          data: {
            strategy_goals: goals.map((goal) => toStoredGoal(goal.id === goalToSave.id ? goalToSave : goal)),
          },
        });

        if (error) {
          setGoalError(error.message);
          return;
        }
      }

      persistGoalsToLocalStorage(
        goalsStorageKey,
        goals.map((goal) => toStoredGoal(goal.id === goalToSave.id ? goalToSave : goal)),
      );

      if (user?.id) {
        await refreshProfile(user.id);
      }

      setGoalSaveMessage(`Saved ${goalToSave.goal_name || "goal"} successfully. Your other goal cards stay stored too.`);
    } finally {
      setSavingGoal(false);
    }
  }

  async function handleDeleteGoal(goalId = selectedGoal.id) {
    setGoalError(null);
    setGoalSaveMessage(null);
    setSavingGoal(true);
    const goalToDelete = goals.find((goal) => goal.id === goalId) ?? selectedGoal;
    const remainingGoals = goals.filter((goal) => goal.id !== goalToDelete.id);

    try {
      const profileResult = await updateProfile({
        primary_goal: remainingGoals.length > 0 ? remainingGoals[0]?.goal_name ?? null : null,
        time_horizon_years:
          remainingGoals.length > 0
            ? Math.max(Number(remainingGoals[0]?.target_year ?? new Date().getFullYear()) - new Date().getFullYear(), 1)
            : null,
      });

      if (profileResult.error) {
        setGoalError(profileResult.error);
        return;
      }

      if (supabase && hasSupabaseEnv) {
        const { error } = await supabase.auth.updateUser({
          data: {
            strategy_goals: remainingGoals.map((goal) => toStoredGoal(goal)),
          },
        });

        if (error) {
          setGoalError(error.message);
          return;
        }
      }

      persistGoalsToLocalStorage(
        goalsStorageKey,
        remainingGoals.map((goal) => toStoredGoal(goal)),
      );
      setGoals(remainingGoals.length > 0 ? remainingGoals : [blankGoal()]);
      setSelectedGoalId(remainingGoals[0]?.id ?? null);
      if (user?.id) {
        await refreshProfile(user.id);
      }
      setGoalSaveMessage(`Removed ${goalToDelete.goal_name || "goal"} successfully.`);
    } finally {
      setSavingGoal(false);
    }
  }

  function handleNewGoal() {
    const newGoal = blankGoal();
    setGoals((current) => [...current, newGoal]);
    setSelectedGoalId(newGoal.id);
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
          Save Active Goal
        </button>
      }
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="text-5xl font-black tracking-[-0.05em] text-white md:text-7xl">Master Strategy</h1>
            <p className="mt-4 max-w-2xl text-lg text-on-surface-variant">
              Your strategy page now supports multiple stored goals. Each goal gets its own card, saves separately, and can be used as the active projection without replacing the others.
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
                    Create as many goal cards as you want. Each one stays stored separately in your account instead of being overwritten by the next save.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {goals.map((goalItem, index) => {
                  const isActive = goalItem.id === selectedGoal.id;
                  const cardLabel = goalItem.goal_name || `Untitled Goal ${index + 1}`;
                  return (
                    <div
                      key={goalItem.id}
                      className={`relative overflow-hidden rounded-[1.9rem] border p-6 shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition ${
                        isActive
                          ? "border-[#f7dd8f]/60 bg-[radial-gradient(circle_at_top_left,_rgba(255,244,197,0.45),_transparent_38%),linear-gradient(135deg,_#70521a_0%,_#b88d34_35%,_#f0d17d_68%,_#8a6423_100%)]"
                          : "border-[#7f6630]/50 bg-[radial-gradient(circle_at_top_left,_rgba(255,230,160,0.2),_transparent_34%),linear-gradient(135deg,_#31220c_0%,_#6d5120_45%,_#9e7830_100%)]"
                      }`}
                    >
                      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.22)_24%,transparent_44%)] opacity-50" />
                      <div className="pointer-events-none absolute right-[-48px] top-[-42px] h-32 w-32 rounded-full border border-white/20 bg-white/10 blur-[1px]" />
                      <div className="pointer-events-none absolute bottom-[-64px] left-[-24px] h-36 w-36 rounded-full bg-black/10 blur-2xl" />

                      <div className="relative z-10 mb-5 flex flex-wrap items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/10 text-black">
                              <MaterialIcon name={goalItem.icon || "flag"} className="text-2xl" fill />
                            </div>
                            <div>
                              <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-black/60">Goal Card {index + 1}</div>
                              <div className="mt-1 truncate text-xl font-black tracking-[-0.03em] text-black">{cardLabel}</div>
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="px-1 py-1">
                              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/55">Target</div>
                              <div className="mt-1 text-base font-bold text-black">
                                {goalItem.target_amount ? formatInr(Number(goalItem.target_amount)) : "No amount"}
                              </div>
                            </div>
                            <div className="px-1 py-1">
                              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/55">Year</div>
                              <div className="mt-1 text-base font-bold text-black">{goalItem.target_year || "No year"}</div>
                            </div>
                            <div className="px-1 py-1">
                              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-black/55">Status</div>
                              <div className="mt-1 text-base font-bold text-black">{formatGoalStatus(goalItem.status)}</div>
                            </div>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedGoalId(goalItem.id)}
                            className={`rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] transition ${
                              isActive
                                ? "bg-black text-[#f5df9d]"
                                : "bg-black/10 text-black hover:bg-black/15"
                            }`}
                          >
                            {isActive ? "Active Projection" : "Use in Projection"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSaveGoal(goalItem.id)}
                            disabled={savingGoal}
                            className="rounded-full bg-black/80 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#f5df9d] transition hover:scale-[0.99] hover:bg-black disabled:opacity-60"
                          >
                            Save Card
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteGoal(goalItem.id)}
                            disabled={savingGoal}
                            className="rounded-full bg-black/10 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-black transition hover:bg-black/15 disabled:opacity-60"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      <div className="relative z-10 grid gap-4 md:grid-cols-2">
                        <Field label="Goal Name">
                          <input
                            type="text"
                            value={goalItem.goal_name}
                            onChange={(event) => updateSelectedGoal(setGoals, goalItem.id, "goal_name", event.target.value)}
                            onFocus={() => setSelectedGoalId(goalItem.id)}
                            className="w-full border-0 border-b border-black/20 bg-transparent px-0 py-3 text-black outline-none placeholder:text-black/35"
                          />
                        </Field>
                        <Field label="Target Amount">
                          <input
                            type="number"
                            min={1}
                            value={goalItem.target_amount}
                            onChange={(event) => updateSelectedGoal(setGoals, goalItem.id, "target_amount", event.target.value)}
                            onFocus={() => setSelectedGoalId(goalItem.id)}
                            className="w-full border-0 border-b border-black/20 bg-transparent px-0 py-3 text-black outline-none"
                          />
                        </Field>
                        <Field label="Target Year">
                          <input
                            type="number"
                            min={new Date().getFullYear()}
                            max={2100}
                            value={goalItem.target_year}
                            onChange={(event) => updateSelectedGoal(setGoals, goalItem.id, "target_year", event.target.value)}
                            onFocus={() => setSelectedGoalId(goalItem.id)}
                            className="w-full border-0 border-b border-black/20 bg-transparent px-0 py-3 text-black outline-none"
                          />
                        </Field>
                        <Field label="Status">
                          <select
                            value={goalItem.status}
                            onChange={(event) => updateSelectedGoal(setGoals, goalItem.id, "status", event.target.value)}
                            onFocus={() => setSelectedGoalId(goalItem.id)}
                            className="w-full border-0 border-b border-black/20 bg-transparent px-0 py-3 text-black outline-none"
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
                            value={goalItem.icon}
                            onChange={(event) => updateSelectedGoal(setGoals, goalItem.id, "icon", event.target.value)}
                            onFocus={() => setSelectedGoalId(goalItem.id)}
                            className="w-full border-0 border-b border-black/20 bg-transparent px-0 py-3 text-black outline-none"
                          />
                        </Field>
                        <div className="flex items-end text-xs text-black/60">
                          Each card is stored separately in your account metadata, so adding a new goal does not overwrite the older ones.
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleNewGoal}
                  className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  New Goal
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
                    ["Active Goal", selectedGoal.goal_name || "No data available", "white"],
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
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black/60">{props.label}</div>
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

function formatGoalStatus(status: string) {
  return status
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function blankGoal(): EditableGoal {
  return {
    id: createGoalId(),
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
      id: storedGoal.id ?? createGoalId(),
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
      id: createGoalId(),
      goal_name: "Retirement Corpus",
      target_amount: "18000000",
      target_year: String(new Date().getFullYear() + Math.max(timeHorizonYears ?? 15, 10)),
      icon: "castle",
      status: "seeded",
    },
    "home purchase": {
      id: createGoalId(),
      goal_name: "Home Down Payment",
      target_amount: "4500000",
      target_year: String(new Date().getFullYear() + Math.max(timeHorizonYears ?? 5, 4)),
      icon: "home",
      status: "building",
    },
    "family milestone": {
      id: createGoalId(),
      goal_name: "Marriage Fund",
      target_amount: "1800000",
      target_year: String(new Date().getFullYear() + 2),
      icon: "favorite",
      status: "on_track",
    },
    "wealth growth": {
      id: createGoalId(),
      goal_name: "Freedom Ledger",
      target_amount: "12000000",
      target_year: String(new Date().getFullYear() + Math.max(timeHorizonYears ?? 12, 8)),
      icon: "castle",
      status: "building",
    },
    "emergency buffer": {
      id: createGoalId(),
      goal_name: "Emergency Buffer",
      target_amount: "600000",
      target_year: String(new Date().getFullYear() + 1),
      icon: "shield",
      status: "building",
    },
  };

  return goalMap[normalizedGoal] ?? {
    id: createGoalId(),
    goal_name: primaryGoal ?? "",
    target_amount: "",
    target_year: String(new Date().getFullYear() + Math.max(timeHorizonYears ?? 3, 3)),
    icon: "flag",
    status: "building",
  };
}

function getStoredGoalsFromUserMetadata(value: unknown, legacyValue?: unknown, fallbackGoals?: StoredStrategyGoal[]): StoredStrategyGoal[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const parsed = parseStoredGoal(item);
      return parsed ? [parsed] : [];
    });
  }

  const legacyGoal = parseStoredGoal(value) ?? parseStoredGoal(legacyValue);
  if (legacyGoal) {
    return [legacyGoal];
  }
  return fallbackGoals ?? [];
}

function parseStoredGoal(value: unknown): StoredStrategyGoal | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  return {
    id: typeof record.id === "string" && record.id.trim() ? record.id : undefined,
    goal_name: typeof record.goal_name === "string" ? record.goal_name : undefined,
    target_amount: typeof record.target_amount === "number" ? record.target_amount : undefined,
    target_year: typeof record.target_year === "number" ? record.target_year : undefined,
    icon: typeof record.icon === "string" ? record.icon : undefined,
    status: typeof record.status === "string" ? record.status : undefined,
  };
}

function updateSelectedGoal(
  setGoals: Dispatch<SetStateAction<EditableGoal[]>>,
  goalId: string,
  field: keyof Omit<EditableGoal, "id">,
  value: string,
) {
  setGoals((current) =>
    current.map((goal) =>
      goal.id === goalId
        ? {
            ...goal,
            [field]: value,
          }
        : goal,
    ),
  );
}

function createGoalId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `goal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadStoredGoalsFromLocalStorage(key: string): StoredStrategyGoal[] | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const raw = window.localStorage.getItem(key);
  if (!raw) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return undefined;
    }
    return parsed.flatMap((item) => {
      const goal = parseStoredGoal(item);
      return goal ? [goal] : [];
    });
  } catch {
    return undefined;
  }
}

function persistGoalsToLocalStorage(key: string, goals: StoredStrategyGoal[]) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(key, JSON.stringify(goals));
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
