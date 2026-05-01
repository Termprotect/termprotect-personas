import * as React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: React.ReactNode;
  sub?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/**
 * Page-level header. Renders an H1 with the editorial serif italic for any <em>
 * inside the title (e.g. <>Analytics <em>de personas</em></>).
 */
export function PageHeader({ title, sub, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-end justify-between gap-4 mb-6 font-serif-italic",
        className,
      )}
    >
      <div className="flex flex-col gap-1.5 min-w-0">
        <h1 className="text-[30px] leading-[1.15] font-medium tracking-[-0.02em] text-ink">
          {title}
        </h1>
        {sub ? (
          <div className="text-[12px] text-ink-3 font-mono uppercase tracking-[0.04em]">
            {sub}
          </div>
        ) : null}
      </div>
      {actions ? (
        <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>
      ) : null}
    </header>
  );
}
