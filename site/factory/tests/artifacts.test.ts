import { describe, expect, it } from 'vitest';
import { artifactKey } from '@/lib/factory/artifacts';
import { newId } from '@/lib/factory/ids';

describe('artifactKey', () => {
  it('scopes artifacts to the work item and sanitizes the name', () => {
    const id = newId();
    expect(artifactKey(id, 'SEO Report / v1.pdf')).toBe(
      `work-items/${id}/SEO-Report-v1.pdf`,
    );
  });

  it('rejects an empty name', () => {
    expect(() => artifactKey(newId(), '///')).toThrow(/empty/);
  });
});
