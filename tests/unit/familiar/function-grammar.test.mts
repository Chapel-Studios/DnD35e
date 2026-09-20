import { FormulaResolver } from '@helpers/formulae/FormulaResolver.mjs';
import { resolveItAutocompleteContext } from '@helpers/formulae/itContext.mjs';
import type { FamiliarSchema, FieldAspect } from '@helpers/formulae/types.mjs';
import { describe, expect, it } from 'vitest';

const {
  findFunctionBlocks,
  resolveFormula,
  validateFormula,
} = FormulaResolver;

/**
 * poc §7.2b — Array & String Operators (Story A follow-up).
 * See `docs/migration-plan/poc/phase-07-roll-formulas.md` poc §7.2b.
 */
describe('findFunctionBlocks — parsing', () => {
  it('parses a $contains(...) with two arguments', () => {
    const blocks = findFunctionBlocks('$contains(#self.tags, "fire")');
    expect(blocks).toHaveLength(1);
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].name).toBe('contains');
    expect(blocks[0].args).toEqual(['#self.tags', '"fire"']);
  });

  it('is case-insensitive (name and $stringContains casing)', () => {
    const blocks = findFunctionBlocks('$STRINGCONTAINS(#self.name, "zodiac")');
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].name).toBe('stringContains');
  });

  it('parses $find(...) with its required trailing .projection', () => {
    const blocks = findFunctionBlocks('$find(#self.senses, #it.type == "darkvision").range');
    expect(blocks[0].error).toBeUndefined();
    expect(blocks[0].name).toBe('find');
    expect(blocks[0].projection).toBe('range');
    expect(blocks[0].raw).toBe('$find(#self.senses, #it.type == "darkvision").range');
  });

  it('flags $find(...) with no trailing projection as an error', () => {
    const blocks = findFunctionBlocks('$find(#self.senses, #it.type == "darkvision")');
    expect(blocks[0].error).toBe('missingProjection');
  });

  it('accepts $any(...) and $count(...) with one or two arguments', () => {
    const anyOne = findFunctionBlocks('$any(#self.senses)');
    const anyTwo = findFunctionBlocks('$any(#self.senses, #it.type == "darkvision")');
    const countOne = findFunctionBlocks('$count(#self.senses)');
    const countTwo = findFunctionBlocks('$count(#self.senses, #it.type == "darkvision")');
    expect(anyOne[0].error).toBeUndefined();
    expect(anyTwo[0].error).toBeUndefined();
    expect(countOne[0].error).toBeUndefined();
    expect(countTwo[0].error).toBeUndefined();
  });

  it('flags the wrong argument count as an error', () => {
    expect(findFunctionBlocks('$contains(#self.tags)')[0].error).toBe('argCount');
    expect(findFunctionBlocks('$stringContains(#self.name)')[0].error).toBe('argCount');
    expect(findFunctionBlocks('$any(#self.senses, a, b)')[0].error).toBe('argCount');
  });

  it('flags unbalanced parens as an error', () => {
    expect(findFunctionBlocks('$contains(#self.tags, "fire"')[0].error).toBe('unbalancedParens');
  });

  it('finds multiple independent blocks in one formula', () => {
    const blocks = findFunctionBlocks('$count(#self.senses)+$any(#self.tags)');
    expect(blocks).toHaveLength(2);
    expect(blocks[0].name).toBe('count');
    expect(blocks[1].name).toBe('any');
  });

  it('escaping the $ prevents the block from being recognized at all', () => {
    expect(findFunctionBlocks('\\$contains(#self.tags, "fire")')).toHaveLength(0);
  });
});

describe('resolveFormula — $contains(...) primitive array membership', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        tags: {
          type: 'array',
          accessPath: 'system.tags',
          arrayElement: { kind: 'primitive', type: 'string' },
        } as FieldAspect,
      },
    },
  };

  it('resolves true when the array contains the value', () => {
    const docMap = { self: { system: { tags: ['fire', 'magic'] } } };
    expect(resolveFormula('$contains(#self.tags, "fire")', schema, docMap as never)).toBe('true');
  });

  it('resolves false when the array does not contain the value', () => {
    const docMap = { self: { system: { tags: ['fire', 'magic'] } } };
    expect(resolveFormula('$contains(#self.tags, "cold")', schema, docMap as never)).toBe('false');
  });

  it('resolves false when the array is missing from context', () => {
    const docMap = { self: { system: {} } };
    expect(resolveFormula('$contains(#self.tags, "fire")', schema, docMap as never)).toBe('false');
  });

  it('resolves an operand that is itself a #context.property reference', () => {
    const schemaWithName: FamiliarSchema = {
      self: {
        properties: {
          tags: schema.self.properties.tags,
          favoriteTag: { type: 'string', accessPath: 'system.favoriteTag' } as FieldAspect,
        },
      },
    };
    const docMap = { self: { system: { tags: ['fire', 'magic'], favoriteTag: 'magic' } } };
    expect(resolveFormula('$contains(#self.tags, #self.favoriteTag)', schemaWithName, docMap as never)).toBe('true');
  });
});

