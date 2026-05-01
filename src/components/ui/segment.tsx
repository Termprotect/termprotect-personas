"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface SegmentOption {
  value: string;
  label: string;
  href?: string;
}

interface SegmentProps {
  options: SegmentOption[];
  value: string;
  onChange?: (value: string) => void;
  className?: string;
  ariaLabel?: string;
}

export function Segment({ options, value, onChange, className, ariaLabel }: SegmentProps) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex items-center p-[2px] rounded-lg border border-line-2 bg-surface shadow-sm",
        className,
      )}
    >
      {options.map((opt) => {
        const isActive = opt.value === value;
        const cls = cn(
          "px-3 h-7 inline-flex items-center justify-center font-mono text-[10.5px] font-medium uppercase tracking-[0.04em] rounded-md transition-colors",
          isActive
            ? "bg-ink text-bg dark:bg-accent dark:text-[#0a0e1a]"
            : "text-ink-3 hover:text-ink",
        );
        if (opt.href) {
          return (
            <Link
              key={opt.value}
              href={opt.href}
              role="radio"
              aria-checked={isActive}
              scroll={false}
              className={cls}
            >
              {opt.label}
            </Link>
          );
        }
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onChange?.(opt.value)}
            className={cls}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
