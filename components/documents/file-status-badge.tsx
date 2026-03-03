"use client";

import { Loader2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const statusConfig = {
  PENDING:    { label: "Pending",    icon: Clock,        class: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
  PROCESSING: { label: "Processing", icon: Loader2,      class: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800" },
  READY:      { label: "Ready",      icon: CheckCircle2, class: "text-green-600 bg-green-50 dark:bg-green-950/40 border-green-200 dark:border-green-800" },
  ERROR:      { label: "Error",      icon: AlertCircle,  class: "text-destructive bg-destructive/5 border-destructive/20" },
};

export function FileStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] ?? {
    label: status,
    icon: Clock,
    class: "text-muted-foreground bg-muted border-border",
  };

  const Icon = config.icon;
  const isSpinning = status === "PROCESSING";

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", config.class)}>
      <Icon className={cn("h-3 w-3", isSpinning && "animate-spin")} />
      {config.label}
    </span>
  );
}