describe('resolveFormula — #it predicate over an object array', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        senses: {
          type: 'array',
          accessPath: 'system.senses',
          arrayElement: {
            kind: 'object',
            elementFields: {
              type: new foundry.data.fields.StringField(),
              range: new foundry.data.fields.NumberField(),
            },
            elementAccessPath: 'senses.element',
            localizationPrefixes: [],
          },
        } as FieldAspect,
      },
    },
  };
  const docMap = {
    self: {
      system: {
        senses: [
          { type: 'darkvision', range: 60 },
          { type: 'blindsense', range: 30 },
        ],
      },
    },
  };

  it('$contains(...) with a #it predicate matches an object array element', () => {
    expect(
      resolveFormula('$contains(#self.senses, #it.type == "darkvision")', schema, docMap as never)
    ).toBe('true');
    expect(
      resolveFormula('$contains(#self.senses, #it.type == "tremorsense")', schema, docMap as never)
    ).toBe('false');
  });

  it('$contains(...) with a compound && predicate', () => {
    expect(
      resolveFormula(
        '$contains(#self.senses, #it.type == "darkvision" && #it.range > 40)',
        schema,
        docMap as never
      )
    ).toBe('true');
    expect(
      resolveFormula(
        '$contains(#self.senses, #it.type == "darkvision" && #it.range > 100)',
        schema,
        docMap as never
      )
    ).toBe('false');
  });

  it('$contains(...) with a compound || predicate', () => {
    expect(
      resolveFormula(
        '$contains(#self.senses, #it.type == "tremorsense" || #it.type == "blindsense")',
        schema,
        docMap as never
      )
    ).toBe('true');
  });

  it('$any(...) with a #it predicate', () => {
    expect(
      resolveFormula('$any(#self.senses, #it.range > 40)', schema, docMap as never)
    ).toBe('true');
    expect(
      resolveFormula('$any(#self.senses, #it.range > 100)', schema, docMap as never)
    ).toBe('false');
  });

  it('$any(...) with no predicate — non-empty check', () => {
    expect(resolveFormula('$any(#self.senses)', schema, docMap as never)).toBe('true');
    expect(resolveFormula('$any(#self.tags)', schema, { self: { system: {} } } as never)).toBe('false');
  });

  it('$count(...) with a #it predicate counts matching elements', () => {
    expect(
      resolveFormula('$count(#self.senses, #it.range >= 30)', schema, docMap as never)
    ).toBe('2');
    expect(
      resolveFormula('$count(#self.senses, #it.range > 40)', schema, docMap as never)
    ).toBe('1');
  });

  it('$count(...) with no predicate — array length', () => {
    expect(resolveFormula('$count(#self.senses)', schema, docMap as never)).toBe('2');
  });

  it('$find(...) with a #it predicate projects a field off the matched element', () => {
    expect(
      resolveFormula('$find(#self.senses, #it.type == "darkvision").range', schema, docMap as never)
    ).toBe('60');
  });

  it('$find(...) resolves to an empty string when no element matches', () => {
    expect(
      resolveFormula('$find(#self.senses, #it.type == "tremorsense").range', schema, docMap as never)
    ).toBe('');
  });

  it('predicate can reference outer contexts alongside #it', () => {
    const schemaWithThreshold: FamiliarSchema = {
      self: {
        properties: {
          ...schema.self.properties,
          rangeThreshold: { type: 'number', accessPath: 'system.rangeThreshold' } as FieldAspect,
        },
      },
    };
    const docMapWithThreshold = {
      self: { ...docMap.self, system: { ...docMap.self.system, rangeThreshold: 40 } },
    };
    expect(
      resolveFormula(
        '$count(#self.senses, #it.range > #self.rangeThreshold)',
        schemaWithThreshold,
        docMapWithThreshold as never
      )
    ).toBe('1');
  });

  it('a nested $stringContains(...) inside a predicate resolves via recursive composition', () => {
    expect(
      resolveFormula(
        '$count(#self.senses, $stringContains(#it.type, "dark"))',
        schema,
        docMap as never
      )
    ).toBe('1');
  });
});

