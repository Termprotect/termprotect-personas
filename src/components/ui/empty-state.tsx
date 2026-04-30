import * as React from "react";
import { cn } from "@/lib/utils";

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-6" : "py-10",
        className,
      )}
      {...props}
    >
      {icon ? (
        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center mb-3 text-slate-400">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-medium text-slate-700">{title}</p>
      {description ? (
        <p className="text-xs text-slate-500 mt-1 max-w-sm">{description}</p>
      ) : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
