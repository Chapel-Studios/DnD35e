<script setup lang="ts">
  import type { ActionEconomyType } from '@constants/actionEconomy.mjs';
  import { ACTION_ECONOMY_TYPES } from '@constants/actionEconomy.mjs';
  import { MAIN_HAND_EQUIP_SLOT, OFF_HAND_EQUIP_SLOT } from '@constants/equipmentSlots.mjs';
  import type { CombatantConfigContext, CombatantConfigSaveData } from '@documents/combat/combatant/CombatantConfigDnd35e.mjs';
  import type { MovementSessionCategory } from '@documents/combat/combatant/movementSession.mjs';
  import { computed, reactive, ref, toRaw, watch } from 'vue';

  interface Props {
    context: CombatantConfigContext;
    onSave: (data: CombatantConfigSaveData) => Promise<void>;
    onCancel: () => void;
  }

  const props = defineProps<Props>();

  function localize (key: string): string {
    return game.i18n.localize(key);
  }

  /** Local editable copy — the form doesn't write through to the document until Save is clicked. */
  const form = reactive(structuredClone(toRaw(props.context)));

  // The reactive `context` prop is mutated in place by `CombatantConfigDnd35e#_replaceHTML`
  // (same object identity every render), so a shallow watch would never fire — deep is
  // required to resync the working copy after an external update.
  watch(() => props.context, (next) => {
    Object.assign(form, structuredClone(toRaw(next)));
  }, { deep: true });

  const showAdvancedMove = ref(false);
  const showAdvancedActionEconomy = ref(false);

  function editImage (): void {
    // eslint-disable-next-line new-cap
    const fp = new foundry.applications.apps.FilePicker.implementation({
      type: 'image',
      current: form.img,
      callback: (path: string) => {
        form.img = path;
      },
    } as any);

    fp.render();
  }

  function clearImage (): void {
    form.img = '';
  }

  const spentTierOptions: ActionEconomyType[] = [...ACTION_ECONOMY_TYPES];

  function toggleSpentTier (tier: ActionEconomyType, checked: boolean): void {
    const tiers = form.movementSession.spentTiers;
    const index = tiers.indexOf(tier);
    if (checked && index === -1) tiers.push(tier);
    else if (!checked && index !== -1) tiers.splice(index, 1);
  }

  function toggleFullRoundSpentTier (tier: ActionEconomyType, checked: boolean): void {
    const move = form.movementSession.fullRoundMove;
    if (!move) return;
    const index = move.spentTiers.indexOf(tier);
    if (checked && index === -1) move.spentTiers.push(tier);
    else if (!checked && index !== -1) move.spentTiers.splice(index, 1);
  }

  const categorySelect = computed<'' | MovementSessionCategory>({
    get: () => form.movementSession.category ?? '',
    set: (value) => {
      form.movementSession.category = value === '' ? null : value;
    },
  });

  const messageIdInput = computed<string>({
    get: () => form.movementSession.messageId ?? '',
    set: (value) => {
      form.movementSession.messageId = value === '' ? null : value;
    },
  });

  const lastMovementActionInput = computed<string>({
    get: () => form.movementSession.lastMovementAction ?? '',
    set: (value) => {
      form.movementSession.lastMovementAction = value === '' ? null : value;
    },
  });

  const hasOrigin = computed<boolean>({
    get: () => form.movementSession.firstOrigin !== null,
    set: (value) => {
      form.movementSession.firstOrigin = value ? { x: 0, y: 0, elevation: 0 } : null;
    },
  });

  const hasFullRoundMove = computed<boolean>({
    get: () => form.movementSession.fullRoundMove !== null,
    set: (value) => {
      form.movementSession.fullRoundMove = value ? { movementId: '', spentTiers: [], messageId: null } : null;
    },
  });

  const fullRoundMessageId = computed<string>({
    get: () => form.movementSession.fullRoundMove?.messageId ?? '',
    set: (value) => {
      if (!form.movementSession.fullRoundMove) return;
      form.movementSession.fullRoundMove.messageId = value === '' ? null : value;
    },
  });

  async function onSubmit (): Promise<void> {
    await props.onSave({
      name: form.name,
      img: form.img,
      initiative: form.initiative,
      hidden: form.hidden,
      defeated: form.defeated,
      actionEconomy: form.actionEconomy,
      movementSession: form.movementSession,
    });
  }