describe('resolveFormula — $stringContains(...)', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        name: { type: 'string', accessPath: 'name' } as FieldAspect,
      },
    },
  };

  it('resolves true for a case-sensitive substring match', () => {
    const docMap = { self: { name: 'Ring of the Zodiac' } };
    expect(resolveFormula('$stringContains(#self.name, "zodiac")', schema, docMap as never)).toBe('false');
    expect(resolveFormula('$stringContains(#self.name, "Zodiac")', schema, docMap as never)).toBe('true');
  });

  it('resolves false when the substring is absent', () => {
    const docMap = { self: { name: 'Longsword' } };
    expect(resolveFormula('$stringContains(#self.name, "Zodiac")', schema, docMap as never)).toBe('false');
  });
});

describe('findFunctionBlocks — $fromFeet(...)/$fromMeters(...) parsing', () => {
  it('parses both names case-insensitively with a single argument', () => {
    const fromFeet = findFunctionBlocks('$fromFeet(60)')[0];
    const fromMeters = findFunctionBlocks('$FROMMETERS(9)')[0];
    expect(fromFeet.error).toBeUndefined();
    expect(fromFeet.name).toBe('fromFeet');
    expect(fromFeet.args).toEqual(['60']);
    expect(fromMeters.error).toBeUndefined();
    expect(fromMeters.name).toBe('fromMeters');
    expect(fromMeters.args).toEqual(['9']);
  });

  it('flags the wrong argument count as an error', () => {
    expect(findFunctionBlocks('$fromFeet(60, 30)')[0].error).toBe('argCount');
    expect(findFunctionBlocks('$fromMeters(9, 3)')[0].error).toBe('argCount');
  });
});

describe('resolveFormula — $fromFeet(...)/$fromMeters(...) unit conversion', () => {
  const schema: FamiliarSchema = { self: { properties: {} } };
  const docMap = { self: {} };

  it('converts an exact multiple of 5 feet into whole squares', () => {
    expect(resolveFormula('$fromFeet(60)', schema, docMap as never)).toBe('12');
  });

  it('converts an exact multiple of 1.5 meters into whole squares', () => {
    expect(resolveFormula('$fromMeters(9)', schema, docMap as never)).toBe('6');
  });

  it('rounds a non-exact conversion to 2 decimal places', () => {
    // 7 ft / 5 = 1.4 exactly; 2 m / 1.5 = 1.3333... -> rounds to 1.33
    expect(resolveFormula('$fromFeet(7)', schema, docMap as never)).toBe('1.4');
    expect(resolveFormula('$fromMeters(2)', schema, docMap as never)).toBe('1.33');
  });

  it('resolves a nested sub-formula argument', () => {
    const nestedSchema: FamiliarSchema = {
      self: { properties: { speed: { type: 'number', accessPath: 'system.speed' } as FieldAspect } },
    };
    const nestedDocMap = { self: { system: { speed: 60 } } };
    expect(resolveFormula('$fromFeet(#self.speed)', nestedSchema, nestedDocMap as never)).toBe('12');
  });

  it('resolves to 0 for a non-numeric operand rather than throwing', () => {
    expect(resolveFormula('$fromFeet("abc")', schema, docMap as never)).toBe('0');
  });
});

describe('findFunctionBlocks — $fromKg(...) parsing', () => {
  it('parses the name case-insensitively with a single argument', () => {
    const fromKg = findFunctionBlocks('$FROMKG(10)')[0];
    expect(fromKg.error).toBeUndefined();
    expect(fromKg.name).toBe('fromKg');
    expect(fromKg.args).toEqual(['10']);
  });

  it('flags the wrong argument count as an error', () => {
    expect(findFunctionBlocks('$fromKg(10, 5)')[0].error).toBe('argCount');
  });
});

