/**
 * Pseudo field-path used purely for GM visibility/editability override storage on the
 * inventory list section. There is no corresponding schema field (the "inventory" is a
 * derived list of embedded Item documents, not a system data value), so this path never
 * resolves via `getSchemaField` - it behaves like the existing non-schema paths (`name`,
 * `img`) that the field-override system already supports.
 *
 * @module
 */

const INVENTORY_FIELD_PATH = 'system.inventory';

/**
 * Per-table pseudo field-paths, nested under {@link INVENTORY_FIELD_PATH} so the
 * existing most-restrictive-wins override cascade applies: locking the overall
 * inventory section still locks every table, while each table can additionally
 * be locked on its own without affecting the others.
 */
const CARRIED_INVENTORY_FIELD_PATH = 'system.inventory.carried';
const TRACKED_INVENTORY_FIELD_PATH = 'system.inventory.tracked';

export { CARRIED_INVENTORY_FIELD_PATH, INVENTORY_FIELD_PATH, TRACKED_INVENTORY_FIELD_PATH };
