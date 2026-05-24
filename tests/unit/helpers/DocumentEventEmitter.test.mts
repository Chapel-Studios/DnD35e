import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DocumentEventEmitter } from '../../../src/helpers/DocumentEventEmitter.mjs';

// DocumentEventEmitter uses Hooks.onError for error forwarding.
// Stub it globally so tests that trigger errors don't throw.
const hooksMock = { onError: vi.fn() };
(globalThis as any).Hooks = hooksMock;

describe('DocumentEventEmitter', () => {
  let emitter: DocumentEventEmitter;

  beforeEach(() => {
    emitter = new DocumentEventEmitter();
    hooksMock.onError.mockClear();
  });

  // ─── on / off / unsubscribe ────────────────────────────────────────────────

  describe('on()', () => {
    it('delivers the payload to the registered handler', async () => {
      const handler = vi.fn();
      emitter.on('test', handler);
      await emitter.emit('test', { value: 42 });
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith({ value: 42 });
    });

    it('returns an unsubscribe function that stops delivery', async () => {
      const handler = vi.fn();
      const off = emitter.on('test', handler);
      off();
      await emitter.emit('test', {});
      expect(handler).not.toHaveBeenCalled();
    });

    it('multiple handlers all receive the event', async () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      emitter.on('test', h1);
      emitter.on('test', h2);
      await emitter.emit('test', 'payload');
      expect(h1).toHaveBeenCalledWith('payload');
      expect(h2).toHaveBeenCalledWith('payload');
    });
  });

  describe('off()', () => {
    it('removes the specific handler, leaving others intact', async () => {
      const h1 = vi.fn();
      const h2 = vi.fn();
      emitter.on('test', h1);
      emitter.on('test', h2);
      emitter.off('test', h1);
      await emitter.emit('test', null);
      expect(h1).not.toHaveBeenCalled();
      expect(h2).toHaveBeenCalled();
    });

    it('is a no-op when the handler was never registered', () => {
      expect(() => emitter.off('nonexistent', vi.fn())).not.toThrow();
    });
  });

  // ─── once ──────────────────────────────────────────────────────────────────

  describe('once()', () => {
    it('fires exactly once and then auto-unsubscribes', async () => {
      const handler = vi.fn();
      emitter.once('test', handler);
      await emitter.emit('test', 1);
      await emitter.emit('test', 2);
      expect(handler).toHaveBeenCalledOnce();
      expect(handler).toHaveBeenCalledWith(1);
    });

    it('returns an unsubscribe function usable before first fire', async () => {
      const handler = vi.fn();
      const off = emitter.once('test', handler);
      off();
      await emitter.emit('test', 'x');
      expect(handler).not.toHaveBeenCalled();
    });
  });

  // ─── emit ──────────────────────────────────────────────────────────────────

  describe('emit()', () => {
    it('is a no-op when no handlers are registered', async () => {
      await expect(emitter.emit('unknown', {})).resolves.toBeUndefined();
    });

    it('a failing handler does not prevent other handlers from running', async () => {
      const thrower = vi.fn(() => { throw new Error('boom'); });
      const safe = vi.fn();
      emitter.on('test', thrower);
      emitter.on('test', safe);
      await emitter.emit('test', null);
      expect(thrower).toHaveBeenCalled();
      expect(safe).toHaveBeenCalled();
      expect(hooksMock.onError).toHaveBeenCalled();
    });

    it('a handler that returns a rejected Promise does not abort others', async () => {
      const asyncThrower = vi.fn(() => Promise.reject(new Error('async boom')));
      const safe = vi.fn();
      emitter.on('test', asyncThrower);
      emitter.on('test', safe);
      await emitter.emit('test', null);
      expect(safe).toHaveBeenCalled();
      expect(hooksMock.onError).toHaveBeenCalled();
    });

    it('handlers that subscribe during emit do not run in the same cycle', async () => {
      const late = vi.fn();
      emitter.on('test', () => {
        emitter.on('test', late);
      });
      await emitter.emit('test', null);
      expect(late).not.toHaveBeenCalled();
    });
  });

  // ─── clear ─────────────────────────────────────────────────────────────────

  describe('clear()', () => {
    it('removes all listeners so subsequent emits are no-ops', async () => {
      const h = vi.fn();
      emitter.on('a', h);
      emitter.on('b', h);
      emitter.clear();
      await emitter.emit('a', null);
      await emitter.emit('b', null);
      expect(h).not.toHaveBeenCalled();
    });
  });

  // ─── activeEvents ──────────────────────────────────────────────────────────

  describe('activeEvents', () => {
    it('lists event names that have at least one subscriber', () => {
      emitter.on('foo', vi.fn());
      emitter.on('bar', vi.fn());
      expect(emitter.activeEvents).toContain('foo');
      expect(emitter.activeEvents).toContain('bar');
    });

    it('excludes events whose last subscriber was removed', () => {
      const h = vi.fn();
      emitter.on('foo', h);
      emitter.off('foo', h);
      expect(emitter.activeEvents).not.toContain('foo');
    });
  });

  // ─── Static registry ───────────────────────────────────────────────────────

  describe('registerEventType() / wellKnownEvents', () => {
    it('stores the metadata under the given type key', () => {
      DocumentEventEmitter.registerEventType('test.myEvent', {
        label: 'My Event',
        description: 'Fires when something happens.',
        appliesTo: ['Actor'],
      });
      const meta = DocumentEventEmitter.wellKnownEvents.get('test.myEvent');
      expect(meta).toBeDefined();
      expect(meta!.label).toBe('My Event');
      expect(meta!.appliesTo).toContain('Actor');
    });

    it('overwrites an existing registration for the same key', () => {
      DocumentEventEmitter.registerEventType('test.dup', {
        label: 'First',
        description: '',
        appliesTo: [],
      });
      DocumentEventEmitter.registerEventType('test.dup', {
        label: 'Second',
        description: '',
        appliesTo: [],
      });
      expect(DocumentEventEmitter.wellKnownEvents.get('test.dup')!.label).toBe('Second');
    });
  });
});