</script>

<template>
  <form class="combatant-config-form" @submit.prevent="onSubmit">
    <section class="basic-section">
      <div class="form-group">
        <label for="combatant-config-img">{{ localize('COMBATANT.FIELDS.img.label') }}</label>
        <div class="img-picker">
          <img :src="form.img" class="thumbnail" alt="" @click="editImage">
          <input id="combatant-config-img" v-model="form.img" type="text">
          <button
            type="button"
            class="field-control-btn"
            :disabled="!form.img"
            :aria-label="localize('dnd35e.COMBAT.CONFIG.ClearImage')"
            data-tooltip="dnd35e.COMBAT.CONFIG.ClearImage"
            @click="clearImage"
          >
            <i class="fas fa-rotate-left" />
          </button>
        </div>
      </div>
      <div class="form-group">
        <label>{{ localize('COMBATANT.FIELDS.actorId.label') }}</label>
        <input type="text" :value="context.actorName" disabled>
      </div>
      <div class="form-group">
        <label>{{ localize('COMBATANT.FIELDS.tokenId.label') }}</label>
        <input type="text" :value="context.tokenName" disabled>
      </div>
      <div class="form-group">
        <label for="combatant-config-name">{{ localize('COMBATANT.FIELDS.name.label') }}</label>
        <input id="combatant-config-name" v-model="form.name" type="text">
      </div>
      <div class="form-group">
        <label for="combatant-config-initiative">{{ localize('COMBATANT.FIELDS.initiative.label') }}</label>
        <input id="combatant-config-initiative" v-model.number="form.initiative" type="number">
      </div>
      <div class="form-group">
        <span class="label">{{ localize('COMBATANT.Status') }}</span>
        <div class="form-fields">
          <label class="checkbox">
            <input v-model="form.hidden" type="checkbox">
            {{ localize('COMBATANT.FIELDS.hidden.label') }}
          </label>
          <label class="checkbox">
            <input v-model="form.defeated" type="checkbox">
            {{ localize('COMBATANT.FIELDS.defeated.label') }}
          </label>
        </div>
      </div>
    </section>

    <section class="action-economy-section">
      <button type="button" class="advanced-toggle" @click="showAdvancedActionEconomy = !showAdvancedActionEconomy">
        <i class="fas" :class="showAdvancedActionEconomy ? 'fa-caret-down' : 'fa-caret-right'" />
        {{ localize('dnd35e.COMBAT.CONFIG.ActionEconomy.ToggleLabel') }}
      </button>
      <div v-if="showAdvancedActionEconomy" class="advanced-section">
        <div class="form-group">
          <span class="label">{{ localize('dnd35e.COMBAT.CONFIG.ActionEconomy.Available') }}</span>
          <div class="form-fields">
            <label for="combatant-config-standard">{{ localize('dnd35e.COMBAT.ACTION_ECONOMY.Standard') }}</label>
            <input id="combatant-config-standard" v-model.number="form.actionEconomy.actions.standard" type="number" min="0">
            <label for="combatant-config-move">{{ localize('dnd35e.COMBAT.ACTION_ECONOMY.Move') }}</label>
            <input id="combatant-config-move" v-model.number="form.actionEconomy.actions.move" type="number" min="0">
            <label for="combatant-config-minor">{{ localize('dnd35e.COMBAT.ACTION_ECONOMY.Minor') }}</label>
            <input id="combatant-config-minor" v-model.number="form.actionEconomy.actions.minor" type="number" min="0">
            <label for="combatant-config-swift">{{ localize('dnd35e.COMBAT.ACTION_ECONOMY.Swift') }}</label>
            <input id="combatant-config-swift" v-model.number="form.actionEconomy.actions.swift" type="number" min="0">
          </div>
        </div>
        <div class="form-group">
          <label for="combatant-config-aoo">{{ localize('dnd35e.COMBAT.ACTION_ECONOMY.AttacksOfOpportunity') }}</label>
          <input id="combatant-config-aoo" v-model.number="form.actionEconomy.actions.aoo" type="number" min="0">
        </div>
        <div class="form-group">
          <label for="combatant-config-bab-main">{{ localize('dnd35e.COMBAT.CONFIG.ActionEconomy.BabMain') }}</label>
          <input id="combatant-config-bab-main" v-model.number="form.actionEconomy.bab[MAIN_HAND_EQUIP_SLOT]" type="number">
        </div>
        <div class="form-group">
          <label for="combatant-config-bab-off">{{ localize('dnd35e.COMBAT.CONFIG.ActionEconomy.BabOff') }}</label>
          <input id="combatant-config-bab-off" v-model.number="form.actionEconomy.bab[OFF_HAND_EQUIP_SLOT]" type="number">
        </div>
        <div class="form-group">
          <span class="label">{{ localize('dnd35e.COMBAT.CONFIG.ActionEconomy.UsedFlags') }}</span>
          <div class="form-fields">
            <label class="checkbox">
              <input v-model="form.actionEconomy.used.standardAttackUsed" type="checkbox">
              {{ localize('dnd35e.COMBAT.CONFIG.ActionEconomy.StandardAttackUsed') }}
            </label>
            <label class="checkbox">
              <input v-model="form.actionEconomy.used.movedAfterAttack" type="checkbox">
              {{ localize('dnd35e.COMBAT.CONFIG.ActionEconomy.MovedAfterAttack') }}
            </label>
            <label class="checkbox">
              <input v-model="form.actionEconomy.used.chargedThisTurn" type="checkbox">
              {{ localize('dnd35e.COMBAT.CONFIG.ActionEconomy.ChargedThisTurn') }}
            </label>
          </div>
        </div>
      </div>
    </section>

    <section class="advanced-section">
      <button type="button" class="advanced-toggle" @click="showAdvancedMove = !showAdvancedMove">
        <i class="fas" :class="showAdvancedMove ? 'fa-caret-down' : 'fa-caret-right'" />
        {{ localize('dnd35e.COMBAT.CONFIG.Movement.ToggleLabel') }}
      </button>
      <div v-if="showAdvancedMove" class="advanced-fields">
        <div class="form-group">
          <label for="combatant-config-category">{{ localize('dnd35e.COMBAT.CONFIG.Movement.Category') }}</label>
          <select id="combatant-config-category" v-model="categorySelect">
            <option value="">{{ localize('dnd35e.COMBAT.CONFIG.Movement.CategoryNone') }}</option>
            <option value="step">{{ localize('dnd35e.COMBAT.CONFIG.Movement.CategoryStep') }}</option>
            <option value="normal">{{ localize('dnd35e.COMBAT.CONFIG.Movement.CategoryNormal') }}</option>
          </select>
        </div>
        <div class="form-group">
          <label for="combatant-config-cost">{{ localize('dnd35e.COMBAT.CONFIG.Movement.CumulativeCost') }}</label>
          <input id="combatant-config-cost" v-model.number="form.movementSession.cumulativeCost" type="number">
        </div>
        <div class="form-group">
          <span class="label">{{ localize('dnd35e.COMBAT.CONFIG.Movement.SpentTiers') }}</span>
          <div class="form-fields">
            <label v-for="tier in spentTierOptions" :key="tier" class="checkbox">
              <input
                type="checkbox"
                :checked="form.movementSession.spentTiers.includes(tier)"
                @change="toggleSpentTier(tier, ($event.target as HTMLInputElement).checked)"
              >
              {{ tier }}
            </label>
          </div>
        </div>
        <div class="form-group">
          <label class="checkbox">
            <input v-model="hasOrigin" type="checkbox">
            {{ localize('dnd35e.COMBAT.CONFIG.Movement.HasOrigin') }}
          </label>
        </div>
        <div v-if="hasOrigin && form.movementSession.firstOrigin" class="form-group origin-fields">
          <input v-model.number="form.movementSession.firstOrigin.x" type="number" placeholder="x">
          <input v-model.number="form.movementSession.firstOrigin.y" type="number" placeholder="y">
          <input v-model.number="form.movementSession.firstOrigin.elevation" type="number" placeholder="elevation">
        </div>
        <div class="form-group">
          <label for="combatant-config-message-id">{{ localize('dnd35e.COMBAT.CONFIG.Movement.MessageId') }}</label>
          <input id="combatant-config-message-id" v-model="messageIdInput" type="text">
        </div>
        <div class="form-group">
          <label for="combatant-config-last-action">{{ localize('dnd35e.COMBAT.CONFIG.Movement.LastMovementAction') }}</label>
          <input id="combatant-config-last-action" v-model="lastMovementActionInput" type="text">
        </div>
        <div class="form-group">
          <label class="checkbox">
            <input v-model="hasFullRoundMove" type="checkbox">
            {{ localize('dnd35e.COMBAT.CONFIG.Movement.HasFullRoundMove') }}
          </label>
        </div>
        <template v-if="hasFullRoundMove && form.movementSession.fullRoundMove">
          <div class="form-group">
            <label for="combatant-config-fr-movement-id">{{ localize('dnd35e.COMBAT.CONFIG.Movement.FullRoundMovementId') }}</label>
            <input id="combatant-config-fr-movement-id" v-model="form.movementSession.fullRoundMove.movementId" type="text">
          </div>
          <div class="form-group">
            <span class="label">{{ localize('dnd35e.COMBAT.CONFIG.Movement.SpentTiers') }}</span>
            <div class="form-fields">
              <label v-for="tier in spentTierOptions" :key="tier" class="checkbox">
                <input
                  type="checkbox"
                  :checked="form.movementSession.fullRoundMove.spentTiers.includes(tier)"
                  @change="toggleFullRoundSpentTier(tier, ($event.target as HTMLInputElement).checked)"
                >
                {{ tier }}
              </label>
            </div>
          </div>
          <div class="form-group">
            <label for="combatant-config-fr-message-id">{{ localize('dnd35e.COMBAT.CONFIG.Movement.FullRoundMessageId') }}</label>
            <input id="combatant-config-fr-message-id" v-model="fullRoundMessageId" type="text">
          </div>
        </template>
      </div>
    </section>

    <footer class="sheet-footer">
      <button type="submit" class="save-btn">
        <i class="fas fa-floppy-disk" />
        {{ localize('COMBATANT.ACTIONS.Update') }}
      </button>
      <button type="button" class="cancel-btn" @click="onCancel">
        <i class="fas fa-xmark" />
        {{ localize('Cancel') }}
      </button>
    </footer>
  </form>
</template>

<style lang="scss" scoped>
  .combatant-config-form {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.5rem;
    overflow-y: auto;
    
    .form-group {
      display: flex;
      flex-direction: row;
      gap: 0.15rem;
      margin-bottom: 0.4rem;
    }

  }

  h3 {
    margin: 0 0 0.25rem;
    font-size: var(--font-size-14);
    border-bottom: 1px solid var(--color-border-light-tertiary);
  }

  .form-fields {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .checkbox {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .img-picker {
    display: flex;
    align-items: center;
    gap: 0.5rem;

    .thumbnail {
      width: 2rem;
      height: 2rem;
      object-fit: cover;
      border-radius: 3px;
      cursor: pointer;
    }

    input {
      flex: 1;
    }
  }

  .origin-fields {
    flex-direction: row;
    gap: 0.5rem;
  }

  .advanced-toggle {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-weight: bold;
  }

  .advanced-fields {
    margin-top: 0.5rem;
    padding-left: 0.5rem;
    border-left: 2px solid var(--color-border-light-tertiary);
  }

  .sheet-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
</style>
