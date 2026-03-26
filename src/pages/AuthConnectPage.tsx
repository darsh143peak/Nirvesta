import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { AppShell } from "../components/chrome";
import { MaterialIcon } from "../components/MaterialIcon";
import { Panel, SectionEyebrow } from "../components/ui";

type AuthMode = "signin" | "signup";

const brokers = [
  { name: "Zerodha", tag: "Kite API", icon: "rocket_launch", color: "#387ed1" },
  { name: "Upstox", tag: "Direct Link", icon: "account_balance", color: "#673ab7" },
  { name: "Groww", tag: "Fast Connect", icon: "trending_up", color: "#00d09c" },
];

const riskOptions = ["Conservative", "Balanced", "Growth", "Aggressive"];
const experienceOptions = ["Beginner", "Intermediate", "Advanced"];
const goalOptions = ["Retirement", "Home Purchase", "Emergency Buffer", "Wealth Growth", "Family Milestone"];

export function AuthConnectPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const nextRoute = searchParams.get("next") || "/strategy";

  const { signIn, signUp, signInWithGoogle, isAuthenticated, profile, hasSupabaseEnv, signOut, updateProfile } = useAuth();

  const [mode, setMode] = useState<AuthMode>("signup");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [signInForm, setSignInForm] = useState({
    email: "",
    password: "",
  });

  const [signUpForm, setSignUpForm] = useState({
    fullName: "",
    age: "28",
    email: "",
    password: "",
    confirmPassword: "",
    riskAttitude: "Balanced",
    investingExperience: "Beginner",
    primaryGoal: "Wealth Growth",
    timeHorizonYears: "10",
    monthlyInvestableSurplus: "25000",
    emergencyFundMonths: "6",
    emailNotifications: true,
  });
  const [completionForm, setCompletionForm] = useState({
    age: "",
    riskAttitude: "Balanced",
    investingExperience: "Beginner",
    primaryGoal: "Wealth Growth",
    timeHorizonYears: "10",
    monthlyInvestableSurplus: "25000",
    emergencyFundMonths: "6",
    emailNotifications: true,
  });

  const profileSummary = useMemo(
    () => [
      ["Name", profile?.full_name ?? "Pending sync"],
      ["Email", profile?.email ?? "Pending sync"],
      ["Risk Attitude", profile?.risk_attitude ?? "Pending sync"],
      ["Goal", profile?.primary_goal ?? "Pending sync"],
    ],
    [profile],
  );
  const needsProfileCompletion = isAuthenticated && (!profile?.age || !profile?.risk_attitude || !profile?.primary_goal);

  async function handleSignInSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await signIn(signInForm.email, signInForm.password);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    navigate(nextRoute);
  }

  async function handleSignUpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError("Passwords do not match.");
      setSubmitting(false);
      return;
    }

    const result = await signUp({
      fullName: signUpForm.fullName,
      age: Number(signUpForm.age),
      email: signUpForm.email,
      password: signUpForm.password,
      riskAttitude: signUpForm.riskAttitude,
      investingExperience: signUpForm.investingExperience,
      primaryGoal: signUpForm.primaryGoal,
      timeHorizonYears: Number(signUpForm.timeHorizonYears),
      monthlyInvestableSurplus: Number(signUpForm.monthlyInvestableSurplus),
      emergencyFundMonths: Number(signUpForm.emergencyFundMonths),
      emailNotifications: signUpForm.emailNotifications,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    setMessage(
      result.needsEmailVerification
        ? "Account created. Check your email to verify your Supabase account, then sign in."
        : "Account created and session issued. Redirecting you into Nirvesta.",
    );

    if (!result.needsEmailVerification) {
      navigate(nextRoute);
    }
  }

  async function handleGoogleAuth() {
    setError(null);
    setMessage(null);
    setSubmitting(true);

    const result = await signInWithGoogle();

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
    }
  }

  async function handleProfileCompletionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setMessage(null);

    const result = await updateProfile({
      age: Number(completionForm.age),
      risk_attitude: completionForm.riskAttitude,
      investing_experience: completionForm.investingExperience,
      primary_goal: completionForm.primaryGoal,
      time_horizon_years: Number(completionForm.timeHorizonYears),
      monthly_investable_surplus: Number(completionForm.monthlyInvestableSurplus),
      emergency_fund_months: Number(completionForm.emergencyFundMonths),
      email_notifications: completionForm.emailNotifications,
    });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    setMessage("Profile completed. Your risk and goal data are now available to the product.");
    setSubmitting(false);
  }

  if (isAuthenticated) {
    return (
      <AppShell
        withSidebar={false}
        topNav={[
          { label: "Terminal", href: "/" },
          { label: "Vault", href: "/auditor" },
          { label: "Insights", href: "/sentinel" },
        ]}
        metricValue="JWT Active"
      >
        <div className="mx-auto grid max-w-6xl gap-10 py-12 lg:grid-cols-12">
          <section className="space-y-6 lg:col-span-5">
            <SectionEyebrow>Secure Session</SectionEyebrow>
            <h1 className="text-5xl font-black tracking-[-0.05em] text-white">You&apos;re authenticated.</h1>
            <p className="max-w-md text-lg text-on-surface-variant">
              The product routes are now protected behind your Supabase session JWT. Public access is limited to the landing and auth pages.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => navigate(nextRoute)}
                className="rounded-2xl bg-white px-6 py-3 font-bold text-on-primary transition hover:scale-95"
              >
                Enter Nirvesta
              </button>
              <button
                onClick={() => void signOut()}
                className="rounded-2xl border border-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          </section>
          <section className="space-y-6 lg:col-span-7">
            <Panel className="p-8">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Profile Snapshot</h2>
                <span className="rounded-full border border-tertiary/20 bg-tertiary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-tertiary">
                  JWT Session Active
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                {profileSummary.map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">{label}</div>
                    <div className="mt-2 text-lg font-semibold text-white">{value}</div>
                  </div>
                ))}
              </div>
            </Panel>
            {needsProfileCompletion ? (
              <Panel className="p-8">
                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-white">Complete your risk profile</h3>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    Google sign-in handled identity. We still need your planning fields for risk capacity, recommendations, and notifications.
                  </p>
                </div>
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleProfileCompletionSubmit}>
                  <Field label="Age">
                    <input
                      type="number"
                      min={18}
                      max={120}
                      required
                      value={completionForm.age}
                      onChange={(event) => setCompletionForm((current) => ({ ...current, age: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    />
                  </Field>
                  <Field label="Risk Attitude">
                    <select
                      value={completionForm.riskAttitude}
                      onChange={(event) => setCompletionForm((current) => ({ ...current, riskAttitude: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    >
                      {riskOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Investing Experience">
                    <select
                      value={completionForm.investingExperience}
                      onChange={(event) => setCompletionForm((current) => ({ ...current, investingExperience: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    >
                      {experienceOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Primary Goal">
                    <select
                      value={completionForm.primaryGoal}
                      onChange={(event) => setCompletionForm((current) => ({ ...current, primaryGoal: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    >
                      {goalOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Time Horizon (Years)">
                    <input
                      type="number"
                      min={1}
                      required
                      value={completionForm.timeHorizonYears}
                      onChange={(event) => setCompletionForm((current) => ({ ...current, timeHorizonYears: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    />
                  </Field>
                  <Field label="Monthly Investable Surplus (Rs)">
                    <input
                      type="number"
                      min={0}
                      required
                      value={completionForm.monthlyInvestableSurplus}
                      onChange={(event) => setCompletionForm((current) => ({ ...current, monthlyInvestableSurplus: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    />
                  </Field>
                  <Field label="Emergency Fund (Months)">
                    <input
                      type="number"
                      min={0}
                      required
                      value={completionForm.emergencyFundMonths}
                      onChange={(event) => setCompletionForm((current) => ({ ...current, emergencyFundMonths: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-sm text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={completionForm.emailNotifications}
                        onChange={(event) => setCompletionForm((current) => ({ ...current, emailNotifications: event.target.checked }))}
                        className="h-4 w-4"
                      />
                      Keep email alerts enabled for portfolio events and recommendations.
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-2xl bg-white py-4 font-bold text-on-primary transition hover:scale-[0.99] disabled:opacity-60"
                    >
                      {submitting ? "Saving Profile..." : "Save Profile Details"}
                    </button>
                  </div>
                </form>
              </Panel>
            ) : null}
            <Panel className="p-8">
              <h3 className="text-xl font-bold text-white">Connected Broker Shortlist</h3>
              <p className="mt-2 text-sm text-on-surface-variant">
                These options stay available after auth so the next step can be broker linking and portfolio ingestion.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {brokers.map((broker) => (
                  <div key={broker.name} className="rounded-[1.5rem] border border-white/5 bg-surface-container-high p-6 text-center">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl" style={{ backgroundColor: `${broker.color}1a` }}>
                      <MaterialIcon name={broker.icon} className="text-3xl" fill />
                    </div>
                    <div className="font-bold text-white">{broker.name}</div>
                    <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-on-surface-variant">{broker.tag}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </section>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      withSidebar={false}
      topNav={[
        { label: "Landing", href: "/" },
        { label: "Secure Access", href: "/connect" },
      ]}
      metricValue="Supabase Auth"
      rightSlot={
        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <MaterialIcon name="verified_user" className="text-xl text-tertiary" fill />
        </div>
      }
    >
      <div className="relative mx-auto max-w-6xl overflow-hidden py-12">
        <div className="pointer-events-none absolute -left-32 top-0 h-80 w-80 rounded-full bg-tertiary/10 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 right-0 h-80 w-80 rounded-full bg-secondary/10 blur-[120px]" />
        <div className="relative z-10 grid gap-12 lg:grid-cols-12">
          <section className="space-y-8 py-8 lg:col-span-5">
            <div>
              <SectionEyebrow>Supabase Identity Layer</SectionEyebrow>
              <h1 className="mt-4 text-5xl font-black leading-none tracking-[-0.05em] text-white md:text-7xl">
                Secure onboarding with real auth.
              </h1>
              <p className="mt-5 max-w-md text-lg leading-relaxed text-on-surface-variant">
                Sign up with profile data that feeds risk capacity and notification flows, or continue with Google through Supabase OAuth.
              </p>
            </div>

            <div className="space-y-4">
              {[
                ["badge", "JWT-Gated Product", "Internal pages redirect to auth until a valid Supabase session exists."],
                ["database", "Supabase Profile Store", "Signup metadata is written into a first-class profiles table with RLS."],
                ["notifications", "Email Notifications", "We capture notification consent and email for future event alerts."],
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

            {!hasSupabaseEnv ? (
              <Panel className="border-secondary/20 bg-secondary/10 p-5">
                <div className="text-sm font-semibold text-secondary">Supabase env vars missing</div>
                <p className="mt-2 text-sm text-on-surface-variant">
                  Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from `.env.example`, then run the SQL in `supabase/schema.sql`.
                </p>
              </Panel>
            ) : null}
          </section>

          <section className="space-y-6 lg:col-span-7">
            <Panel className="p-8">
              <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Authenticate with Nirvesta</h2>
                  <p className="mt-2 text-sm text-on-surface-variant">
                    {mode === "signup"
                      ? "Create an account with risk-aware onboarding fields."
                      : "Sign in to unlock JWT-protected portfolio routes."}
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-2xl bg-surface-container p-1">
                  <button
                    onClick={() => setMode("signup")}
                    className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${mode === "signup" ? "bg-white text-on-primary" : "text-neutral-500"}`}
                  >
                    Sign Up
                  </button>
                  <button
                    onClick={() => setMode("signin")}
                    className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] ${mode === "signin" ? "bg-white text-on-primary" : "text-neutral-500"}`}
                  >
                    Sign In
                  </button>
                </div>
              </div>

              <button
                onClick={() => void handleGoogleAuth()}
                disabled={submitting}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-4 font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                  <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.7 3.9-5.5 3.9-3.3 0-6.1-2.8-6.1-6.2s2.7-6.2 6.1-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.8 2.7 14.6 2 12 2 6.9 2 2.8 6.2 2.8 11.3S6.9 20.7 12 20.7c6.9 0 9.2-4.8 9.2-7.3 0-.5-.1-.9-.1-1.3H12Z" />
                </svg>
                Continue with Google
              </button>

              <div className="my-6 flex items-center gap-4">
                <span className="h-px flex-1 bg-white/5" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">or continue with email</span>
                <span className="h-px flex-1 bg-white/5" />
              </div>

              {error ? <div className="mb-4 rounded-2xl border border-error/20 bg-error/10 px-4 py-3 text-sm text-error">{error}</div> : null}
              {message ? <div className="mb-4 rounded-2xl border border-tertiary/20 bg-tertiary/10 px-4 py-3 text-sm text-tertiary">{message}</div> : null}

              {mode === "signin" ? (
                <form className="space-y-4" onSubmit={handleSignInSubmit}>
                  <Field label="Email">
                    <input
                      type="email"
                      required
                      value={signInForm.email}
                      onChange={(event) => setSignInForm((current) => ({ ...current, email: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                      placeholder="you@example.com"
                    />
                  </Field>
                  <Field label="Password">
                    <input
                      type="password"
                      required
                      value={signInForm.password}
                      onChange={(event) => setSignInForm((current) => ({ ...current, password: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                      placeholder="Enter your password"
                    />
                  </Field>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl bg-white py-4 font-bold text-on-primary transition hover:scale-[0.99] disabled:opacity-60"
                  >
                    {submitting ? "Signing In..." : "Sign In Securely"}
                  </button>
                </form>
              ) : (
                <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSignUpSubmit}>
                  <Field label="Full Name">
                    <input
                      type="text"
                      required
                      value={signUpForm.fullName}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, fullName: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                      placeholder="Your full name"
                    />
                  </Field>
                  <Field label="Age">
                    <input
                      type="number"
                      min={18}
                      max={120}
                      required
                      value={signUpForm.age}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, age: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    />
                  </Field>
                  <Field label="Email">
                    <input
                      type="email"
                      required
                      value={signUpForm.email}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, email: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                      placeholder="notifyme@example.com"
                    />
                  </Field>
                  <Field label="Password">
                    <input
                      type="password"
                      required
                      value={signUpForm.password}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, password: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                      placeholder="Create a password"
                    />
                  </Field>
                  <Field label="Confirm Password">
                    <input
                      type="password"
                      required
                      value={signUpForm.confirmPassword}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, confirmPassword: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                      placeholder="Repeat your password"
                    />
                  </Field>
                  <Field label="Risk Attitude">
                    <select
                      value={signUpForm.riskAttitude}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, riskAttitude: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    >
                      {riskOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Investing Experience">
                    <select
                      value={signUpForm.investingExperience}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, investingExperience: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    >
                      {experienceOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Primary Goal">
                    <select
                      value={signUpForm.primaryGoal}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, primaryGoal: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    >
                      {goalOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Time Horizon (Years)">
                    <input
                      type="number"
                      min={1}
                      required
                      value={signUpForm.timeHorizonYears}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, timeHorizonYears: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    />
                  </Field>
                  <Field label="Monthly Investable Surplus (Rs)">
                    <input
                      type="number"
                      min={0}
                      required
                      value={signUpForm.monthlyInvestableSurplus}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, monthlyInvestableSurplus: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    />
                  </Field>
                  <Field label="Emergency Fund (Months)">
                    <input
                      type="number"
                      min={0}
                      required
                      value={signUpForm.emergencyFundMonths}
                      onChange={(event) => setSignUpForm((current) => ({ ...current, emergencyFundMonths: event.target.value }))}
                      className="w-full rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-white outline-none"
                    />
                  </Field>
                  <div className="md:col-span-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-surface-container-high px-4 py-4 text-sm text-on-surface-variant">
                      <input
                        type="checkbox"
                        checked={signUpForm.emailNotifications}
                        onChange={(event) => setSignUpForm((current) => ({ ...current, emailNotifications: event.target.checked }))}
                        className="h-4 w-4"
                      />
                      Send market alerts, risk notices, and onboarding emails to this address.
                    </label>
                  </div>
                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full rounded-2xl bg-white py-4 font-bold text-on-primary transition hover:scale-[0.99] disabled:opacity-60"
                    >
                      {submitting ? "Creating Account..." : "Create Secure Account"}
                    </button>
                  </div>
                </form>
              )}
            </Panel>

            <div className="flex items-center justify-between px-2 text-sm text-on-surface-variant">
              <Link to="/" className="transition hover:text-white">
                Return to landing
              </Link>
              <button
                onClick={() => setMode((current) => (current === "signup" ? "signin" : "signup"))}
                className="transition hover:text-white"
              >
                {mode === "signup" ? "Already have an account?" : "Need to create an account?"}
              </button>
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
      {props.children}
    </label>
  );
}
