interface SplitMeterProps {
  label: string;
  segments: { key: string; label: string; value: number; color: string }[];
}

export function SplitMeter({ label, segments }: SplitMeterProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  return (
    <div>
      <div className="text-[13px] font-medium text-ink-secondary">{label}</div>
      <div className="mt-2.5 flex h-3 w-full overflow-hidden rounded-full bg-surface-subtle">
        {total === 0 ? null : (
          <>
            {segments.map((s, i) => {
              const pct = (s.value / total) * 100;
              if (pct <= 0) return null;
              return (
                <div
                  key={s.key}
                  style={{ width: `${pct}%`, backgroundColor: s.color }}
                  className={i > 0 ? "ml-[2px]" : undefined}
                />
              );
            })}
          </>
        )}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-1">
        {segments.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-[13px] text-ink-secondary">
            <span
              className="inline-block size-2 rounded-full"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="font-semibold text-ink">{s.value}</span>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
