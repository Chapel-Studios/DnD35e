import { ItemDnd35e } from "@items/baseItem/ItemDnd35e.mjs";

type Formula = string | null | undefined;

const replaceDataAttribute = <TContext extends ItemDnd35e> (formula: Formula, context: TContext): string => {
  if (!formula) return context.name;

  return formula.replace(/@([\w.]+)/g, (_, path) => {
    const value = foundry.utils.getProperty(context, path) as string | number | undefined;
    return typeof value !== 'undefined' ? String(value) : `@${path}`;
  });
};

export { replaceDataAttribute };
