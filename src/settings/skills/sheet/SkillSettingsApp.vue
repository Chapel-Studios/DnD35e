<template>
  <form class="skill-settings-form" @submit.prevent="onSubmit">
    <!-- Tab Navigation -->
    <nav class="tabs" data-group="primary">
      <a
        v-for="tab in tabs"
        :key="tab.id"
        class="item"
        :class="{ active: activeTab === tab.id }"
        :data-tab="tab.id"
        @click="activeTab = tab.id"
      >
        <i :class="tab.icon" />
        {{ localize(tab.label) }}
      </a>
    </nav>

    <!-- Skill Visibility Tab -->
    <section v-show="activeTab === 'visibility'" class="tab" data-group="primary" data-tab="visibility">
      <p class="notes">{{ localize('dnd35e.SETTINGS.SkillSettings.VisibilityInstructions') }}</p>

      <div class="skills-grid">
        <div v-for="(skillName, skillKey) in systemSkills" :key="skillKey" class="form-group">
          <label>{{ skillName }}</label>
          <select
            :value="context.data.skills[skillKey] || ''"
            @change="onUpdate(`skills.${skillKey}`, ($event.target as HTMLSelectElement).value)"
          >
            <option value="">{{ localize('dnd35e.COMMON.Show') }}</option>
            <option value="hide">{{ localize('dnd35e.COMMON.Hide') }}</option>
          </select>
        </div>
      </div>
    </section>

    <!-- Custom Skills Tab -->
    <section v-show="activeTab === 'custom'" class="tab" data-group="primary" data-tab="custom">
      <p class="notes">{{ localize('dnd35e.SETTINGS.SkillSettings.CustomSkillsInstructions') }}</p>

      <!-- Custom Skills Table -->
      <div class="skills-table">
        <!-- Header -->
        <div class="table-header">
          <span class="col-name">{{ localize('dnd35e.SETTINGS.SkillSettings.Name') }}</span>
          <span class="col-ability">{{ localize('dnd35e.SETTINGS.SkillSettings.Ability') }}</span>
          <span class="col-training">{{ localize('dnd35e.SETTINGS.SkillSettings.RequiresTraining') }}</span>
          <span class="col-acp">{{ localize('dnd35e.SETTINGS.SkillSettings.ArmorCheckPenalty') }}</span>
          <span class="col-actions">
            <button type="button" class="add-btn" @click="addCustomSkill" :title="localize('dnd35e.COMMON.Add')">
              <i class="fas fa-plus" />
            </button>
          </span>
        </div>

        <!-- Custom Skill Rows -->
        <div v-for="(skill, index) in customSkills" :key="index" class="table-row">
          <input
            type="text"
            class="col-name"
            :value="skill.name"
            @change="updateCustomSkill(index, 'name', ($event.target as HTMLInputElement).value)"
          />
          <select
            class="col-ability"
            :value="skill.attribute"
            @change="updateCustomSkill(index, 'attribute', ($event.target as HTMLSelectElement).value)"
          >
            <option v-for="(abilityName, abilityKey) in abilities" :key="abilityKey" :value="abilityKey">
              {{ abilityName }}
            </option>
          </select>
          <select
            class="col-training"
            :value="skill.requiresTraining.toString()"
            @change="updateCustomSkill(index, 'requiresTraining', ($event.target as HTMLSelectElement).value === 'true')"
          >
            <option value="true">{{ localize('dnd35e.COMMON.True') }}</option>
            <option value="false">{{ localize('dnd35e.COMMON.False') }}</option>
          </select>
          <select
            class="col-acp"
            :value="skill.armorCheckPenalty.toString()"
            @change="updateCustomSkill(index, 'armorCheckPenalty', ($event.target as HTMLSelectElement).value === 'true')"
          >
            <option value="true">{{ localize('dnd35e.COMMON.True') }}</option>
            <option value="false">{{ localize('dnd35e.COMMON.False') }}</option>
          </select>
          <span class="col-actions">
            <button type="button" class="delete-btn" @click="removeCustomSkill(index)" :title="localize('dnd35e.COMMON.Delete')">
              <i class="fas fa-minus" />
            </button>
          </span>
        </div>

        <!-- Empty state -->
        <div v-if="customSkills.length === 0" class="table-empty">
          {{ localize('dnd35e.SETTINGS.SkillSettings.NoCustomSkills') }}
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="form-footer">
      <button type="button" class="reset-btn" @click="onReset">
        <i class="fas fa-undo" />
        {{ localize('dnd35e.SETTINGS.Reset') }}
      </button>
      <button type="submit" class="save-btn">
        <i class="fas fa-save" />
        {{ localize('dnd35e.SETTINGS.Save') }}
      </button>
    </footer>
  </form>
</template>

