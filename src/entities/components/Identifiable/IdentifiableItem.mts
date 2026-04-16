import type { Dnd35eDocumentProperties } from '@ec/CoreMixin/Dnd35eDocument.mjs';
import type { EvaluationDocument, FormulaRegistration } from '@ec/CoreMixin/index.mjs';
import { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
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

type IdentifiableEffectLike = DnD35eActiveEffect & IdentifiableDocument;

type WithIdentifiableComponent = IdentifiableDocumentLike | IdentifiableEffectLike;

type Dnd35eDocumentCtor = AbstractConstructorOf<Dnd35eDocumentProperties>;
type ItemOrEffectCtor = Dnd35eDocumentCtor & (
  AbstractConstructorOf<ItemDnd35e<ItemType>> | AbstractConstructorOf<DnD35eActiveEffect>
);

// ─── Concrete return types ──────────────────────────────────────────────────

/**
 * Public properties added by {@link IdentifiableDocumentMixin}.
 * Extends Dnd35eDocumentProperties so the mixin chain's shape is flat for TS.
 */
interface IdentifiableDocumentProperties extends Dnd35eDocumentProperties {}

/** Constructor type returned by the mixin – avoids deep type inference. */
type IdentifiableDocumentConstructor<TBase extends ItemOrEffectCtor> =
  (abstract new (...args: ConstructorParameters<TBase>) => InstanceType<TBase> & IdentifiableDocumentProperties) & { [K in keyof TBase]: TBase[K] };

// ─── Mixin ──────────────────────────────────────────────────────────────────

const IdentifiableDocumentMixin = <TBase extends ItemOrEffectCtor> (Base: TBase): IdentifiableDocumentConstructor<TBase> => {
  // Interface merging: gives access to public Dnd35eDocumentProperties
  interface IdentifiableDocument extends Dnd35eDocumentProperties {}

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
        const nameFormulaDnd35e = (this as any).system?.schema?.fields?.nameFormula;
        const innerField = nameFormulaDnd35e?.fields?.value as FormulaField | undefined;
        const excluded = innerField?.excludedFields ?? [];
        return FormulaData.resolveSource(unidentifiedFormula, { self: document, ...contexts }, document.name || '', excluded);
      },
    };

    protected readonly identifiableNameRegistration: FormulaRegistration = {
      impactedField: 'name',
      formulaField: 'system.isIdentified',
      evaluate: (document: EvaluationDocument, _contexts: Record<string, EvaluationDocument>) => {
        const { isIdentified, nameFormula } = document.system;
        if (isIdentified) return nameFormula?.value?.resolvedValue || document.name;
        return nameFormula?.unidentifiedValue?.resolvedValue || nameFormula?.value?.resolvedValue || document.name;
      },
    };

    constructor (...args: any[]) {
      super(...args);
      // Replace the base name registration with identifiable-aware version
      // and add unidentified name formula registration
      this.registeredFormulas.delete(this.defaultNameRegistration);
      this.registeredFormulas.add(this.unidentifiedDerivedNameRegistration);
      this.registeredFormulas.add(this.identifiableNameRegistration);
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
  IdentifiableDocumentLike,
  IdentifiableDocumentProperties,
  IdentifiableDocumentSource,
  IdentifiableDocumentSourceProps,
  IdentifiableEffectLike,
  ItemOrEffectCtor,
  WithIdentifiableComponent,
};
