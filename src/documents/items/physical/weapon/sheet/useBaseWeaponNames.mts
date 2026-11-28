import { onScopeDispose, readonly, shallowRef } from 'vue';

import { BaseWeaponNameCache } from '../logic/BaseWeaponNameCache.mjs';

export function useBaseWeaponNames () {
  const names = shallowRef<ReadonlySet<string>>(new Set<string>());
  let version = 0;

  const refresh = async (): Promise<void> => {
    const request = ++version;
    try {
      const resolved = await BaseWeaponNameCache.getNames();
      if (request === version) names.value = resolved;
    } catch (error: unknown) {
      if (request !== version) return;
      Hooks.onError('useBaseWeaponNames#refresh', error instanceof Error ? error : new Error(String(error)), {
        log: 'error', notify: 'error',
      });
    }
  };

  const unsubscribe = BaseWeaponNameCache.onInvalidate(() => { void refresh(); });
  onScopeDispose(() => {
    ++version;
    unsubscribe();
  });
  void refresh();
  return readonly(names);
}
