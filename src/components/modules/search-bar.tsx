"use client";

import { Search } from "lucide-react";
import { useEffect } from "react";

export function SearchBar() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // eslint-disable-next-line no-console
        console.log("[search] command palette not implemented yet");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onClick() {
    // eslint-disable-next-line no-console
    console.log("[search] command palette not implemented yet");
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden md:inline-flex items-center gap-2 h-8 min-w-[260px] px-3 rounded-lg border border-line-2 bg-surface text-left text-ink-3 hover:border-line-3 transition-colors"
    >
      <Search className="w-3.5 h-3.5 text-ink-3" aria-hidden />
      <span className="text-[12px] flex-1">
        Buscar empleado, documento, ciclo…
      </span>
      <kbd className="font-mono text-[10px] px-1.5 py-px rounded border border-line-2 text-ink-3">
        ⌘K
      </kbd>
    </button>
  );
}