describe('resolveFormula — $fromKg(...) unit conversion', () => {
  const schema: FamiliarSchema = { self: { properties: {} } };
  const docMap = { self: {} };

  it('converts kilograms into pounds', () => {
    expect(resolveFormula('$fromKg(10)', schema, docMap as never)).toBe('20');
  });

  it('rounds a non-exact conversion to 2 decimal places', () => {
    expect(resolveFormula('$fromKg(2.005)', schema, docMap as never)).toBe('4.01');
  });

  it('resolves a nested sub-formula argument', () => {
    const nestedSchema: FamiliarSchema = {
      self: { properties: { weight: { type: 'number', accessPath: 'system.weight' } as FieldAspect } },
    };
    const nestedDocMap = { self: { system: { weight: 10 } } };
    expect(resolveFormula('$fromKg(#self.weight)', nestedSchema, nestedDocMap as never)).toBe('20');
  });

  it('resolves to 0 for a non-numeric operand rather than throwing', () => {
    expect(resolveFormula('$fromKg("abc")', schema, docMap as never)).toBe('0');
  });
});

describe('findFunctionBlocks — $localize(...)/$l(...) parsing', () => {
  it('parses both the full name and the short alias with a single argument', () => {
    const localize = findFunctionBlocks('$localize(dnd35e.Some.Key)')[0];
    const short = findFunctionBlocks('$l(dnd35e.Some.Key)')[0];
    expect(localize.error).toBeUndefined();
    expect(localize.name).toBe('localize');
    expect(localize.args).toEqual(['dnd35e.Some.Key']);
    expect(short.error).toBeUndefined();
    expect(short.name).toBe('localize');
    expect(short.args).toEqual(['dnd35e.Some.Key']);
  });

  it('flags the wrong argument count as an error', () => {
    expect(findFunctionBlocks('$localize(a, b)')[0].error).toBe('argCount');
  });
});

describe('resolveFormula — $localize(...)/$l(...)', () => {
  const schema: FamiliarSchema = { self: { properties: {} } };
  const docMap = { self: {} };
  const originalLocalize = game.i18n.localize.bind(game.i18n);

  it('resolves a bare (unquoted) key via game.i18n.localize', () => {
    game.i18n.localize = ((key: string) => (key === 'dnd35e.Some.Key' ? 'Some Value' : key)) as typeof game.i18n.localize;
    try {
      expect(resolveFormula('$localize(dnd35e.Some.Key)', schema, docMap as never)).toBe('Some Value');
      expect(resolveFormula('$l(dnd35e.Some.Key)', schema, docMap as never)).toBe('Some Value');
    } finally {
      game.i18n.localize = originalLocalize;
    }
  });

  it('resolves a quoted literal key the same way as a bare key', () => {
    game.i18n.localize = ((key: string) => (key === 'dnd35e.Some.Key' ? 'Some Value' : key)) as typeof game.i18n.localize;
    try {
      expect(resolveFormula('$localize("dnd35e.Some.Key")', schema, docMap as never)).toBe('Some Value');
    } finally {
      game.i18n.localize = originalLocalize;
    }
  });

  it('resolves a nested #context.property key', () => {
    const nestedSchema: FamiliarSchema = {
      self: { properties: { labelKey: { type: 'string', accessPath: 'system.labelKey' } as FieldAspect } },
    };
    const nestedDocMap = { self: { system: { labelKey: 'dnd35e.Some.Key' } } };
    game.i18n.localize = ((key: string) => (key === 'dnd35e.Some.Key' ? 'Some Value' : key)) as typeof game.i18n.localize;
    try {
      expect(resolveFormula('$localize(#self.labelKey)', nestedSchema, nestedDocMap as never)).toBe('Some Value');
    } finally {
      game.i18n.localize = originalLocalize;
    }
  });

  it('builds the key from a literal prefix plus an interpolated #context.property segment', () => {
    const schema: FamiliarSchema = {
      thisAttack: { properties: { type: { type: 'string', accessPath: 'type' } as FieldAspect } },
    };
    const docMap = { thisAttack: { type: 'melee_weapon_attack' } };
    game.i18n.localize = ((key: string) =>
      (key === 'dnd35e.WEAPON.ACTIONS.Type.melee_weapon_attack' ? 'Melee Attack' : key)) as typeof game.i18n.localize;
    try {
      expect(resolveFormula(
        '$localize(dnd35e.WEAPON.ACTIONS.Type.#thisAttack.type)',
        schema,
        docMap as never
      )).toBe('Melee Attack');
    } finally {
      game.i18n.localize = originalLocalize;
    }
  });
});

