import { CheckCircle2, Circle } from 'lucide-react';
import { validateReadyToReport, type ReadyToReportInput, type ReadyToReportOptions } from '@/lib/services/activity-validator';

interface ReadyToReportChecklistProps {
  input: ReadyToReportInput;
  options: ReadyToReportOptions;
}

// §12.3 — shown live in the form, not just gated at submit time.
export function ReadyToReportChecklist({ input, options }: ReadyToReportChecklistProps) {
  const result = validateReadyToReport(input, options);

  function jumpTo(field: string) {
    const el = document.getElementById(field);
    if (el) {
      el.scrollIntoView({ block: 'center' });
      el.focus();
    }
  }

  return (
    <div className="rounded-control border border-border p-3">
      <p className="mb-2 text-xs font-medium">
        {result.isReady ? 'Siap dilaporkan' : 'Belum siap dilaporkan'}
      </p>
      <ul className="space-y-1">
        {result.checks.map((check) => (
          <li key={check.field}>
            <button
              type="button"
              onClick={() => jumpTo(check.field)}
              disabled={check.passed}
              className="flex w-full items-center gap-1.5 text-left text-xs disabled:cursor-default"
            >
              {check.passed ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
              ) : (
                <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              )}
              <span className={check.passed ? 'text-muted-foreground' : 'underline'}>
                {check.label}
                {check.message && !check.passed ? ` — ${check.message}` : ''}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
