interface Cell {
  x: 1 | 2 | 3;
  y: 1 | 2 | 3;
  count: number;
  percentage: number;
}

interface NineBoxProps {
  cells: Cell[];
  total: number;
  cycleName?: string | null;
}

const LABELS: Record<string, string> = {
  "1-3": "Diamante en bruto",
  "2-3": "Alto potencial",
  "3-3": "Estrellas",
  "1-2": "Inconsistente",
  "2-2": "Profesional sólido",
  "3-2": "Performer fiable",
  "1-1": "Riesgo / PIP",
  "2-1": "Caballo de batalla",
  "3-1": "Experto especialista",
};

function colorForCell(x: number, y: number): string {
  const score = (x + y) / 6;
  if (score < 0.5) {
    return "linear-gradient(135deg, #b8331c33, #c97a1433)";
  }
  if (score < 0.75) {
    return "linear-gradient(135deg, #c97a1433, #5b6b7d33)";
  }
  return "linear-gradient(135deg, #2f7a3a33, #2b4cdb33)";
}

export function NineBox({ cells, total, cycleName }: NineBoxProps) {
  const cellByXY = new Map<string, Cell>();
  for (const c of cells) cellByXY.set(`${c.x}-${c.y}`, c);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-ink-3">
          9-box · {cycleName ?? "—"}
        </span>
        <span className="font-mono text-[11px] tabular-nums text-ink-3">
          n = {total}
        </span>
      </div>

      <div
        className="grid gap-1.5"
        style={{
          gridTemplateColumns: "20px 1fr 1fr 1fr",
          gridTemplateRows: "1fr 1fr 1fr 20px",
          aspectRatio: "1.1 / 1",
        }}
      >
        <div
          className="flex items-center justify-center"
          style={{
            gridRow: "1 / span 3",
            gridColumn: "1",
            writingMode: "vertical-rl",
            transform: "rotate(180deg)",
          }}
        >
          <span className="text-[9.5px] font-mono uppercase tracking-[0.08em] text-ink-3">
            Desempeño →
          </span>
        </div>

        {[3, 2, 1].map((y) =>
          [1, 2, 3].map((x) => {
            const c = cellByXY.get(`${x}-${y}`);
            const count = c?.count ?? 0;
            const pct = c?.percentage ?? 0;
            const label = LABELS[`${x}-${y}`] ?? "";
            return (
              <div
                key={`${x}-${y}`}
                className="relative rounded-lg border border-line-2 bg-surface-2 overflow-hidden p-2 flex flex-col justify-between"
              >
                <div
                  className="absolute inset-0 pointer-events-none opacity-90"
                  style={{ background: colorForCell(x, y) }}
                  aria-hidden
                />
                <div className="relative text-[10px] leading-tight text-ink-2">
                  {label}
                </div>
                <div className="relative flex items-baseline justify-between">
                  <span className="font-mono text-[22px] font-medium tabular-nums leading-none text-ink">
                    {count}
                  </span>
                  <span className="font-mono text-[9.5px] tabular-nums text-ink-3">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          }),
        )}

        <div
          className="flex items-center justify-center"
          style={{ gridColumn: "2 / span 3", gridRow: "4" }}
        >
          <span className="text-[9.5px] font-mono uppercase tracking-[0.08em] text-ink-3">
            Potencial →
          </span>
        </div>
      </div>
    </div>
  );
}
