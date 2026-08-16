import { describe, expect, it } from 'vitest';
import { detectLinkProvider } from '@/features/evidence/link-provider';

describe('detectLinkProvider', () => {
  it('detects Google Drive', () => {
    expect(detectLinkProvider('https://drive.google.com/file/d/xyz')).toBe('gdrive');
  });
  it('detects OneDrive', () => {
    expect(detectLinkProvider('https://onedrive.live.com/x')).toBe('onedrive');
  });
  it('detects SharePoint', () => {
    expect(detectLinkProvider('https://contoso.sharepoint.com/x')).toBe('sharepoint');
  });
  it('falls back to other for unknown hosts', () => {
    expect(detectLinkProvider('https://example.com/x')).toBe('other');
  });
  it('falls back to other for a malformed URL instead of throwing', () => {
    expect(detectLinkProvider('not a url')).toBe('other');
  });
});
