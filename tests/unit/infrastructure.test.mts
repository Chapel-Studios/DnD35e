import { describe, expect, it } from 'vitest';

/**
 * Sanity smoke test. Confirms the Vitest runner, TypeScript transform,
 * and global setup file all load. Delete once real tests exist.
 */
describe('test infrastructure smoke', () => {
  it('runs', () => {
    expect(true).toBe(true);
  });

  it('has Foundry globals stubbed', () => {
    expect((globalThis as any).game).toBeDefined();
    expect((globalThis as any).foundry.utils.getProperty).toBeTypeOf('function');
  });
});
