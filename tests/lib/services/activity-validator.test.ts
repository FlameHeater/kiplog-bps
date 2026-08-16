import { describe, expect, it } from 'vitest';
import { validateReadyToReport, type ReadyToReportInput } from '@/lib/services/activity-validator';

const baseOptions = {
  requireEvidenceForReady: true,
  requireEvidenceLinkForReady: true,
  periodLocked: false,
};

const validInput: ReadyToReportInput = {
  date: '2026-08-16',
  startTime: '08:00',
  endTime: '10:00',
  performancePlanId: 'plan-1',
  planExists: true,
  description: 'Melakukan input petugas SNLIK 2026 di website provinsi',
  achievement: 'Terselesaikannya input petugas SNLIK 2026 di website provinsi',
  progress: 100,
  evidenceCount: 1,
  evidenceLink: 'https://drive.google.com/file/x',
};

describe('validateReadyToReport', () => {
  it('passes when every rule is satisfied', () => {
    const result = validateReadyToReport(validInput, baseOptions);
    expect(result.isReady).toBe(true);
    expect(result.checks.every((c) => c.passed)).toBe(true);
  });

  it('fails when description is under 10 characters', () => {
    const result = validateReadyToReport({ ...validInput, description: 'rapat' }, baseOptions);
    expect(result.isReady).toBe(false);
    expect(result.checks.find((c) => c.field === 'description')?.passed).toBe(false);
  });

  it('fails when no Rencana Kinerja is selected', () => {
    const result = validateReadyToReport({ ...validInput, performancePlanId: null }, baseOptions);
    expect(result.checks.find((c) => c.field === 'performancePlanId')?.passed).toBe(false);
  });

  it('fails when endTime is not after startTime', () => {
    const result = validateReadyToReport({ ...validInput, endTime: '07:00' }, baseOptions);
    expect(result.checks.find((c) => c.field === 'startTime')?.passed).toBe(false);
  });

  it('fails duration under 5 minutes', () => {
    const result = validateReadyToReport({ ...validInput, startTime: '08:00', endTime: '08:02' }, baseOptions);
    expect(result.checks.find((c) => c.field === 'startTime')?.passed).toBe(false);
  });

  it('requires evidence only when requireEvidenceForReady is true', () => {
    const withoutEvidence = { ...validInput, evidenceCount: 0 };
    expect(validateReadyToReport(withoutEvidence, baseOptions).isReady).toBe(false);
    expect(
      validateReadyToReport(withoutEvidence, { ...baseOptions, requireEvidenceForReady: false }).isReady
    ).toBe(true);
  });

  it('rejects a non-http(s) evidence link', () => {
    const result = validateReadyToReport({ ...validInput, evidenceLink: 'javascript:alert(1)' }, baseOptions);
    expect(result.checks.find((c) => c.field === 'evidenceLink')?.passed).toBe(false);
  });

  it('fails when the period is locked', () => {
    const result = validateReadyToReport(validInput, { ...baseOptions, periodLocked: true });
    expect(result.checks.find((c) => c.field === 'period')?.passed).toBe(false);
  });

  it('fails when the date is more than a year in the future', () => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 2);
    const dateStr = farFuture.toISOString().slice(0, 10);
    const result = validateReadyToReport({ ...validInput, date: dateStr }, baseOptions);
    expect(result.checks.find((c) => c.field === 'date')?.passed).toBe(false);
  });
});