describe('findFunctionBlocks — $scaleDamage(...) parsing', () => {
  it('parses the name case-insensitively with a single argument', () => {
    const block = findFunctionBlocks('$SCALEDAMAGE(1d6)')[0];
    expect(block.error).toBeUndefined();
    expect(block.name).toBe('scaleDamage');
    expect(block.args).toEqual(['1d6']);
  });

  it('flags the wrong argument count as an error', () => {
    expect(findFunctionBlocks('$scaleDamage(1d6, large)')[0].error).toBe('argCount');
  });
});

describe('resolveFormula — $scaleDamage(...) size scaling', () => {
  const schema: FamiliarSchema = {
    self: { properties: {} },
    weapon: { properties: {} },
    thisAttack: { properties: {} },
  };

  it('scales the die up for a Large weapon', () => {
    const docMap = { self: { system: { designedForSize: 'large' } }, weapon: { system: { designedForSize: 'large' } }, thisAttack: {} };
    expect(resolveFormula('$scaleDamage(1d6)', schema, docMap as never)).toBe('1d8');
  });

  it('scales the die down for a Small weapon', () => {
    const docMap = { self: { system: { designedForSize: 'small' } }, weapon: { system: { designedForSize: 'small' } }, thisAttack: {} };
    expect(resolveFormula('$scaleDamage(1d6)', schema, docMap as never)).toBe('1d4');
  });

  it('leaves the die unscaled when no weapon/self context has a designedForSize', () => {
    const docMap = { thisAttack: {} };
    expect(resolveFormula('$scaleDamage(1d6)', schema, docMap as never)).toBe('1d6');
  });

  it('resolves a nested sub-formula argument', () => {
    const nestedSchema: FamiliarSchema = {
      self: { properties: { die: { type: 'string', accessPath: 'system.die' } as FieldAspect } },
      weapon: { properties: {} },
      thisAttack: { properties: {} },
    };
    const nestedDocMap = {
      self: { system: { die: '1d8', designedForSize: 'large' } },
      weapon: { system: { designedForSize: 'large' } },
      thisAttack: {},
    };
    expect(resolveFormula('$scaleDamage(#self.die)', nestedSchema, nestedDocMap as never)).toBe('2d6');
  });
});

describe('validateFormula — $scaleDamage(...) is action-only', () => {
  it('flags $scaleDamage(...) as an error when no thisAttack context is present', () => {
    const schema: FamiliarSchema = { self: { properties: {} } };
    const errors = validateFormula('$scaleDamage(1d6)', schema);
    expect(errors.some(e => e.severity === 'error')).toBe(true);
  });

  it('does not flag $scaleDamage(...) when a thisAttack context is present', () => {
    const schema: FamiliarSchema = { self: { properties: {} }, thisAttack: { properties: {} } };
    const errors = validateFormula('$scaleDamage(1d6)', schema);
    expect(errors.filter(e => e.severity === 'error')).toHaveLength(0);
  });
});

describe('resolveFormula — backward compatibility', () => {
  it('a formula with zero function blocks is untouched', () => {
    const schema: FamiliarSchema = { self: { properties: {} } };
    expect(resolveFormula('2d6+3', schema, {} as never)).toBe('2d6+3');
  });

  it('composes with $conditional(...)', () => {
    const schema: FamiliarSchema = {
      self: {
        properties: {
          tags: {
            type: 'array',
            accessPath: 'system.tags',
            arrayElement: { kind: 'primitive', type: 'string' },
          } as FieldAspect,
        },
      },
    };
    const docMap = { self: { system: { tags: ['fire'] } } };
    const resolved = resolveFormula(
      '$conditional(when($contains(#self.tags, "fire"), 2d6) else(1d6))',
      schema,
      docMap as never
    );
    expect(resolved).toBe('2d6');
  });
});

