<template>
  <section class="sheet-section categorized-list-section" :class="{ compact }">
    <h2 v-if="!!displayTitle" class="section-header">
      {{ displayTitle }}
      <slot name="controls" />
    </h2>

    <nav class="categorized-list-tabs" aria-label="Category tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        class="category-tab-btn"
        :class="{ active: activeTabId === tab.id }"
        @click="activeTabId = tab.id"
      >
        <span>{{ tab.label }}</span>
        <span class="tab-count">{{ tab.count }}</span>
      </button>
    </nav>

    <div v-if="isAllTab" class="all-categories-view">
      <div v-if="categories.length === 0 && !hideEmptyState" class="empty-state empty-row">
        <i :class="emptyIcon" />
        {{ localize(emptyLabel) }}
      </div>

      <div
        v-for="category in categories"
        :key="category.id"
        class="category-group"
      >
        <button
          type="button"
          class="category-heading-btn"
          :class="{ collapsed: isCategoryCollapsed(category.id) }"
          @click="toggleCategoryCollapsed(category.id)"
        >
          <i class="fas" :class="isCategoryCollapsed(category.id) ? 'fa-chevron-right' : 'fa-chevron-down'" />
          <span>{{ category.label }}</span>
          <span class="category-count">{{ category.rows.length }}</span>
        </button>

        <div v-show="!isCategoryCollapsed(category.id)">
          <table class="categorized-table">
            <colgroup v-if="columnWidths">
              <col v-for="(colWidth, colIndex) in columnWidths" :key="colIndex" :style="{ width: colWidth }">
            </colgroup>
            <thead>
              <slot name="header" />
            </thead>
            <tbody>
              <template v-if="category.rows.length > 0">
                <template
                  v-for="group in buildSubcategoryGroups(category.rows)"
                  :key="group.id"
                >
                  <tr
                    v-if="group.label"
                    class="subcategory-row"
                    :class="{ collapsed: isSubcategoryCollapsed(category.id, group.id) }"
                  >
                    <td :colspan="columnCount">
                      <button
                        v-if="enableSubcategoryCollapse"
                        type="button"
                        class="subcategory-heading-btn"
                        @click="toggleSubcategoryCollapsed(category.id, group.id)"
                      >
                        <i class="fas" :class="isSubcategoryCollapsed(category.id, group.id) ? 'fa-chevron-right' : 'fa-chevron-down'" />
                        <span>{{ group.label }}</span>
                        <span class="subcategory-count">{{ group.rows.length }}</span>
                      </button>
                      <span v-else>{{ group.label }}</span>
                    </td>
                  </tr>
                  <slot
                    v-for="row in (isSubcategoryCollapsed(category.id, group.id) ? [] : group.rows)"
                    :key="row.id"
                    name="row"
                    :row="row"
                    :index="rowIndexMap.get(row.id) ?? 0"
                  />
                </template>
              </template>
              <tr v-else class="placeholder-row">
                <td :colspan="columnCount" class="empty-row">
                  <i :class="emptyIcon" />
                  {{ localize(emptyLabel) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <div v-else class="single-category-view">
      <table class="categorized-table">
        <colgroup v-if="columnWidths">
          <col v-for="(colWidth, colIndex) in columnWidths" :key="colIndex" :style="{ width: colWidth }">
        </colgroup>
        <thead>
          <slot name="header" />
        </thead>
        <tbody>
          <template v-if="activeCategoryRows.length > 0">
            <template
              v-for="group in buildSubcategoryGroups(activeCategoryRows)"
              :key="group.id"
            >
              <tr
                v-if="group.label"
                class="subcategory-row"
                :class="{ collapsed: isSubcategoryCollapsed(activeTabId, group.id) }"
              >
                <td :colspan="columnCount">
                  <button
                    v-if="enableSubcategoryCollapse"
                    type="button"
                    class="subcategory-heading-btn"
                    @click="toggleSubcategoryCollapsed(activeTabId, group.id)"
                  >
                    <i class="fas" :class="isSubcategoryCollapsed(activeTabId, group.id) ? 'fa-chevron-right' : 'fa-chevron-down'" />
                    <span>{{ group.label }}</span>
                    <span class="subcategory-count">{{ group.rows.length }}</span>
                  </button>
                  <span v-else>{{ group.label }}</span>
                </td>
              </tr>
              <slot
                v-for="row in (isSubcategoryCollapsed(activeTabId, group.id) ? [] : group.rows)"
                :key="row.id"
                name="row"
                :row="row"
                :index="rowIndexMap.get(row.id) ?? 0"
              />
            </template>
          </template>
          <tr v-else class="placeholder-row">
            <td :colspan="columnCount" class="empty-row">
              <i :class="emptyIcon" />
              {{ localize(emptyLabel) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script lang="ts">
  export type CategorizedRow = {
    id: string;
    categoryId: string;
    categoryLabel: string;
    subcategoryId?: string;
    subcategoryLabel?: string;
    sortKey?: string;
  };
</script>

<script setup lang="ts" generic="TRow extends CategorizedRow">
  import { computed, ref, watch } from 'vue';

  const ALL_TAB_ID = '__all';

  const props = withDefaults(defineProps<{
    title?: string;
    columnCount: number;
    rows: TRow[];
    allTabLabel?: string;
    emptyLabel?: string;
    emptyIcon?: string;
    enableSubcategoryCollapse?: boolean;
    /** Explicit per-column CSS widths (colgroup), so nested tables of the same kind align exactly. */
    columnWidths?: string[];
    /** Trims section padding/borders for embedding inside another row (e.g. expanded container contents). */
    compact?: boolean;
    /** Suppresses the empty-state placeholder in the "All" tab when there are zero rows -
     * for consumers who render other content (e.g. a sibling list) that already covers
     * the "nothing here" case and don't want a redundant empty message. */
    hideEmptyState?: boolean;
  }>(), {
    allTabLabel: 'dnd35e.ACTOR.inventory.tab.all',
    emptyLabel: 'dnd35e.ACTOR.inventory.empty',
    emptyIcon: 'fas fa-box-open',
    enableSubcategoryCollapse: false,
    columnWidths: undefined,
    compact: false,
    hideEmptyState: false,
  });

  const localize = (key: string) => game.i18n.localize(key);

  type CategoryGroup = {
    id: string;
    label: string;
    rows: TRow[];
  };

  type SubcategoryGroup = {
    id: string;
    label: string | null;
    rows: TRow[];
  };

  const displayTitle = computed(() => props.title ? localize(props.title) : null);

  const categories = computed<CategoryGroup[]>(() => {
    const grouped = new Map<string, CategoryGroup>();

    const sortedRows = [...props.rows].sort((a, b) => {
      const aSort = a.sortKey ?? a.id;
      const bSort = b.sortKey ?? b.id;
      return aSort.localeCompare(bSort);
    });

    for (const row of sortedRows) {
      const existing = grouped.get(row.categoryId);
      if (existing) {
        existing.rows.push(row);
        continue;
      }

      grouped.set(row.categoryId, {
        id: row.categoryId,
        label: row.categoryLabel,
        rows: [row],
      });
    }

    return [...grouped.values()];
  });

  const tabs = computed(() => {
    const allTab = {
      id: ALL_TAB_ID,
      label: localize(props.allTabLabel),
      count: props.rows.length,
    };

    const categoryTabs = categories.value.map((category) => ({
      id: category.id,
      label: category.label,
      count: category.rows.length,
    }));

    return [allTab, ...categoryTabs];
  });

  const activeTabId = ref<string>(ALL_TAB_ID);
  const collapsedCategoryIds = ref<Record<string, boolean>>({});
  const collapsedSubcategoryIds = ref<Record<string, Record<string, boolean>>>({});

  function buildSubcategoryGroups(rows: TRow[]): SubcategoryGroup[] {
    const grouped = new Map<string, SubcategoryGroup>();

    for (const row of rows) {
      const id = row.subcategoryId ?? '__default';
      const label = row.subcategoryLabel ?? null;

      const existing = grouped.get(id);
      if (existing) {
        existing.rows.push(row);
        continue;
      }

      grouped.set(id, {
        id,
        label,
        rows: [row],
      });
    }

    return [...grouped.values()];
  }

  watch(categories, (nextCategories) => {
    const validIds = new Set(nextCategories.map((category) => category.id));

    if (activeTabId.value !== ALL_TAB_ID && !validIds.has(activeTabId.value)) {
      activeTabId.value = ALL_TAB_ID;
    }

    const nextCollapsedState: Record<string, boolean> = {};
    const nextSubCollapsedState: Record<string, Record<string, boolean>> = {};
    for (const category of nextCategories) {
      nextCollapsedState[category.id] = collapsedCategoryIds.value[category.id] ?? false;

      const priorSubcategoryState = collapsedSubcategoryIds.value[category.id] ?? {};
      const groups = buildSubcategoryGroups(category.rows);
      const subcategoryState: Record<string, boolean> = {};
      for (const group of groups) {
        subcategoryState[group.id] = priorSubcategoryState[group.id] ?? false;
      }
      nextSubCollapsedState[category.id] = subcategoryState;
    }
    collapsedCategoryIds.value = nextCollapsedState;
    collapsedSubcategoryIds.value = nextSubCollapsedState;
  }, { immediate: true });

  const isAllTab = computed(() => activeTabId.value === ALL_TAB_ID);

  const activeCategoryRows = computed(() => {
    if (isAllTab.value) return props.rows;
    const activeCategory = categories.value.find((category) => category.id === activeTabId.value);
    return activeCategory?.rows ?? [];
  });

  // Flat, in-render-order list of currently visible rows (respects active tab and
  // collapsed categories/subcategories). Used to assign each row a stable index so
  // consumers can compute alternating stripe colors independent of raw DOM position
  // (which shifts whenever a sibling container is expanded/collapsed).
  const orderedVisibleRows = computed<TRow[]>(() => {
    const result: TRow[] = [];

    if (isAllTab.value) {
      for (const category of categories.value) {
        if (isCategoryCollapsed(category.id)) continue;
        for (const group of buildSubcategoryGroups(category.rows)) {
          if (isSubcategoryCollapsed(category.id, group.id)) continue;
          result.push(...group.rows);
        }
      }
      return result;
    }

    for (const group of buildSubcategoryGroups(activeCategoryRows.value)) {
      if (isSubcategoryCollapsed(activeTabId.value, group.id)) continue;
      result.push(...group.rows);
    }
    return result;
  });

  const rowIndexMap = computed<Map<string, number>>(() => {
    const map = new Map<string, number>();
    orderedVisibleRows.value.forEach((row, index) => map.set(row.id, index));
    return map;
  });

  const isCategoryCollapsed = (categoryId: string): boolean => {
    return collapsedCategoryIds.value[categoryId] ?? false;
  };

  const toggleCategoryCollapsed = (categoryId: string): void => {
    collapsedCategoryIds.value[categoryId] = !isCategoryCollapsed(categoryId);
  };

  const isSubcategoryCollapsed = (categoryId: string, subcategoryId: string): boolean => {
    return collapsedSubcategoryIds.value[categoryId]?.[subcategoryId] ?? false;
  };

  const toggleSubcategoryCollapsed = (categoryId: string, subcategoryId: string): void => {
    if (!collapsedSubcategoryIds.value[categoryId]) {
      collapsedSubcategoryIds.value[categoryId] = {};
    }
    collapsedSubcategoryIds.value[categoryId][subcategoryId] = !isSubcategoryCollapsed(categoryId, subcategoryId);
  };
</script>

<style scoped lang="scss">
  .categorized-list-section {
    padding: 0.5rem;

    &.compact {
      padding: 0;
    }
  }

  .categorized-list-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.5rem;

    .compact & {
      margin-top: 0.3rem;
      margin-bottom: 0.3rem;
    }
  }

  .category-tab-btn {
    align-items: center;
    background: color-mix(in srgb, var(--color-cool-4, #9ba5a0) 10%, transparent);
    border: 1px solid var(--color-cool-4, #9ba5a0);
    border-radius: 999px;
    cursor: pointer;
    display: inline-flex;
    font-size: 0.8rem;
    gap: 0.4rem;
    padding: 0.2rem 0.55rem;

    &.active {
      background: var(--color-cool-4, #9ba5a0);
      color: var(--color-text-light-primary, #f7f7f7);
    }
  }

  .tab-count,
  .category-count {
    background: color-mix(in srgb, currentColor 20%, transparent);
    border-radius: 999px;
    font-size: 0.7rem;
    line-height: 1;
    min-width: 1.2rem;
    padding: 0.15rem 0.35rem;
    text-align: center;
  }

  .all-categories-view,
  .single-category-view {
    display: grid;
    gap: 0.5rem;

    .compact & {
      gap: 0.3rem;
    }
  }

  .category-group {
    border: 1px solid color-mix(in srgb, var(--color-cool-4, #9ba5a0) 30%, transparent);
    border-radius: 0.35rem;
    overflow: hidden;

    .compact & {
      border: none;
      border-radius: 0;
    }
  }

  .category-heading-btn {
    align-items: center;
    background: color-mix(in srgb, var(--color-cool-4, #9ba5a0) 12%, transparent);
    border: none;
    border-bottom: 1px solid color-mix(in srgb, var(--color-cool-4, #9ba5a0) 30%, transparent);
    cursor: pointer;
    display: grid;
    font-size: 0.85rem;
    font-weight: 600;
    gap: 0.4rem;
    grid-template-columns: auto 1fr auto;
    padding: 0.35rem 0.5rem;
    text-align: left;
    width: 100%;

    &.collapsed {
      border-bottom: none;
    }

    .compact & {
      font-size: 0.78rem;
      padding: 0.25rem 0.35rem;
    }
  }

  .categorized-table {
    border-collapse: collapse;
    font-size: 0.82rem;
    table-layout: fixed;
    width: 100%;
    margin: 0;

    :deep(th),
    :deep(td) {
      border-bottom: 1px solid color-mix(in srgb, var(--color-cool-4, #9ba5a0) 28%, transparent);
      padding: 0.3rem 0.4rem;
      vertical-align: middle;
    }

    :deep(th) {
      color: var(--color-text-dark-secondary, #4d4d4d);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.03em;
      text-transform: uppercase;
    }
  }

  .subcategory-row td {
    background: color-mix(in srgb, var(--color-cool-4, #9ba5a0) 10%, transparent);
    color: var(--color-text-dark-secondary, #4d4d4d);
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .subcategory-heading-btn {
    align-items: center;
    background: transparent;
    border: none;
    color: inherit;
    cursor: pointer;
    display: inline-grid;
    font: inherit;
    gap: 0.35rem;
    grid-template-columns: auto 1fr auto;
    padding: 0;
    text-align: left;
    width: 100%;
  }

  .subcategory-count {
    background: color-mix(in srgb, currentColor 20%, transparent);
    border-radius: 999px;
    font-size: 0.7rem;
    line-height: 1;
    min-width: 1.1rem;
    padding: 0.1rem 0.3rem;
    text-align: center;
  }

  .empty-row {
    color: var(--color-text-dark-secondary, #4d4d4d);
    text-align: center;

    i {
      margin-right: 0.35rem;
      opacity: 0.7;
    }
  }

  .empty-state {
    padding: 1rem;
  }
</style>
