import type { SheetTab } from '@documents/document/index.mjs';

import ActorEffectsTab from './ActorEffectsTab.vue';

const actorEffectsTab: SheetTab = {
  id: 'effects',
  label: 'dnd35e.ACTOR.tab.Effects',
  component: ActorEffectsTab,
  order: 40,
  icon: 'fas fa-bolt',
};

export { actorEffectsTab };
