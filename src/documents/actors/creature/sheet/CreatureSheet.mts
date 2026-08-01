import { ActorSheetDnd35e } from '@actors/baseActor/sheet/ActorSheetDnd35e.mjs';

/**
 * Abstract sheet layer for creature-type actors (PCs, NPCs).
 * Sits between ActorSheetDnd35e and character/NPC-specific sheets.
 * Non-creature types (traps, objects — a future, not-yet-scheduled phase) extend ActorSheetDnd35e directly.
 */
abstract class CreatureSheet extends ActorSheetDnd35e {}

export { CreatureSheet };
