import { Dnd35eDocumentProperties } from '@ec/CoreMixin/Dnd35eDocument.mjs';
import { FormulaContextBuilder, FormulaRegistration } from '@ec/CoreMixin/index.mjs';
import { DnD35eActiveEffect } from '@entities/activeEffects/index.mjs';
import { buildDocumentDataMap, DocumentContext, resolveFormulaField } from '@helpers/formulae/index.mjs';
import { ItemDnd35e, ItemSourceDnd35e } from '@items/baseItem/index.mjs';
import { ItemType } from '@items/index.mjs';

import { IdentifiableDocumentSystemData, IdentifiableDocumentSystemSource } from './index.mjs';

type IdentifiableDocumentSourceProps = {
  system: IdentifiableDocumentSystemSource;
}

type IdentifiableDocumentSource<TItemType extends ItemType = ItemType> =
  Omit<ItemSourceDnd35e<TItemType>, 'system'>
    & IdentifiableDocumentSourceProps;

interface IdentifiableDocument {
  system: IdentifiableDocumentSystemData;

  get unidentifiedDisplayName(): string;
  get identifiedDisplayName(): string;
}

type IdentifiableDocumentLike =
  ItemDnd35e<ItemType> &
  IdentifiableDocument &
  { _displayName: string };

type IdentifiableEffectLike =
  DnD35eActiveEffect &
  IdentifiableDocument &
  { _displayName: string };

type WithIdentifiableComponent = IdentifiableDocumentLike | IdentifiableEffectLike;

type Dnd35eDocumentCtor = AbstractConstructorOf<Dnd35eDocumentProperties>;
type ItemOrEffectCtor = Dnd35eDocumentCtor & (
  AbstractConstructorOf<ItemDnd35e<ItemType>> | AbstractConstructorOf<DnD35eActiveEffect>
);
// const applyIdentifiablePrototype = <T extends ItemOrEffectCtor> (item: T) => {
//   if ((item as any).__isIdentifiedApplied) return;

//   Object.defineProperties(item.prototype, {
//     unidentifiedDisplayName: {
//       get () {
//         const {
//           unidentifiedInfo: {
//             unidentifiedNameFormula,
//           } = {},
//         } = this.system as IdentifiableDocumentSystemData;

//         return resolveFormulaField(
//           unidentifiedNameFormula,
//           buildDocumentDataMap(this, (this as any).actor),
//           this.name
//         );
//       },
//     },
//     identifiedDisplayName: {
//       get () {
//         return this._displayName;
//       },
//     },
//   });

//   (item as any).__isIdentifiedApplied = true;
// };

// const identifiableOverrides = {
//   displayName: (item: WithIdentifiableComponent): string => {
//     const identifiedName = item._displayName;
//     const {
//       isIdentifiable,
//       unidentifiedInfo: {
//         isIdentified = false,
//       } = {},
//     } = item.system;

//     return !isIdentifiable || isIdentified
//       ? identifiedName
//       : item.unidentifiedDisplayName;
//   },
// };

const IdentifiableDocumentMixin = <TBase extends ItemOrEffectCtor> (Base: TBase) => {
  // Interface merging: gives access to public Dnd35eDocumentProperties
  interface IdentifiableDocument extends Dnd35eDocumentProperties {}

  abstract class IdentifiableDocument extends Base {
    // Protected members can't be in interfaces - must declare separately
    declare protected readonly defaultDerivedNameRegistration: FormulaRegistration;
    declare protected readonly defaultNameRegistration: FormulaRegistration;
    declare protected abstract unidentifiedNameContextBuilder: FormulaContextBuilder;

    protected readonly unidentifiedDerivedNameRegistration: FormulaRegistration = {
      impactedField: 'system.derivedUnidentifiedName',
      formulaField: 'system.unidentifiedNameFormula',
      evaluate: (document: DocumentContext) => {
        const idocument = document as IdentifiableDocumentLike;
        if (!idocument || !idocument.system.isIdentified) return;
  
        const baseContext = this.unidentifiedNameContextBuilder(idocument)
          ?? {} as Record<string, DocumentContext>;
        baseContext.self = idocument;
  
        const newName = resolveFormulaField(
          idocument.system.unidentifiedNameFormula,
          baseContext,
          idocument.system.derivedUnidentifiedName || idocument.name
        );
        console.log('[updateDocument] Resolved newName:', newName);
        return newName;
      },
    };

    protected readonly identifiableNameRegistration: FormulaRegistration = {
      impactedField: 'name',
      formulaField: 'system.isIdentified',
      evaluate: (document: DocumentContext) => {
        const idocument = document as IdentifiableDocumentLike;
        if (!idocument) return;
  
        return idocument.system.isIdentified
          ? idocument.system.derivedName
          : idocument.system.derivedUnidentifiedName || '';
      },
    };

    constructor (...args: any[]) {
      super(...args);
      this.registeredFormulas = new Set([
        this.defaultDerivedNameRegistration,
        this.defaultNameRegistration,
      ]);
    }
  }
  return IdentifiableDocument;
};

export {
  IdentifiableDocumentMixin,
};

export type {
  IdentifiableDocument,
  IdentifiableDocumentLike,
  IdentifiableDocumentSource,
  IdentifiableDocumentSourceProps,
  IdentifiableEffectLike,
  WithIdentifiableComponent,
};
