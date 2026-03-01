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
    classes: "bg-sage-wash text-sage border border-sage-border",
  },
  overstated: {
    label: "Overstated",
    icon: AlertTriangle,
    classes: "bg-amber-wash text-amber border border-amber-border",
  },
  disputed: {
    label: "Disputed",
    icon: AlertOctagon,
    classes: "bg-terracotta-wash text-terracotta border border-terracotta-border",
  },
  unclear: {
    label: "Unclear",
    icon: HelpCircle,
    classes: "bg-slate-wash text-slate border border-slate-border",
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
