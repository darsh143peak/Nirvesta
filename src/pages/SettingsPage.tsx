import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { FutureIntegrationsPanel, PortfolioUploadPanel } from "../components/PortfolioImportPanel";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel } from "../components/ui";

const riskOptions = ["Conservative", "Balanced", "Aggressive"];
const experienceOptions = ["Beginner", "Intermediate", "Advanced"];

export function SettingsPage() {
  const { profile, updateProfile, signOut } = useAuth();
  const [form, setForm] = useState({
    fullName: "",
    age: "",
    riskAttitude: "Balanced",
    investingExperience: "Beginner",
    primaryGoal: "",
    timeHorizonYears: "",
    monthlyInvestableSurplus: "",
    emergencyFundMonths: "",
    emailNotifications: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setForm({
      fullName: profile?.full_name ?? "",
      age: profile?.age ? String(profile.age) : "",
      riskAttitude: profile?.risk_attitude ?? "Balanced",
      investingExperience: profile?.investing_experience ?? "Beginner",
      primaryGoal: profile?.primary_goal ?? "",
      timeHorizonYears: profile?.time_horizon_years ? String(profile.time_horizon_years) : "",
      monthlyInvestableSurplus: profile?.monthly_investable_surplus ? String(profile.monthly_investable_surplus) : "",
      emergencyFundMonths: profile?.emergency_fund_months ? String(profile.emergency_fund_months) : "",
      emailNotifications: profile?.email_notifications ?? true,
    });
  }, [profile]);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);

    const result = await updateProfile({
      full_name: form.fullName.trim() || null,
      age: form.age ? Number(form.age) : null,
      risk_attitude: form.riskAttitude,
      investing_experience: form.investingExperience,
      primary_goal: form.primaryGoal.trim() || null,
      time_horizon_years: form.timeHorizonYears ? Number(form.timeHorizonYears) : null,
      monthly_investable_surplus: form.monthlyInvestableSurplus ? Number(form.monthlyInvestableSurplus) : null,
      emergency_fund_months: form.emergencyFundMonths ? Number(form.emergencyFundMonths) : null,
      email_notifications: form.emailNotifications,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setMessage("Settings saved successfully.");
    }

    setSaving(false);
  }

  const completionItems = [
    Boolean(form.fullName.trim()),
    Boolean(form.riskAttitude),
    Boolean(form.primaryGoal.trim()),
    Boolean(form.monthlyInvestableSurplus),
  ];
  const completionPercent = Math.round((completionItems.filter(Boolean).length / completionItems.length) * 100);

  return (
    <AppShell
      topNav={[
        { label: "Dashboard", href: "/command-center" },
        { label: "Strategy", href: "/strategy" },
        { label: "Settings", href: "/settings" },
      ]}
      metricValue={profile?.email ?? "Profile Settings"}
      rightSlot={
        <button
          onClick={() => void handleSave()}
          className="rounded-2xl bg-white px-5 py-2 text-sm font-bold text-on-primary transition hover:scale-95"
        >
          Save
        </button>
      }
    >
      <div className="mx-auto max-w-6xl">
        <header className="relative mb-10 overflow-hidden rounded-[2rem] border border-white/5 bg-surface-container-low px-6 py-8 md:px-8">
          <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-tertiary/15 blur-[90px]" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-40 w-40 rounded-full bg-secondary/10 blur-[90px]" />
          <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-300">
                <MaterialIcon name="settings" className="text-sm text-tertiary" />
                Account Preferences
              </div>
              <h1 className="mt-5 text-5xl font-black tracking-[-0.05em] text-white md:text-7xl">Settings</h1>
              <p className="mt-3 max-w-2xl text-lg text-on-surface-variant">
                Personalize your planning profile, update your investing defaults, and manage data import from one polished control center.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Profile State</div>
                <div className="mt-2 text-lg font-bold text-white">{profile?.full_name ?? "Pending"}</div>
                <div className="mt-1 text-xs text-on-surface-variant">{profile?.email ?? "No email available"}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Planning Goal</div>
                <div className="mt-2 text-lg font-bold text-white">{form.primaryGoal || "Not set"}</div>
                <div className="mt-1 text-xs text-on-surface-variant">{form.timeHorizonYears ? `${form.timeHorizonYears} year horizon` : "Horizon missing"}</div>
              </div>
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 px-5 py-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Setup Complete</div>
                <div className="mt-2 text-lg font-bold text-white">{completionPercent}%</div>
                <div className="mt-1 text-xs text-on-surface-variant">Core profile and planning fields</div>
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <Panel className="mb-6 border border-error/20 bg-error/10 p-5 text-sm text-error">
            {error}
          </Panel>
        ) : null}
        {message ? (
          <Panel className="mb-6 border border-tertiary/20 bg-tertiary/10 p-5 text-sm text-tertiary">
            {message}
          </Panel>
        ) : null}

        <div className="grid gap-8 lg:grid-cols-12">
          <section className="space-y-8 lg:col-span-8">
            <Panel className="overflow-hidden p-0">
              <div className="border-b border-white/5 bg-white/[0.03] px-8 py-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary/15 text-tertiary">
                    <MaterialIcon name="person" className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Profile Identity</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      These values power the rest of the app, including strategy and onboarding.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-8 md:grid-cols-2">
                <Field label="Full Name">
                  <input
                    type="text"
                    value={form.fullName}
                    onChange={(event) => setForm((current) => ({ ...current, fullName: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                  />
                </Field>
                <Field label="Age">
                  <input
                    type="number"
                    min={18}
                    max={120}
                    value={form.age}
                    onChange={(event) => setForm((current) => ({ ...current, age: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                  />
                </Field>
                <Field label="Risk Attitude">
                  <select
                    value={form.riskAttitude}
                    onChange={(event) => setForm((current) => ({ ...current, riskAttitude: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                  >
                    {riskOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Investing Experience">
                  <select
                    value={form.investingExperience}
                    onChange={(event) => setForm((current) => ({ ...current, investingExperience: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                  >
                    {experienceOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </Panel>

            <Panel className="overflow-hidden p-0">
              <div className="border-b border-white/5 bg-white/[0.03] px-8 py-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    <MaterialIcon name="savings" className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Planning Defaults</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Keep these updated so the dashboard and strategy simulations stay relevant.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 p-8 md:grid-cols-2">
                <Field label="Primary Goal">
                  <input
                    type="text"
                    value={form.primaryGoal}
                    onChange={(event) => setForm((current) => ({ ...current, primaryGoal: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                  />
                </Field>
                <Field label="Time Horizon (Years)">
                  <input
                    type="number"
                    min={1}
                    value={form.timeHorizonYears}
                    onChange={(event) => setForm((current) => ({ ...current, timeHorizonYears: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                  />
                </Field>
                <Field label="Monthly Investable Surplus">
                  <input
                    type="number"
                    min={0}
                    value={form.monthlyInvestableSurplus}
                    onChange={(event) => setForm((current) => ({ ...current, monthlyInvestableSurplus: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                  />
                </Field>
                <Field label="Emergency Fund (Months)">
                  <input
                    type="number"
                    min={0}
                    value={form.emergencyFundMonths}
                    onChange={(event) => setForm((current) => ({ ...current, emergencyFundMonths: event.target.value }))}
                    className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                  />
                </Field>
              </div>
            </Panel>

            <div className="grid gap-8 xl:grid-cols-2">
              <FutureIntegrationsPanel
                title="Future Integrations"
                description="Keep Zerodha, Upstox, and Groww visible here as the upcoming direct integration roadmap."
              />

              <PortfolioUploadPanel
                title="Portfolio CSV Upload"
                description="Upload broker exports or manual spreadsheets here. The backend merges holdings and refreshes the live basket."
              />
            </div>
          </section>

          <section className="space-y-8 lg:col-span-4">
            <div className="lg:sticky lg:top-8 space-y-8">
              <Panel className="overflow-hidden p-0">
                <div className="bg-gradient-to-br from-white to-neutral-200 px-6 py-6 text-on-primary">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/10">
                      <MaterialIcon name="tune" className="text-2xl" />
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-on-primary/70">Control Center</div>
                      <div className="mt-1 text-xl font-black">Save and Apply</div>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-on-primary/70">
                    Changes update your planning defaults and the rest of the protected app flow.
                  </p>
                  <button
                    onClick={() => void handleSave()}
                    disabled={saving}
                    className="mt-6 w-full rounded-2xl bg-black px-4 py-4 text-sm font-bold text-white transition hover:scale-[0.99] disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Settings"}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-px bg-white/5">
                  <div className="bg-surface-container-low px-5 py-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Contribution</div>
                    <div className="mt-2 text-lg font-bold text-white">
                      {form.monthlyInvestableSurplus ? `INR ${Number(form.monthlyInvestableSurplus).toLocaleString("en-IN")}` : "Not set"}
                    </div>
                  </div>
                  <div className="bg-surface-container-low px-5 py-4">
                    <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">Alerts</div>
                    <div className="mt-2 text-lg font-bold text-white">{form.emailNotifications ? "Enabled" : "Muted"}</div>
                  </div>
                </div>
              </Panel>

              <Panel className="p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-tertiary/15 text-tertiary">
                    <MaterialIcon name="notifications" className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Notifications</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Control whether Nirvesta can keep you updated.
                    </p>
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={form.emailNotifications}
                    onChange={(event) => setForm((current) => ({ ...current, emailNotifications: event.target.checked }))}
                    className="mt-1 h-4 w-4"
                  />
                  <span>
                    Send email alerts for portfolio events, risk changes, and AI recommendations.
                  </span>
                </label>
              </Panel>

              <Panel className="p-8">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/15 text-secondary">
                    <MaterialIcon name="admin_panel_settings" className="text-2xl" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Account</h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Signed in as {profile?.email ?? "No data available"}.
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-on-surface-variant">
                  Settings use the same auth/profile persistence layer as the rest of the app. If profile storage is unavailable, Nirvesta falls back gracefully instead of breaking.
                </div>

                <button
                  onClick={() => void signOut()}
                  className="mt-6 w-full rounded-2xl border border-white/10 px-4 py-4 text-sm font-bold text-white transition hover:bg-white/10"
                >
                  Logout
                </button>
              </Panel>
            </div>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function Field(props: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-neutral-500">{props.label}</div>
      <div className="rounded-[1.25rem] border border-white/5 bg-surface-container-low p-1">{props.children}</div>
    </label>
  );
}
