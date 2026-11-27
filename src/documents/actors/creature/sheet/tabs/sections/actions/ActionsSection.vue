<template>
  <CategorizedListTable
    class="actions-section"
    title="dnd35e.ACTOR.section.Actions"
    :column-count="7"
    :rows="rows"
    empty-label="dnd35e.ACTOR.actions.empty"
    empty-icon="fas fa-shield-halved"
    :enable-subcategory-collapse="true"
  >
    <template #header>
      <tr>
        <th class="weapon-name-col">{{ localize('dnd35e.ACTOR.actions.column.weapon') }}</th>
        <th class="weapon-num-col">{{ localize('dnd35e.ACTOR.actions.column.attack') }}</th>
        <th class="weapon-num-col">{{ localize('dnd35e.ACTOR.actions.column.damage') }}</th>
        <th class="weapon-num-col">{{ localize('dnd35e.ACTOR.actions.column.crit') }}</th>
        <th class="weapon-range-col">{{ localize('dnd35e.ACTOR.actions.column.range') }}</th>
        <th class="weapon-type-col">{{ localize('dnd35e.ACTOR.actions.column.type') }}</th>
        <th class="weapon-actions-col" />
      </tr>
    </template>
    <template #row="{ row }">
      <tr class="weapon-row" :data-item-id="row.itemId" :data-action-id="row.actionId">
        <td class="weapon-name-col">
          {{ row.weaponName }}
          <span v-if="row.location" class="weapon-location">{{ row.location }}</span>
        </td>
        <td class="weapon-num-col">{{ row.attack }}</td>
        <td class="weapon-num-col">{{ row.damage }}</td>
        <td class="weapon-num-col">{{ row.crit }}</td>
        <td class="weapon-range-col">{{ row.range }}</td>
        <td class="weapon-type-col">{{ row.damageType }}</td>
        <td class="weapon-actions-col">
          <button
            type="button"
            class="field-control-btn attack-btn"
            :disabled="!isSheetEditable"
            :title="localize('dnd35e.ACTOR.actions.action.attack')"
            @click="onAttack(row.itemId, row.actionId)"
          >
            <i class="fas fa-swords" />
          </button>
        </td>
      </tr>
    </template>
  </CategorizedListTable>
</template>

