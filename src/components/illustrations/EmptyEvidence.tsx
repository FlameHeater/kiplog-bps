export function EmptyEvidence() {
  return (
    <svg viewBox="0 0 160 120" fill="none" className="h-28 w-auto" aria-hidden="true">
      <rect x="18" y="22" width="70" height="54" rx="6" fill="hsl(var(--muted))" transform="rotate(-6 53 49)" />
      <rect x="34" y="30" width="70" height="54" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <circle cx="52" cy="48" r="7" fill="hsl(var(--primary) / 0.25)" />
      <path
        d="M40 74l14-14 10 10 14-16 16 20"
        stroke="hsl(var(--primary))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <g>
        <circle cx="120" cy="82" r="22" fill="hsl(var(--primary) / 0.1)" />
        <path
          d="M112 82l6 6 12-14"
          stroke="hsl(var(--primary))"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
