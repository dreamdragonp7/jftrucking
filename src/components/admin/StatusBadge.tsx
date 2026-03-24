import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import {
  CheckCircle2,
  Clock,
  MinusCircle,
  XCircle,
  PauseCircle,
  Edit3,
  Send,
  DollarSign,
  AlertCircle,
  Calendar,
  ThumbsUp,
  Truck,
  AlertTriangle,
  Settings,
  HelpCircle
} from "lucide-react";

// ---------------------------------------------------------------------------
// Status color mapping
// ---------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  // Entity statuses
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inactive: "bg-zinc-100 text-zinc-600 border-zinc-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  suspended: "bg-red-50 text-red-700 border-red-200",
  deactivated: "bg-zinc-100 text-zinc-500 border-zinc-200",
  rejected: "bg-red-50 text-red-600 border-red-200",
  // Site types
  quarry: "bg-orange-50 text-orange-700 border-orange-200",
  plant: "bg-blue-50 text-blue-700 border-blue-200",
  jobsite: "bg-violet-50 text-violet-700 border-violet-200",
  // Rate types
  per_ton: "bg-sky-50 text-sky-700 border-sky-200",
  per_load: "bg-indigo-50 text-indigo-700 border-indigo-200",
  // per_hour removed — JFT only uses per_ton and per_load
  // Payment terms
  net_15: "bg-blue-50 text-blue-700 border-blue-200",
  net_30: "bg-blue-50 text-blue-700 border-blue-200",
  net_45: "bg-amber-50 text-amber-700 border-amber-200",
  net_60: "bg-orange-50 text-orange-700 border-orange-200",
  // Boolean-like
  yes: "bg-emerald-50 text-emerald-700 border-emerald-200",
  no: "bg-red-50 text-red-700 border-red-200",
  // Truck
  maintenance: "bg-amber-50 text-amber-700 border-amber-200",
  // Entity types
  customer: "bg-blue-50 text-blue-700 border-blue-200",
  carrier: "bg-purple-50 text-purple-700 border-purple-200",
  // Purchase Order statuses
  fulfilled: "bg-emerald-50 text-emerald-700 border-emerald-200",
  on_hold: "bg-orange-50 text-orange-700 border-orange-200",
  cancelled: "bg-red-50 text-red-700 border-red-200",
  // Invoice statuses
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  sent: "bg-sky-50 text-sky-700 border-sky-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  overdue: "bg-red-50 text-red-700 border-red-200", // computed display-only status
  // Dispatch statuses
  scheduled: "bg-zinc-100 text-zinc-600 border-zinc-200",
  dispatched: "bg-amber-50 text-amber-700 border-amber-200",
  acknowledged: "bg-indigo-50 text-indigo-700 border-indigo-200",
  in_progress: "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-sky-50 text-sky-700 border-sky-200",
  confirmed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  disputed: "bg-red-50 text-red-700 border-red-200",
  // Payment statuses
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  returned: "bg-orange-50 text-orange-700 border-orange-200",
  // Settlement statuses
  approved: "bg-sky-50 text-sky-700 border-sky-200",
  // (confirmation statuses use pending/confirmed/disputed above)
};

const LABEL_MAP: Record<string, string> = {
  net_15: "Net 15",
  net_30: "Net 30",
  net_45: "Net 45",
  net_60: "Net 60",
  per_ton: "Per Ton",
  per_load: "Per Load",
  jobsite: "Job Site",
  quarry: "Quarry",
  plant: "Plant",
  on_hold: "On Hold",
  overdue: "Overdue",
  in_progress: "In Progress",
};

// ---------------------------------------------------------------------------
// Icon mapping
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, any> = {
  active: CheckCircle2,
  pending: Clock,
  inactive: MinusCircle,
  suspended: XCircle,
  deactivated: MinusCircle,
  rejected: XCircle,
  fulfilled: CheckCircle2,
  on_hold: PauseCircle,
  cancelled: XCircle,
  draft: Edit3,
  sent: Send,
  paid: DollarSign,
  overdue: AlertCircle,
  scheduled: Calendar,
  dispatched: Send,
  acknowledged: ThumbsUp,
  in_progress: Truck,
  delivered: CheckCircle2,
  confirmed: CheckCircle2,
  disputed: AlertTriangle,
  processing: Clock,
  completed: CheckCircle2,
  failed: XCircle,
  returned: MinusCircle,
  approved: CheckCircle2,
  maintenance: Settings,
  yes: CheckCircle2,
  no: XCircle,
};

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  const styles = STATUS_STYLES[normalizedStatus] ?? STATUS_STYLES.inactive;
  const displayLabel =
    label ?? LABEL_MAP[normalizedStatus] ?? status.charAt(0).toUpperCase() + status.slice(1);

  const Icon = ICON_MAP[normalizedStatus] ?? HelpCircle;

  return (
    <Badge
      variant="outline"
      className={cn("font-medium text-[11px] border gap-1.5 pl-2 pr-2.5 py-0.5", styles, className)}
    >
      <Icon className="h-3 w-3 flex-shrink-0" />
      {displayLabel}
    </Badge>
  );
}
