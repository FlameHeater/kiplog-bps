// Hand-authored flat/line illustration (no third-party asset — see
// docs/ASSUMPTIONS.md redesign entry for why). Colors reference the active
// theme tokens directly so it follows dark mode + accent automatically.
export function EmptyActivities() {
  return (
    <svg viewBox="0 0 160 120" fill="none" className="h-28 w-auto" aria-hidden="true">
      <rect x="20" y="14" width="88" height="98" rx="8" fill="hsl(var(--muted))" />
      <rect x="20" y="14" width="88" height="24" rx="8" fill="hsl(var(--primary) / 0.12)" />
      <rect x="34" y="24" width="36" height="6" rx="3" fill="hsl(var(--primary))" />
      {[54, 70, 86].map((y) => (
        <g key={y}>
          <rect x="34" y={y} width="60" height="6" rx="3" fill="hsl(var(--border))" />
          <circle cx="26" cy={y + 3} r="3" fill="hsl(var(--border))" />
        </g>
      ))}
      <circle cx="122" cy="86" r="26" fill="hsl(var(--primary) / 0.1)" />
      <path
        d="M110 86h24M122 74v24"
        stroke="hsl(var(--primary))"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}
