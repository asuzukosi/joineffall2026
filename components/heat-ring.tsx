export function HeatRing({ paths }: { paths: number }) {
  const level = Math.min(paths, 5);
  const radius = 14;
  const circumference = 2 * Math.PI * radius;

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="relative inline-flex size-9 items-center justify-center">
        <svg viewBox="0 0 36 36" className="absolute size-9 -rotate-90" aria-hidden>
          <circle
            cx="18" cy="18" r={radius} fill="none" strokeWidth="3"
            stroke="var(--heat-track)"
          />
          <circle
            cx="18" cy="18" r={radius} fill="none" strokeWidth="3"
            stroke={`var(--heat-${level})`}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - level / 5)}
          />
        </svg>
        <span className="text-xs font-medium tabular-nums">{paths}</span>
      </span>
      {level >= 5 && <span aria-hidden>🔥</span>}
      <span className="sr-only">
        {paths === 1
          ? "1 cohort member knows them"
          : `${paths} cohort members know them`}
      </span>
    </span>
  );
}
