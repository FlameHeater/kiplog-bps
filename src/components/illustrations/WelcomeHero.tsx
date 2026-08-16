export function WelcomeHero() {
  return (
    <svg viewBox="0 0 220 160" fill="none" className="h-40 w-auto" aria-hidden="true">
      <ellipse cx="110" cy="140" rx="80" ry="10" fill="hsl(var(--primary) / 0.08)" />
      <rect x="50" y="24" width="120" height="92" rx="10" fill="hsl(var(--card))" stroke="hsl(var(--border))" strokeWidth="2" />
      <rect x="50" y="24" width="120" height="26" rx="10" fill="hsl(var(--primary))" />
      <circle cx="66" cy="37" r="4" fill="hsl(var(--primary-foreground) / 0.7)" />
      <circle cx="80" cy="37" r="4" fill="hsl(var(--primary-foreground) / 0.5)" />
      {[64, 82, 100].map((y) => (
        <rect key={y} x="66" y={y} width="88" height="8" rx="4" fill="hsl(var(--muted))" />
      ))}
      <rect x="66" y="64" width="46" height="8" rx="4" fill="hsl(var(--primary) / 0.5)" />
      <circle cx="34" cy="60" r="16" fill="hsl(var(--primary) / 0.15)" />
      <path d="M27 60l5 5 10-11" stroke="hsl(var(--primary))" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="192" cy="96" r="14" fill="hsl(var(--primary) / 0.12)" />
      <path d="M186 96h12M192 90v12" stroke="hsl(var(--primary))" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}
