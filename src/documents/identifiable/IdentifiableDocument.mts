import type { DocumentProperties } from '@documents/document/DocumentDnd35e.mjs';
import type { EvaluationDocument, FormulaRegistration } from '@documents/document/index.mjs';
import { secretEffectType } from '@effects/secret/secretEffectType.mjs';
import type { ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/index.mjs';

import type { IdentifiableDocumentSystemData, IdentifiableDocumentSystemSource } from './index.mjs';
import { deriveIdentifiableState } from './logic/index.mjs';

type IdentifiableDocumentSourceProps = {
  system: IdentifiableDocumentSystemSource;
}

type IdentifiableDocumentSource<TItemType extends ItemType = ItemType> =
  Omit<ItemSourceDnd35e<TItemType>, 'system'>
    & IdentifiableDocumentSourceProps;

interface IdentifiableDocument {
  system: IdentifiableDocumentSystemData;
}

type IdentifiableDocumentLike = ItemDnd35e<ItemType> & IdentifiableDocument;

// ─── Mixin constraint ───────────────────────────────────────────────────────

/** Minimal effect shape needed for identifiable state derivation. */
interface IdentifiableEffect {
  type: string;
  active: boolean;
  disabled: boolean;
  id: string | null;
}

/**
 * Structural constraint for documents that can host the identifiable mixin.
 * Satisfied by Items (now) and Actors (Phase 6+) — both have `effects` collections.
 * Excludes ActiveEffects which lack embedded effect collections.
 */
interface IdentifiableHostDocument extends DocumentProperties {
  effects: Iterable<IdentifiableEffect>;
  prepareDerivedData(): void;
  updateEmbeddedDocuments(embeddedName: string, updates: Record<string, unknown>[]): Promise<unknown>;
}

type IdentifiableDocumentCtor = AbstractConstructorOf<IdentifiableHostDocument>;

// ─── Concrete return types ──────────────────────────────────────────────────

/**
 * Public properties added by {@link IdentifiableDocumentMixin}.
 * Extends DocumentProperties so the mixin chain's shape is flat for TS.
 */
interface IdentifiableDocumentProperties extends DocumentProperties {
  /** Whether this document has any Secret AEs (even disabled). */
  readonly isIdentifiable: boolean;
  /** Whether all Secret AEs are disabled/absent — derived in prepareDerivedData. */
  isIdentified: boolean;
  /** Disable all active Secret AEs, revealing the document's true properties. */
  revealAllSecrets(): Promise<void>;
}

/** Constructor type returned by the mixin – avoids deep type inference. */
type IdentifiableDocumentConstructor<TBase extends IdentifiableDocumentCtor> =
  (abstract new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> & IdentifiableDocumentProperties) & { [K in keyof TBase]: TBase[K] };

// ─── Mixin ──────────────────────────────────────────────────────────────────

const IdentifiableDocumentMixin = <TBase extends IdentifiableDocumentCtor> (Base: TBase): IdentifiableDocumentConstructor<TBase> => {
  // Local interface merge: exposes `system` for formula registrations without
  // adding it to the constructor constraint (which would conflict with concrete system types).
  interface IdentifiableDocument {
    system: Record<string, unknown>;
  }

  abstract class IdentifiableDocument extends Base {
    // Protected members can't be in interfaces - must declare separately
    declare protected readonly defaultDerivedNameRegistration: FormulaRegistration;
    declare protected readonly defaultNameRegistration: FormulaRegistration;

    protected readonly identifiableNameRegistration: FormulaRegistration = {
      impactedField: 'name',
      formulaField: 'system.isIdentified',
      evaluate: (document: EvaluationDocument, _contexts: Record<string, EvaluationDocument>) => {
        return document.system.nameFormula?.resolvedValue || document.name;
      },
    };

    /**
     * Whether this document has any Secret AEs (even disabled ones).
     * Derived in prepareDerivedData from the effects collection.
     */
    isIdentifiable: boolean = false;

    /**
     * Whether all Secret AEs are disabled or absent.
     * Derived in prepareDerivedData from the effects collection.
     */
    isIdentified: boolean = true;

    constructor (...args: any[]) {
      super(...args);
      // Replace the base name registration with identifiable-aware version
      this.registeredFormulas.delete(this.defaultNameRegistration);
      this.registeredFormulas.add(this.identifiableNameRegistration);
    }

    override prepareDerivedData (): void {
      this._deriveIdentifiableState();
      super.prepareDerivedData();
    }

    /**
     * Derive isIdentifiable and isIdentified from Secret AEs.
     * Delegates to {@link deriveIdentifiableState} so the logic can be unit
     * tested without mounting the document.
     */
    private _deriveIdentifiableState (): void {
      const state = deriveIdentifiableState(this.effects);
      this.isIdentifiable = state.isIdentifiable;
      this.isIdentified = state.isIdentified;
    }

    /**
     * Reveal all secrets by disabling every active Secret AE on this document.
     * Also unhides non-secret hidden effects so a fully revealed item exposes
     * its regular effect list to players again.
     * After the update, `isIdentified` will derive to `true` and `_masks` will be empty.
     */
    async revealAllSecrets (): Promise<void> {
      const updates: Record<string, unknown>[] = [];

      for (const effect of this.effects) {
        const effectId = effect.id;
        if (!effectId) continue;

        if (effect.type === secretEffectType && !effect.disabled) {
          updates.push({ _id: effectId, disabled: true });
          continue;
        }

        if (effect.type !== secretEffectType && 'system' in effect && (effect as { system?: { isHidden?: boolean } }).system?.isHidden) {
          updates.push({ _id: effectId, 'system.isHidden': false });
        }
      }

      if (!updates.length) return;
      await this.updateEmbeddedDocuments('ActiveEffect', updates);
    }
  }
  return IdentifiableDocument as unknown as IdentifiableDocumentConstructor<TBase>;
};

export {
  IdentifiableDocumentMixin,
};

export type {
  IdentifiableDocument,
  IdentifiableDocumentConstructor,
  IdentifiableDocumentCtor,
  IdentifiableDocumentLike,
  IdentifiableDocumentProperties,
  IdentifiableDocumentSource,
  IdentifiableDocumentSourceProps,
};
