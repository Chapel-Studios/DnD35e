<template>
  <section class="sheet-section skill-list-section">
    <h2 class="section-header">
      Skills
      <span class="skill-points-summary">Ranks: <span class="placeholder">0</span> / <span class="placeholder">0</span></span>
    </h2>
    <table class="skills-table">
      <thead>
        <tr>
          <th class="skill-cs-col" title="Class Skill">CS</th>
          <th class="skill-name-col">Skill</th>
          <th class="skill-ability-col">Ability</th>
          <th class="skill-num-col">Total</th>
          <th class="skill-num-col">Ranks</th>
          <th class="skill-num-col">Ability</th>
          <th class="skill-num-col">Misc</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="skill in skills" :key="skill.key" class="skill-row">
          <td class="skill-cs"><i v-if="skill.classSkill" class="fas fa-circle" /></td>
          <td class="skill-name rollable placeholder">{{ skill.label }}</td>
          <td class="skill-ability">{{ skill.ability }}</td>
          <td class="skill-total placeholder">—</td>
          <td class="skill-ranks placeholder">—</td>
          <td class="skill-abilitymod placeholder">—</td>
          <td class="skill-misc placeholder">—</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script setup lang="ts">
  const skills = [
    { key: 'appraise',      label: 'Appraise',              ability: 'INT', classSkill: false },
    { key: 'balance',       label: 'Balance',               ability: 'DEX', classSkill: false },
    { key: 'bluff',         label: 'Bluff',                 ability: 'CHA', classSkill: false },
    { key: 'climb',         label: 'Climb',                 ability: 'STR', classSkill: false },
    { key: 'concentration', label: 'Concentration',         ability: 'CON', classSkill: false },
    { key: 'craft',         label: 'Craft',                 ability: 'INT', classSkill: false },
    { key: 'decipher',      label: 'Decipher Script',       ability: 'INT', classSkill: false },
    { key: 'diplomacy',     label: 'Diplomacy',             ability: 'CHA', classSkill: false },
    { key: 'disableDevice', label: 'Disable Device',        ability: 'INT', classSkill: false },
    { key: 'disguise',      label: 'Disguise',              ability: 'CHA', classSkill: false },
    { key: 'escapeArtist',  label: 'Escape Artist',         ability: 'DEX', classSkill: false },
    { key: 'forgery',       label: 'Forgery',               ability: 'INT', classSkill: false },
    { key: 'gatherInfo',    label: 'Gather Information',    ability: 'CHA', classSkill: false },
    { key: 'handleAnimal',  label: 'Handle Animal',         ability: 'CHA', classSkill: false },
    { key: 'heal',          label: 'Heal',                  ability: 'WIS', classSkill: false },
    { key: 'hide',          label: 'Hide',                  ability: 'DEX', classSkill: false },
    { key: 'intimidate',    label: 'Intimidate',            ability: 'CHA', classSkill: false },
    { key: 'jump',          label: 'Jump',                  ability: 'STR', classSkill: false },
    { key: 'kArcana',       label: 'Knowledge (Arcana)',    ability: 'INT', classSkill: false },
    { key: 'kDungeon',      label: 'Knowledge (Dungeoneering)', ability: 'INT', classSkill: false },
    { key: 'kGeography',    label: 'Knowledge (Geography)', ability: 'INT', classSkill: false },
    { key: 'kHistory',      label: 'Knowledge (History)',   ability: 'INT', classSkill: false },
    { key: 'kLocal',        label: 'Knowledge (Local)',     ability: 'INT', classSkill: false },
    { key: 'kNature',       label: 'Knowledge (Nature)',    ability: 'INT', classSkill: false },
    { key: 'kNobility',     label: 'Knowledge (Nobility)',  ability: 'INT', classSkill: false },
    { key: 'kPlanes',       label: 'Knowledge (Planes)',    ability: 'INT', classSkill: false },
    { key: 'kReligion',     label: 'Knowledge (Religion)',  ability: 'INT', classSkill: false },
    { key: 'listen',        label: 'Listen',                ability: 'WIS', classSkill: false },
    { key: 'moveSilently',  label: 'Move Silently',         ability: 'DEX', classSkill: false },
    { key: 'openLock',      label: 'Open Lock',             ability: 'DEX', classSkill: false },
    { key: 'perform',       label: 'Perform',               ability: 'CHA', classSkill: false },
    { key: 'profession',    label: 'Profession',            ability: 'WIS', classSkill: false },
    { key: 'ride',          label: 'Ride',                  ability: 'DEX', classSkill: false },
    { key: 'search',        label: 'Search',                ability: 'INT', classSkill: false },
    { key: 'senseMotive',   label: 'Sense Motive',          ability: 'WIS', classSkill: false },
    { key: 'sleightOfHand', label: 'Sleight of Hand',       ability: 'DEX', classSkill: false },
    { key: 'spellcraft',    label: 'Spellcraft',            ability: 'INT', classSkill: false },
    { key: 'spot',          label: 'Spot',                  ability: 'WIS', classSkill: false },
    { key: 'survival',      label: 'Survival',              ability: 'WIS', classSkill: false },
    { key: 'swim',          label: 'Swim',                  ability: 'STR', classSkill: false },
    { key: 'tumble',        label: 'Tumble',                ability: 'DEX', classSkill: false },
    { key: 'useMagicDevice',label: 'Use Magic Device',      ability: 'CHA', classSkill: false },
    { key: 'useRope',       label: 'Use Rope',              ability: 'DEX', classSkill: false },
  ] as const;
</script>
