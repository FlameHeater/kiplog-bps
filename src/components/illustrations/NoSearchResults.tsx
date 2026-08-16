export function NoSearchResults() {
  return (
    <svg viewBox="0 0 120 120" fill="none" className="h-20 w-auto" aria-hidden="true">
      <circle cx="52" cy="52" r="30" fill="hsl(var(--muted))" />
      <circle cx="52" cy="52" r="30" stroke="hsl(var(--border))" strokeWidth="3" />
      <path d="M74 74l20 20" stroke="hsl(var(--muted-foreground))" strokeWidth="5" strokeLinecap="round" />
      <path d="M42 52h20M52 42v20" stroke="hsl(var(--primary))" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}