describe('validateFormula — $function(...) structural errors', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        tags: {
          type: 'array',
          accessPath: 'system.tags',
          arrayElement: { kind: 'primitive', type: 'string' },
        } as FieldAspect,
        senses: {
          type: 'array',
          accessPath: 'system.senses',
          arrayElement: {
            kind: 'object',
            elementFields: { type: new foundry.data.fields.StringField() },
            elementAccessPath: 'senses.element',
            localizationPrefixes: [],
          },
        } as FieldAspect,
      },
    },
  };

  it('does not flag a well-formed $contains(...) as an error', () => {
    const errors = validateFormula('$contains(#self.tags, "fire")', schema);
    expect(errors.filter(e => e.severity === 'error')).toHaveLength(0);
  });

  it('surfaces a structural error for a missing $find(...) projection', () => {
    const errors = validateFormula('$find(#self.senses, #it.type == "darkvision")', schema);
    expect(errors.some(e => e.severity === 'error')).toBe(true);
  });

  it('surfaces a structural error for unbalanced parens', () => {
    const errors = validateFormula('$contains(#self.tags, "fire"', schema);
    expect(errors.some(e => e.severity === 'error')).toBe(true);
  });

  it('does not flag #it.* inside a well-formed predicate as an unknown context', () => {
    const errors = validateFormula('$contains(#self.senses, #it.type == "darkvision")', schema);
    expect(errors.filter(e => e.severity === 'error')).toHaveLength(0);
  });

  it('does not flag #it.* across $find/$any/$count predicates alike', () => {
    expect(
      validateFormula('$find(#self.senses, #it.type == "darkvision").type', schema)
        .filter(e => e.severity === 'error')
    ).toHaveLength(0);
    expect(
      validateFormula('$any(#self.senses, #it.type == "darkvision")', schema)
        .filter(e => e.severity === 'error')
    ).toHaveLength(0);
    expect(
      validateFormula('$count(#self.senses, #it.type == "darkvision")', schema)
        .filter(e => e.severity === 'error')
    ).toHaveLength(0);
  });

  it('flags an unknown #it.* property inside a predicate', () => {
    const errors = validateFormula('$contains(#self.senses, #it.bogus == "x")', schema);
    expect(errors.some(e => e.severity === 'error')).toBe(true);
  });

  it('flags a stray #it.* outside any predicate as an unknown context', () => {
    const errors = validateFormula('#it.type', schema);
    expect(errors.some(e => e.severity === 'error')).toBe(true);
  });

  it('flags #it.* used inside $stringContains(...), which has no predicate', () => {
    const errors = validateFormula('$stringContains(#self.tags, #it.type)', schema);
    expect(errors.some(e => e.severity === 'error')).toBe(true);
  });
});

describe('resolveItAutocompleteContext — caret-scoped #it autocomplete', () => {
  const schema: FamiliarSchema = {
    self: {
      properties: {
        tags: {
          type: 'array',
          accessPath: 'system.tags',
          arrayElement: { kind: 'primitive', type: 'string' },
        } as FieldAspect,
        senses: {
          type: 'array',
          accessPath: 'system.senses',
          arrayElement: {
            kind: 'object',
            elementFields: {
              type: new foundry.data.fields.StringField(),
              range: new foundry.data.fields.NumberField(),
            },
            elementAccessPath: 'senses.element',
            localizationPrefixes: [],
          },
        } as FieldAspect,
      },
    },
  };

  it('offers an #it context once the caret is past the array-reference argument', () => {
    const formula = '$contains(#self.senses, #it.';
    const context = resolveItAutocompleteContext(formula, formula.length, schema);
    expect(context).not.toBeNull();
    expect(Object.keys(context!.properties)).toEqual(expect.arrayContaining(['type', 'range']));
  });

  it('does not offer #it while the caret is still inside the array-reference argument', () => {
    const formula = '$contains(#self.se';
    expect(resolveItAutocompleteContext(formula, formula.length, schema)).toBeNull();
  });

  it('does not offer #it for a primitive-element array', () => {
    const formula = '$contains(#self.tags, ';
    expect(resolveItAutocompleteContext(formula, formula.length, schema)).toBeNull();
  });

  it('does not offer #it inside $stringContains(...), which has no predicate', () => {
    const formula = '$stringContains(#self.tags, ';
    expect(resolveItAutocompleteContext(formula, formula.length, schema)).toBeNull();
  });

  it('does not offer #it outside of any function call', () => {
    const formula = 'plain text ';
    expect(resolveItAutocompleteContext(formula, formula.length, schema)).toBeNull();
  });

  it('offers #it for $find/$any/$count alike', () => {
    for (const name of ['find', 'any', 'count']) {
      const formula = `$${name}(#self.senses, #it.`;
      const context = resolveItAutocompleteContext(formula, formula.length, schema);
      expect(context).not.toBeNull();
    }
  });

  it('scopes #it to the correct nested call when multiple calls are present', () => {
    const formula = '$count(#self.tags) + $any(#self.senses, #it.';
    const context = resolveItAutocompleteContext(formula, formula.length, schema);
    expect(context).not.toBeNull();
    expect(Object.keys(context!.properties)).toEqual(expect.arrayContaining(['type', 'range']));
  });
});
