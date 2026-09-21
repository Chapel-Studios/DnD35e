<template>
  <section class="sheet-section weapons-section">
    <h2 class="section-header">
      {{ localize('dnd35e.ACTOR.section.Weapons') }}
    </h2>
    <table class="weapons-table">
      <thead>
        <tr>
          <th class="weapon-name-col">{{ localize('dnd35e.ACTOR.actions.column.weapon') }}</th>
          <th class="weapon-num-col">{{ localize('dnd35e.ACTOR.actions.column.attack') }}</th>
          <th class="weapon-num-col">{{ localize('dnd35e.ACTOR.actions.column.damage') }}</th>
          <th class="weapon-num-col">{{ localize('dnd35e.ACTOR.actions.column.crit') }}</th>
          <th class="weapon-range-col">{{ localize('dnd35e.ACTOR.actions.column.range') }}</th>
          <th class="weapon-type-col">{{ localize('dnd35e.ACTOR.actions.column.type') }}</th>
          <th class="weapon-actions-col" />
        </tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length" class="weapon-row placeholder-row">
          <td colspan="7" class="empty-row">
            <i class="fas fa-shield-halved" />
            {{ localize('dnd35e.ACTOR.actions.empty') }}
          </td>
        </tr>
        <tr v-for="row in rows" :key="row.key" class="weapon-row">
          <td class="weapon-name-col">{{ row.weaponName }}</td>
          <td class="weapon-num-col">{{ row.attack }}</td>
          <td class="weapon-num-col">{{ row.damage }}</td>
          <td class="weapon-num-col">{{ row.crit }}</td>
          <td class="weapon-range-col">{{ row.range }}</td>
          <td class="weapon-type-col">{{ row.damageType }}</td>
          <td class="weapon-actions-col">
            <button
              type="button"
              class="field-control-btn attack-btn"
              :class="{ disabled: row.disabled }"
              :disabled="row.disabled"
              :title="row.disabled
                ? localize('dnd35e.ACTOR.actions.action.requiresEquipped')
                : localize('dnd35e.ACTOR.actions.action.attack')"
              @click="onAttack(row.itemId, row.actionId)"
            >
              <i class="fas fa-swords" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
  import { DocumentSheetStoreSymbol } from '@documents/document/index.mjs';
  import type { WeaponAction } from '@items/baseItem/actions/types.mjs';
  import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
  import { weaponItemType } from '@items/itemTypes.mjs';
  import { RangedWeaponAttack } from '@items/physical/weapon/actions/RangedAttack/RangedAttackDataModel.mjs';
  import type { Weapon } from '@items/physical/weapon/index.mjs';
  import { formatThreatRange } from '@items/physical/weapon/logic/threatRange.mjs';
  import { type SettingsStore,SettingsStoreSymbol } from '@settings/index.mjs';
  import { computed, inject } from 'vue';

  import type { CreatureDocumentStore } from '../../../CreatureStore.mjs';

  const localize = (key: string): string => game.i18n.localize(key);

  const {
    documentGetters: { physicalItems },
    documentActions: { useActionFromSheet },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;

  const {
    measurement: { convertToLocalizedDistance, distanceDisplayShortLabel },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const isWeapon = (item: PHYSICAL_ITEMS): item is Weapon => item.type === weaponItemType;

  interface WeaponActionRow {
    key: string;
    itemId: string;
    actionId: string;
    weaponName: string;
    attack: string;
    damage: string;
    crit: string;
    range: string;
    damageType: string;
    disabled: boolean;
  }

  const rows = computed<WeaponActionRow[]>(() => {
    const weapons = (physicalItems?.value ?? [])
      .filter(isWeapon)
      .filter((item) => item.system.isCarried);

    const result: WeaponActionRow[] = [];
    for (const weapon of weapons) {
      const actions = weapon.system.actions.filter((action) => action.isTopLevel) as WeaponAction[];
      for (const action of actions) {
        // Mirrors tokenHudActions.mts / WeaponAttackDataModel#_canExecute()'s own
        // requiresEquipped gate - the sheet's attack button never bypasses it, it
        // just greys out instead of silently no-op'ing when clicked.
        const disabled = action.requiresEquipped && !weapon.system.isEquipped;
        result.push({
          key: `${weapon.id}.${action._id}`,
          itemId: weapon.id,
          actionId: action._id,
          weaponName: weapon.name,
          attack: action.attackFormula.resolvedValue || '1d20',
          damage: action.damageFormula.resolvedValue || '',
          crit: formatThreatRange(action.critRange),
          range: action instanceof RangedWeaponAttack
            ? `${convertToLocalizedDistance(action.rangeIncrement)} ${distanceDisplayShortLabel.value}`
            : localize('dnd35e.ACTOR.actions.meleeRange'),
          damageType: game.i18n.localize(action.damageType),
          disabled,
        });
      }
    }
    return result;
  });

  const onAttack = async (itemId: string, actionId: string): Promise<void> => {
    const row = rows.value.find((r) => r.itemId === itemId && r.actionId === actionId);
    if (row?.disabled) return;
    // Sheet-triggered attacks bypass target selection - unlike the Token HUD, which
    // requires a target since it has no other way to know who's being attacked.
    const targetToken = game.user?.targets?.first() ?? null;
    await useActionFromSheet(itemId, actionId, targetToken?.actor?.id);
  };
</script>

<style scoped lang="scss">
  .weapons-section {
    .section-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
  }

  .weapons-table {
    width: 100%;
    border-collapse: collapse;

    th, td {
      padding: 0.25rem 0.5rem;
      text-align: center;
    }

    .weapon-name-col {
      text-align: left;
    }

    .empty-row {
      text-align: center;
      font-style: italic;
      opacity: 0.7;
      padding: 0.75rem;

      i {
        margin-right: 0.35rem;
      }
    }

    tbody tr:nth-child(odd) {
      background: color-mix(in srgb, var(--color-cool-4, #9ba5a0) 10%, transparent);
    }
  }

  .attack-btn {
    width: 1.5rem;

    &.disabled,
    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
      filter: grayscale(1);
    }
  }
</style>