<script setup lang="ts">
  import type { VueSettingsContext } from '@vueApps/VueSettingsMixin.mjs';
  import { computed, ref } from 'vue';

  import type { CustomSkill, SkillSettings } from '../_types.mjs';

  interface TabInfo {
    id: string;
    label: string;
    icon: string;
  }

  const props = defineProps<{
    context: VueSettingsContext<SkillSettings>;
    onUpdateData: (path: string, value: unknown) => void;
  }>();

  const emit = defineEmits<{
    (e: 'submit'): void;
    (e: 'reset'): void;
  }>();

  const activeTab = ref('visibility');

  const tabs: TabInfo[] = [
    { id: 'visibility', label: 'dnd35e.SETTINGS.SkillSettings.Visibility', icon: 'fas fa-eye' },
    { id: 'custom', label: 'dnd35e.SETTINGS.SkillSettings.CustomSkills', icon: 'fas fa-plus-circle' },
  ];

  // TODO(Phase 9): populate from CONFIG.DND35E.skills once skills constants are exported
  // Get system skills from config
  const systemSkills = computed(() => {});

  // Get abilities from config
  const abilities = computed(() => {});

  const customSkills = computed(() => props.context.data.customSkills || []);

  function localize(key: string): string {
    return game.i18n.localize(key);
  }

  function onUpdate(path: string, value: unknown): void {
    props.onUpdateData(path, value);
  }

  function addCustomSkill(): void {
    const newSkill: CustomSkill = {
      name: '',
      attribute: 'str',
      requiresTraining: false,
      armorCheckPenalty: false,
    };
    const newSkills = [...customSkills.value, newSkill];
    props.onUpdateData('customSkills', newSkills);
  }

  function removeCustomSkill(index: number): void {
    const newSkills = customSkills.value.filter((_, i) => i !== index);
    props.onUpdateData('customSkills', newSkills);
  }

  function updateCustomSkill(index: number, field: keyof CustomSkill, value: unknown): void {
    const newSkills = customSkills.value.map((skill, i) =>
      i === index ? { ...skill, [field]: value } : skill
    );
    props.onUpdateData('customSkills', newSkills);
  }

  function onSubmit(): void {
    emit('submit');
  }

  function onReset(): void {
    emit('reset');
  }
</script>

<style scoped lang="scss">
  .skill-settings-form {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    height: 100%;
  }

  .tabs {
    display: flex;
    gap: 0.25rem;
    border-bottom: 1px solid var(--color-border);
    padding-bottom: 0.5rem;

    .item {
      padding: 0.5rem 1rem;
      cursor: pointer;
      border-radius: 3px 3px 0 0;
      text-decoration: none;
      color: var(--color-text-primary);

      &:hover {
        background: var(--color-select-option-bg);
      }

      &.active {
        background: var(--color-select-option-bg-active);
        border-bottom: 2px solid var(--color-border-highlight);
      }

      i {
        margin-right: 0.25rem;
      }
    }
  }

  .tab {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex: 1;
    overflow-y: auto;
  }

  .notes {
    font-style: italic;
    color: var(--color-text-secondary);
    margin-bottom: 0.5rem;
  }

  .skills-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 0.5rem;

    .form-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.25rem;

      label {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      select {
        width: 80px;
        flex-shrink: 0;
      }
    }
  }

  .skills-table {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    overflow: hidden;
  }

  .table-header,
  .table-row {
    display: grid;
    grid-template-columns: minmax(120px, 2fr) minmax(80px, 1fr) minmax(100px, 1fr) minmax(100px, 1fr) 40px;
    gap: 0.5rem;
    padding: 0.5rem;
    align-items: center;
  }

  .table-header {
    background: var(--color-select-option-bg);
    font-weight: bold;
    border-bottom: 1px solid var(--color-border);
  }

  .table-row {
    border-bottom: 1px solid var(--color-border);

    &:last-child {
      border-bottom: none;
    }

    input,
    select {
      width: 100%;
      padding: 0.25rem;
    }
  }

  .table-empty {
    padding: 1rem;
    text-align: center;
    color: var(--color-text-secondary);
    font-style: italic;
  }

  .col-actions {
    display: flex;
    justify-content: center;

    button {
      width: 24px;
      height: 24px;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px;
      cursor: pointer;

      &.add-btn {
        background: var(----color-level-success);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
      }

      &.delete-btn {
        background: var(--color-bg-btn-negative);
        border: 1px solid var(--color-border-negative);
        color: var(--color-text-primary);
      }
    }
  }

  .form-footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
    margin-top: auto;

    button {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 1rem;
      border-radius: 3px;
      cursor: pointer;

      &.reset-btn {
        background: var(--color-select-option-bg);
        border: 1px solid var(--color-border);
      }

      &.save-btn {
        background: var(----color-level-success);
        border: 1px solid var(--color-border);
        color: var(--color-text-primary);
      }
    }
  }
</style>
