# 3.5 SRD Cross-Linked Reference

A Foundry VTT journal that contains the full 3.5 System Reference Document as presented on d20srd.org. Its pages are linked to each other and to the D35E system's compendiums.

Originally built for **Foundry VTT v14** and **D35E 3.1.0**; packaged here as a source document in dnd35e's `documentation` compendium pack (`packs/_source/documentation/`), where it compiles automatically with the rest of the system build.

## What's included

| File | Purpose |
|---|---|
| `fvtt-JournalEntry-3.5-SRD-Cross-Linked-Reference.json` | The journal (one entry, 47 pages) |
| `../../../../src/assets/srd-journal/images/` | 19 rules diagrams used by the Variant Adventuring page, shipped via the system's generic `src/assets` → build output copy step |

## Contents

The journal follows the structure of the d20srd.org home page. The **Table of Contents** page has a header for each main group, so the page outline can jump straight to it.

- **Core Rules:** The Core Mechanic, Races, Character Descriptions, Base, Multiclass, Prestige and NPC Classes, Skills, Feats, Magic Items, Equipment & Special Materials, Combat, Conditions, Special Abilities, Magic Overview, Spell Lists & Domains, Types & Subtypes, Improving Monsters, Monster Feats, Monsters as Races, Carrying/Movement/Exploration, Surroundings/Weather/Environment, Traps, Treasure, Planes
- **Epic Rules:** Basics & Classes (including the epic prestige classes), Skills, Feats, Spells (rules and seeds), Magic Items, Obstacles
- **Psionic Rules:** Races/Classes/Skills/Spells, Feats, Powers Overview, Power List, Items, Monsters (overview)
- **Divine Rules:** Divine Ranks & Powers, Divine Abilities & Feats, Additional Domains, Spells, & Divine Minions
- **Variant Rules (Unearthed Arcana):** Races, Classes, Building Characters, Adventuring, Magic, Campaigns. The page names start with "Variant" so they're distinct from the core pages.

Individual spells, psionic powers and monsters are **not** copied into the journal. Wherever they're mentioned, they link to the D35E compendium entries instead.

## Links

All links resolve inside Foundry. There are no links to outside websites.

| Link type | Count |
|---|---|
| Between journal pages (to the exact heading) | 15,500 |
| D35E spells (`D35E.spells`) | 3,130 |
| D35E psionic powers (`D35E.powers`) | 1,223 |
| D35E magic items (`D35E.magicitems`) | 646 |
| D35E bestiary (`D35E.bestiary`) | 288 |
| Trap actors (`traps-and-poisons.traps`) | 105 |

> **dnd35e compatibility note**: the compendium links above still point at the legacy **D35E** system's pack names (`D35E.spells`, `D35E.powers`, `D35E.magicitems`, `D35E.bestiary`) and the **Traps and Poisons** module. dnd35e doesn't have equivalent spells/powers/magicitems/bestiary compendiums yet, so these ~5,400 links render as broken until those packs exist and the links are repointed in a batch pass (same approach described for Trap actors below).

Links between pages use Foundry's relative form (`@UUID[.pageId#heading]`), so they keep working if the journal is moved into a compendium.

Some mentions were left as plain text because there's no single matching compendium entry. These include generic references ("demons", "skeletons"), creatures not in the bestiary, and items with several variants.

### Trap actors

Each of the 105 sample traps on the **Traps** page has a "Trap actor:" link to a ready-to-use trap actor in the **Traps and Poisons** module. The links are matched by name and CR. If the module isn't installed, Foundry shows these links as broken.

The trap actors were originally built for inclusion in D35E, and they're offered for that purpose. If they're added to the system's `traps` compendium, the links can be repointed in one pass, as long as the actor names and CRs are unchanged.

## Installation

This journal is first-party pack content — it compiles automatically into dnd35e's `documentation` compendium as part of the normal system build (`npm run build:dev` / `build:dist`). No manual import is required; the diagram images ship from `src/assets/srd-journal/images/` into the build output and resolve at `systems/dnd35e/assets/srd-journal/images/`.

The journal is set to Observer for all players. Each page follows the journal's permission.

## Editorial notes

- **Text:** taken from d20srd.org, with the site's formatting and styling removed so Foundry's theme controls the look. The wording is unchanged.
- **Headings with square brackets** (for example "Ability Focus [General]") are written with vertical bars ("Ability Focus |General|"). Foundry can't link to a heading that contains `[` or `]`.
- **Ability Modifiers table:** on The Core Mechanic page, this is an HTML table, not an image.
- **Hide skill:** this description was missing from the original working copy and has been added.

## License

The rules text is Open Game Content from the System Reference Document, used under the Open Game License v1.0a. The license text is already included with the D35E system.
