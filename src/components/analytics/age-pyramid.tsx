interface Bucket {
  range: string;
  total: number;
}

interface AgePyramidProps {
  buckets: Bucket[];
  averageAge: number | null;
  total: number;
}

export function AgePyramid({ buckets, averageAge, total }: AgePyramidProps) {
  const max = buckets.reduce((acc, b) => Math.max(acc, b.total), 0);

  return (
    <div className="flex flex-col gap-2 min-w-0">
      <div className="flex items-baseline justify-between">
        <span className="text-[11px] font-mono uppercase tracking-[0.04em] text-ink-3">
          Edad media
        </span>
        <span className="font-mono text-[18px] font-medium text-ink tabular-nums">
          {averageAge ?? "—"}
          <span className="text-ink-3 text-[10px] ml-1">años</span>
        </span>
      </div>

      <div className="flex flex-col gap-[6px]">
        {buckets.map((b) => {
          const pct = max > 0 ? (b.total / max) * 100 : 0;
          return (
            <div
              key={b.range}
              className="grid items-center gap-2"
              style={{ gridTemplateColumns: "44px 1fr 32px" }}
            >
              <span className="font-mono text-[10px] text-ink-3 uppercase tracking-[0.04em]">
                {b.range}
              </span>
              <div className="h-[14px] rounded-sm bg-line" aria-hidden>
                <div
                  className="h-full rounded-sm bg-accent transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="font-mono text-[10px] text-ink-2 text-right tabular-nums">
                {b.total}
              </span>
            </div>
          );
        })}
      </div>

      <div className="text-[10px] font-mono uppercase tracking-[0.04em] text-ink-3 mt-1">
        TOTAL · {total}
      </div>
    </div>
  );
}
