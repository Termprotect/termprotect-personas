import * as React from "react";
import { cn } from "@/lib/utils";

interface TblProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string;
}

export function Tbl({ className, containerClassName, ...props }: TblProps) {
  return (
    <div
      className={cn(
        "overflow-auto rounded-xl border border-line-2 bg-surface shadow-sm",
        containerClassName,
      )}
    >
      <table
        className={cn("w-full text-left border-collapse", className)}
        {...props}
      />
    </div>
  );
}

export function TblHead(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      {...props}
      className={cn(
        "bg-surface-2 border-b border-line-2 sticky top-0 z-10",
        props.className,
      )}
    />
  );
}

export function TblHeadRow(props: React.HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} />;
}

interface TblHeadCellProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  right?: boolean;
}

export function TblHeadCell({ right, className, ...props }: TblHeadCellProps) {
  return (
    <th
      {...props}
      className={cn(
        "h-8 px-3.5 text-[10.5px] font-medium uppercase tracking-[0.06em] text-ink-3",
        right ? "text-right" : "text-left",
        className,
      )}
    />
  );
}

export function TblBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

interface TblRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  interactive?: boolean;
}

export function TblRow({ interactive, className, ...props }: TblRowProps) {
  return (
    <tr
      {...props}
      className={cn(
        "border-b border-line transition-colors",
        interactive && "hover:bg-line/40 cursor-pointer",
        className,
      )}
    />
  );
}

interface TblCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  mono?: boolean;
  right?: boolean;
  idCell?: boolean;
}

export function TblCell({ className, mono, right, idCell, style, ...props }: TblCellProps) {
  return (
    <td
      {...props}
      className={cn(
        "px-3.5 align-middle text-[12.5px]",
        mono && "font-mono text-[11.5px] tabular-nums",
        idCell && "font-mono text-[10.5px] tabular-nums text-ink-3",
        right && "text-right",
        className,
      )}
      style={{ height: "var(--row-h)", ...style }}
    />
  );
}
