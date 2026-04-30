import Link from "next/link";
import { cn } from "@/lib/utils";

export interface UrlTabItem {
  value: string;
  label: string;
  href: string;
  badge?: string | number;
}

interface UrlTabsProps {
  tabs: UrlTabItem[];
  activeValue: string;
  className?: string;
}

export function UrlTabs({ tabs, activeValue, className }: UrlTabsProps) {
  return (
    <div
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "flex gap-1 border-b border-slate-200 overflow-x-auto",
        className,
      )}
    >
      {tabs.map((t) => {
        const isActive = t.value === activeValue;
        return (
          <Link
            key={t.value}
            href={t.href}
            role="tab"
            aria-selected={isActive}
            scroll={false}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap",
              isActive
                ? "border-blue-600 text-blue-700"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300",
            )}
          >
            {t.label}
            {t.badge !== undefined && t.badge !== 0 ? (
              <span
                className={cn(
                  "inline-flex items-center justify-center h-5 min-w-[20px] px-1 rounded-full text-[11px] font-medium",
                  isActive ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-600",
                )}
              >
                {t.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </div>
  );
}
