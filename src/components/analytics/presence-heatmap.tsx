interface Cell {
  date: string;
  deltaPct: number;
}

interface Row {
  sedeId: string;
  sedeName: string;
  cells: Cell[];
}

interface PresenceHeatmapProps {
  rows: Row[];
  days: number;
}

function colorForDelta(d: number): string {
  if (d >= 0) {
    const pct = Math.min(100, Math.round(d * 100));
    return `color-mix(in srgb, var(--good) ${Math.max(8, pct)}%, var(--surface-2))`;
  }
  const pct = Math.min(100, Math.round(Math.abs(d) * 100));
  return `color-mix(in srgb, var(--bad) ${Math.max(8, pct)}%, var(--surface-2))`;
}

export function PresenceHeatmap({ rows, days }: PresenceHeatmapProps) {
  if (rows.length === 0) {
    return (
      <div className="text-[11px] font-mono uppercase tracking-[0.04em] text-ink-3 py-6 text-center">
        Sin datos
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-[0.04em] text-ink-3">
        <span>Hace {days} días</span>
        <span>Hoy</span>
      </div>

      {rows.map((row) => (
        <div
          key={row.sedeId}
          className="grid items-center gap-2"
          style={{ gridTemplateColumns: "60px 1fr" }}
        >
          <div className="font-mono text-[10px] uppercase tracking-[0.04em] text-ink-2 truncate">
            {row.sedeName}
          </div>
          <div className="flex gap-[2px]">
            {row.cells.map((c) => (
              <div
                key={c.date}
                className="flex-1 h-[18px] rounded-[2px]"
                style={{ backgroundColor: colorForDelta(c.deltaPct) }}
                title={`${c.date}: Δ ${(c.deltaPct * 100).toFixed(0)}%`}
                aria-label={`${row.sedeName} ${c.date}`}
              />
            ))}
          </div>
        </div>
      ))}

      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.04em] text-ink-3 mt-1">
        <span>Bajo</span>
        <div
          className="h-[6px] flex-1 rounded-full"
          style={{
            background:
              "linear-gradient(90deg, var(--bad) 0%, var(--surface-2) 50%, var(--good) 100%)",
          }}
          aria-hidden
        />
        <span>Alto</span>
      </div>
    </div>
  );
}
