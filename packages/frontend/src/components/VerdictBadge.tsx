import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from "lucide-react";
import type { Verdict } from "@verities/shared";

const config: Record<Verdict, {
  label: string;
  icon: typeof CheckCircle2;
  classes: string;
}> = {
  broadly_supported: {
    label: "Broadly Supported",
    icon: CheckCircle2,
    classes: "bg-green/10 text-green border border-green/20",
  },
  overstated: {
    label: "Overstated",
    icon: AlertTriangle,
    classes: "bg-amber/10 text-amber-light border border-amber/20",
  },
  disputed: {
    label: "Disputed",
    icon: AlertOctagon,
    classes: "bg-rose/10 text-rose-light border border-rose/20",
  },
  unclear: {
    label: "Unclear",
    icon: HelpCircle,
    classes: "bg-white/5 text-ink-muted border border-white/10",
  },
};

export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const c = config[verdict];
  const Icon = c.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${c.classes}`}>
      <Icon className="h-3.5 w-3.5" />
      {c.label}
    </span>
  );
}
