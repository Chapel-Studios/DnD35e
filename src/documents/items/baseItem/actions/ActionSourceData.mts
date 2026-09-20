import type { ActionEconomyType } from '@constants/actionEconomy.mjs';
import type { FormulaDataSource } from '@helpers/formulae/FormulaData.mjs';

import type { ActionTrigger, ActionType } from './constants.mjs';

type ActionChainLinkModel = {
  actionId: string;
  trigger: ActionTrigger;
};

interface ActionSourceData {
  _id: string;
  name: FormulaDataSource;
  type: ActionType;
  isSystemCreated: boolean;
  isTopLevel: boolean;
  activationCost: ActionEconomyType;
  chain: ActionChainLinkModel[];
  maxTargets: number | null;
  isTargetRequired: boolean;
  provokes: boolean;
  description: string;
}

export type {
  ActionChainLinkModel,
  ActionSourceData,
};