import { describe, expect, it } from 'vitest';
import { DateStringSchema, HttpUrlSchema, TimeStringSchema } from '@/lib/validation/primitives';

describe('DateStringSchema', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(DateStringSchema.safeParse('2026-08-02').success).toBe(true);
  });

  it('rejects other formats', () => {
    expect(DateStringSchema.safeParse('02-08-2026').success).toBe(false);
    expect(DateStringSchema.safeParse('2026/08/02').success).toBe(false);
  });
});

describe('TimeStringSchema', () => {
  it('accepts 24-hour HH:mm', () => {
    expect(TimeStringSchema.safeParse('08:00').success).toBe(true);
    expect(TimeStringSchema.safeParse('23:59').success).toBe(true);
  });

  it('rejects invalid hours/minutes', () => {
    expect(TimeStringSchema.safeParse('24:00').success).toBe(false);
    expect(TimeStringSchema.safeParse('08:60').success).toBe(false);
  });
});

describe('HttpUrlSchema (SEC-05)', () => {
  it('accepts http and https', () => {
    expect(HttpUrlSchema.safeParse('https://drive.google.com/file/x').success).toBe(true);
    expect(HttpUrlSchema.safeParse('http://internal.local/doc').success).toBe(true);
  });

  it('rejects javascript:, data:, file:, and malformed URLs', () => {
    expect(HttpUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
    expect(HttpUrlSchema.safeParse('data:text/html,hi').success).toBe(false);
    expect(HttpUrlSchema.safeParse('file:///etc/passwd').success).toBe(false);
    expect(HttpUrlSchema.safeParse('not a url').success).toBe(false);
  });
});
