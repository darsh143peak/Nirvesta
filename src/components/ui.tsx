import { Link } from "react-router-dom";
import { MaterialIcon } from "./MaterialIcon";

export function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <span className="text-xs font-bold uppercase tracking-[0.25em] text-tertiary">{children}</span>;
}

export function Panel(props: { children: React.ReactNode; className?: string }) {
  return <div className={`glass-card rounded-[2rem] ${props.className ?? ""}`}>{props.children}</div>;
}

export function StatPill(props: { label: string; value: string; tone?: "default" | "tertiary" | "secondary" }) {
  const toneClass =
    props.tone === "tertiary"
      ? "text-tertiary"
      : props.tone === "secondary"
        ? "text-secondary"
        : "text-white";

  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <p className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">{props.label}</p>
      <p className={`mt-2 text-xl font-bold ${toneClass}`}>{props.value}</p>
    </div>
  );
}

export function RouteCard(props: {
  title: string;
  description: string;
  href: string;
  icon: string;
}) {
  return (
    <Link
      to={props.href}
      className="group rounded-[2rem] border border-white/5 bg-surface-container p-6 transition hover:border-white/10 hover:bg-surface-container-high"
    >
      <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-tertiary shadow-emerald">
        <MaterialIcon name={props.icon} className="text-3xl" fill />
      </div>
      <h3 className="text-2xl font-bold text-white transition group-hover:text-tertiary">{props.title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-on-surface-variant">{props.description}</p>
    </Link>
  );
}
