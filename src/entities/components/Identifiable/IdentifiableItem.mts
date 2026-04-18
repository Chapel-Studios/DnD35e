import type { Dnd35eDocumentProperties } from '@ec/CoreMixin/Dnd35eDocument.mjs';
import type { EvaluationDocument, FormulaRegistration } from '@ec/CoreMixin/index.mjs';
import { FormulaData } from '@helpers/formulae/FormulaData.mjs';
import type { FormulaField } from '@helpers/formulae/FormulaField.mjs';
import type { ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { ItemDnd35e } from '@items/baseItem/index.mjs';
import type { ItemType } from '@items/index.mjs';

import type { IdentifiableDocumentSystemData, IdentifiableDocumentSystemSource } from './index.mjs';

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
interface IdentifiableHostDocument extends Dnd35eDocumentProperties {
  effects: Iterable<IdentifiableEffect>;
  prepareDerivedData(): void;
  updateEmbeddedDocuments(embeddedName: string, updates: Record<string, unknown>[]): Promise<unknown>;
}

type IdentifiableDocumentCtor = AbstractConstructorOf<IdentifiableHostDocument>;

// ─── Concrete return types ──────────────────────────────────────────────────

/**
 * Public properties added by {@link IdentifiableDocumentMixin}.
 * Extends Dnd35eDocumentProperties so the mixin chain's shape is flat for TS.
 */
interface IdentifiableDocumentProperties extends Dnd35eDocumentProperties {
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

    protected readonly unidentifiedDerivedNameRegistration: FormulaRegistration = {
      impactedField: 'system.nameFormula.unidentifiedValue.resolvedValue',
      formulaField: 'system.nameFormula',
      evaluate: (document: EvaluationDocument, contexts: Record<string, EvaluationDocument>) => {
        const unidentifiedFormula = document.system.nameFormula?.unidentifiedValue;
        if (!unidentifiedFormula?.formula) return null;
        const nameFormulaDnd35e = (this.system as any).schema?.fields?.nameFormula;
        const innerField = nameFormulaDnd35e?.fields?.value as FormulaField | undefined;
        const excluded = innerField?.excludedFields ?? [];
        return FormulaData.resolveSource(unidentifiedFormula, { self: document, ...contexts }, document.name || '', excluded);
      },
    };

    protected readonly identifiableNameRegistration: FormulaRegistration = {
      impactedField: 'name',
      formulaField: 'system.isIdentified',
      evaluate: (document: EvaluationDocument, _contexts: Record<string, EvaluationDocument>) => {
        const { nameFormula } = document.system;
        if (document.isIdentified) return nameFormula?.value?.resolvedValue || document.name;
        return nameFormula?.unidentifiedValue?.resolvedValue || nameFormula?.value?.resolvedValue || document.name;
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
      // and add unidentified name formula registration
      this.registeredFormulas.delete(this.defaultNameRegistration);
      this.registeredFormulas.add(this.unidentifiedDerivedNameRegistration);
      this.registeredFormulas.add(this.identifiableNameRegistration);
    }

    override prepareDerivedData (): void {
      this._deriveIdentifiableState();
      super.prepareDerivedData();
    }

    /**
     * Derive isIdentifiable and isIdentified from Secret AEs.
     */
    private _deriveIdentifiableState (): void {
      const secrets = [...this.effects].filter(
        e => e.type === 'secret'
      );
      this.isIdentifiable = secrets.length > 0;
      this.isIdentified = !secrets.some(e => e.active);
    }

    /**
     * Reveal all secrets by disabling every active Secret AE on this document.
     * After the update, `isIdentified` will derive to `true` and `_masks` will be empty.
     */
    async revealAllSecrets (): Promise<void> {
      const secrets = [...this.effects].filter(
        e => e.type === 'secret' && !e.disabled
      );
      if (!secrets.length) return;
      const updates = secrets.map(e => ({ _id: e.id, disabled: true }));
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
