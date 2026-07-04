import type { SheetTab } from '@documents/document/index.mjs';

import ActorDescriptionTab from './ActorDescriptionTab.vue';
import ActorEffectsTab from './ActorEffectsTab.vue';

const actorDescriptionTab: SheetTab = {
  id: 'notes',
  label: 'dnd35e.ACTOR.tab.Notes',
  tooltip: 'dnd35e.ACTOR.tab.Notes',
  component: ActorDescriptionTab,
  order: 80,
  icon: 'fas fa-book-open',
};

const actorEffectsTab: SheetTab = {
  id: 'effects',
  label: 'dnd35e.ACTOR.tab.Effects',
  tooltip: 'dnd35e.ACTOR.tab.Effects',
  component: ActorEffectsTab,
  order: 40,
  icon: 'fas fa-bolt',
};

export {
  actorDescriptionTab,
  actorEffectsTab,
};
