// This file is deprecated. Tab definitions have been moved to index.mts to avoid circular imports.
// Previously, tabs.mts imported WeaponDetails from the barrel export (@items/weapon/index.mjs),
// which in turn imported from sheet/index.mts, which imported from tabs/index.mts, which imported tabs.mjs.
// By consolidating tab definitions in index.mts alongside Vue components, the circular dependency is broken.