<script setup lang="ts">
  import { stripMarkerFlavors } from '@constants/diceMarkerBag.mjs';
  import type { RenderModeStore } from '@documents/document/index.mjs';
  import { DocumentSheetStoreSymbol, RenderModeStoreSymbol } from '@documents/document/index.mjs';
  import type { TokenDnd35e } from '@documents/token/TokenDnd35e.mjs';
  import type { ActionType } from '@items/baseItem/actions/constants.mjs';
  import { ACTION_TYPES } from '@items/baseItem/actions/constants.mjs';
  import type { WeaponAction } from '@items/baseItem/actions/types.mjs';
  import type { PHYSICAL_ITEMS } from '@items/itemTypes.mjs';
  import { weaponItemType } from '@items/itemTypes.mjs';
  import { RangedWeaponAttack } from '@items/physical/weapon/actions/RangedAttack/RangedAttackDataModel.mjs';
  import type { Weapon } from '@items/physical/weapon/index.mjs';
  import { formatThreatRange } from '@items/physical/weapon/logic/threatRange.mjs';
  import { type SettingsStore,SettingsStoreSymbol } from '@settings/index.mjs';
  import CategorizedListTable, { type CategorizedRow } from '@vc/CategorizedListTable.vue';
  import { computed, inject } from 'vue';

  import type { CreatureDocumentStore } from '../../../CreatureStore.mjs';

  const localize = (key: string): string => game.i18n.localize(key);

  const {
    documentGetters: { physicalItems, actorActions },
    documentActions: { useActionFromSheet },
  } = inject(DocumentSheetStoreSymbol) as CreatureDocumentStore;
  const { isSheetEditable } = inject(RenderModeStoreSymbol) as RenderModeStore;

  const {
    measurement: { convertToLocalizedDistance, distanceDisplayShortLabel },
  } = inject(SettingsStoreSymbol) as SettingsStore;

  const isWeapon = (item: PHYSICAL_ITEMS): item is Weapon => item.type === weaponItemType;

  /**
   * Top-level grouping is by the action's own `type` (`ACTION_TYPES` - today
   * `melee_weapon_attack`/`ranged_weapon_attack`; spell/skill action types will join this
   * enum and automatically get their own top-level category once those action kinds exist).
   * `categoryRank()` falls back to sorting any not-yet-registered type after every known
   * one, rather than failing, so a future gap between adding a new `ActionType` and
   * registering it here doesn't hide rows.
   */
  const categoryRank = (type: ActionType): number => {
    const index = (ACTION_TYPES as readonly string[]).indexOf(type);
    return index === -1 ? ACTION_TYPES.length : index;
  };

  /**
   * Sub-level grouping is by the weapon's own carry/equip state - weapon-specific for now
   * (spell/skill actions have no analogous concept), so this stays local to this component
   * rather than a shared system constant.
   */
  type WeaponCarryState = 'equipped' | 'ready' | 'stowed' | 'tracked';
  const WEAPON_CARRY_STATE_ORDER: Record<WeaponCarryState, number> = { equipped: 0, ready: 1, stowed: 2, tracked: 3 };
  const resolveWeaponCarryState = (weapon: Weapon): WeaponCarryState => {
    if (!weapon.system.isCarried) return 'tracked';
    if (weapon.system.containerUuid) return 'stowed';
    if (weapon.system.isEquipped) return 'equipped';

    return 'ready';
  };

  interface WeaponActionRow extends CategorizedRow {
    itemId: string;
    actionId: string;
    weaponName: string;
    location: string;
    attack: string;
    damage: string;
    crit: string;
    range: string;
    damageType: string;
  }

  /**
   * Sourced from `actorActions` (the actor-side `IAction` stub aggregation,
   * `document.system.actions`) rather than iterating `weapon.system.actions` directly -
   * `ActionDataModel.createActionChange()` already omits any action with a critical
   * preparation diagnostic from that aggregation, so a broken action's stub simply never
   * exists here. Each stub is resolved back to its live weapon/action via `itemUuid` so
   * display data (formulas, crit range, etc.) stays live rather than duplicated.
   *
   * Grouped two levels deep: top-level by action type (Melee/Ranged Attack today),
   * sub-level by the weapon's carry state (Equipped/Ready/Stowed) - see `categoryRank()`/
   * `resolveWeaponCarryState()` above.
   */
  const rows = computed<WeaponActionRow[]>(() => {
    const result: WeaponActionRow[] = [];
    for (const stub of actorActions.value) {
      const weapon = physicalItems.value.find(
        (item): item is Weapon => isWeapon(item) && item.uuid === stub.itemUuid
      );
      if (!weapon?.system.isCarried) continue;

      const action = weapon.system.actions.find((a) => a._id === stub.id) as WeaponAction | undefined;
      // Non-top-level (chained-only) actions don't get their own row - only reachable
      // via their parent action's chain.
      if (!action?.isTopLevel) continue;

      const containerUuid = weapon.system.containerUuid;
      const container = containerUuid
        ? physicalItems.value.find((item) => item.uuid === containerUuid)
        : undefined;
      const carryState = resolveWeaponCarryState(weapon);

      result.push({
        id: `${weapon.id}.${action._id}`,
        categoryId: action.type,
        categoryLabel: localize(`dnd35e.WEAPON.ACTIONS.Type.${action.type}`),
        subcategoryId: carryState,
        subcategoryLabel: localize(`dnd35e.ACTOR.actions.subcategory.${carryState}`),
        sortKey: `${categoryRank(action.type)}-${WEAPON_CARRY_STATE_ORDER[carryState]}-${weapon.name.toLowerCase()}-${action._id}`,
        itemId: weapon.id,
        actionId: action._id,
        weaponName: weapon.name,
        location: containerUuid
          ? game.i18n.format('dnd35e.ACTOR.actions.stowedIn', { container: container?.name ?? containerUuid })
          : '',
        attack: action.attackFormula.resolvedValue || '1d20',
        damage: stripMarkerFlavors(action.damageFormula.resolvedValue || ''),
        crit: formatThreatRange(action.critRange),
        range: action instanceof RangedWeaponAttack
          ? `${convertToLocalizedDistance(action.rangeIncrement)} ${distanceDisplayShortLabel.value}`
          : localize('dnd35e.ACTOR.actions.meleeRange'),
        damageType: action.damageTypeLabel,
      });
    }
    return result;
  });

  const onAttack = async (itemId: string, actionId: string): Promise<void> => {
    if (!isSheetEditable.value) return;
    // Sheet-triggered attacks bypass target selection - unlike the Token HUD, which
    // requires a target since it has no other way to know who's being attacked.
    const targetToken = (game.user?.targets?.first() ?? undefined) as TokenDnd35e | undefined;
    await useActionFromSheet(itemId, actionId, targetToken);
  };
</script>

<style scoped lang="scss">
  .actions-section {
    :deep(th), td {
      padding: 0.25rem 0.5rem;
      text-align: center;
    }

    .weapon-name-col {
      text-align: left;
    }

    .weapon-location {
      display: block;
      font-size: 0.85em;
      opacity: 0.7;
    }
  }

  .attack-btn {
    width: 1.5rem;
  }
</style>
