import { describe, expect, it } from 'vitest';
import { generateManualSheriffConfig, optimizeModuleTags } from './config-generator';

describe('generateManualSheriffConfig', () => {
  it('includes sameTag import when depRulesRaw contains sameTag function', () => {
    const content = generateManualSheriffConfig({
      options: { enableBarrelLess: true },
      originalModulesConfig: { 'libs/<domain>': ['domain:<domain>'] },
      modulesByPathRel: { 'libs/a': ['domain:auth'] },
      depRules: { 'domain:auth': ['domain:auth'] },
      depRulesRaw: { 'domain:auth': { kind: 'function', source: 'sameTag' } },
    });

    expect(content).toContain(`import { SheriffConfig, sameTag } from '@softarc/sheriff-core';`);
    expect(content).toMatchInlineSnapshot(`
"import { SheriffConfig, sameTag } from '@softarc/sheriff-core';

export const sheriffConfig: SheriffConfig = {
  enableBarrelLess: true,
  modules: {
    'libs/<domain>': ['domain:<domain>'],
    'libs/a': ['domain:auth'],
  },
  depRules: {
    'domain:auth': sameTag,
  },
};
"
`);
  });

  it('includes anyTag import when used in mixed rules', () => {
    const content = generateManualSheriffConfig({
      options: { enableBarrelLess: true },
      modulesByPathRel: {},
      depRules: { a: ['b', 'c'] },
      depRulesRaw: { a: { kind: 'mixed', tags: ['b'], functions: ['anyTag'] } },
    });

    expect(content).toContain(`import { SheriffConfig, anyTag } from '@softarc/sheriff-core';`);
    expect(content).toContain(`'a': [anyTag, 'b', 'c'],`);
  });

  it('keeps empty depRules arrays', () => {
    const content = generateManualSheriffConfig({
      options: { enableBarrelLess: false },
      modulesByPathRel: {},
      depRules: { 'type:model': [] },
    });

    expect(content).toContain(`enableBarrelLess: false,`);
    expect(content).toContain(`'type:model': [],`);
  });

  it('preserves helper imports from original config', () => {
    const originalConfig = `import { SheriffConfig, anyTag, sameTag } from '@softarc/sheriff-core';
export const sheriffConfig: SheriffConfig = { modules: {}, depRules: { 'root': anyTag } };`;

    const content = generateManualSheriffConfig({
      modulesByPathRel: {},
      depRules: { root: ['type:feature'] },
      originalConfig,
    });

    expect(content).toContain(`import { SheriffConfig, anyTag, sameTag } from '@softarc/sheriff-core';`);
  });

  it('preserves function-only dep rules not in static depRules', () => {
    const content = generateManualSheriffConfig({
      modulesByPathRel: { 'libs/auth': ['domain:auth'] },
      depRules: {},
      depRulesRaw: { 'domain:auth': { kind: 'function', source: 'sameTag' } },
    });

    expect(content).toContain(`import { SheriffConfig, sameTag } from '@softarc/sheriff-core';`);
    expect(content).toContain(`'domain:auth': sameTag,`);
  });

  it('preserves multiple function types alongside static rules', () => {
    const content = generateManualSheriffConfig({
      modulesByPathRel: {},
      depRules: { 'type:feature': ['type:data', 'type:ui'] },
      depRulesRaw: {
        'type:feature': { kind: 'static', tags: ['type:data', 'type:ui'] },
        'domain:auth': { kind: 'function', source: 'sameTag' },
        'domain:shared': { kind: 'function', source: 'anyTag' },
      },
    });

    expect(content).toContain(`import { SheriffConfig, anyTag, sameTag } from '@softarc/sheriff-core';`);
    expect(content).toContain(`'domain:auth': sameTag,`);
    expect(content).toContain(`'domain:shared': anyTag,`);
    expect(content).toContain(`'type:feature': ['type:data', 'type:ui'],`);
  });
});

describe('optimizeModuleTags', () => {
  it('normalizes tags (removes root, noTag, duplicates) and removes entries matching inferred', () => {
    // noTag filtered out, then matches inferred -> removed
    expect(optimizeModuleTags({ 'libs/a': ['noTag', 'domain:auth'] }, { 'libs/a': ['domain:auth'] })).toEqual({});

    // root filtered out, duplicates removed, differs from inferred -> kept
    expect(optimizeModuleTags({ 'libs/a': ['root', 'domain:auth', 'domain:auth'] }, { 'libs/a': [] })).toEqual({
      'libs/a': ['domain:auth'],
    });
  });

  it('keeps explicit noTag entries not present in inferred', () => {
    expect(optimizeModuleTags({ 'libs/a': ['noTag'] }, {})).toEqual({ 'libs/a': ['noTag'] });
  });

  it('handles multiple paths: removes matches, keeps differences, keeps missing from inferred', () => {
    const result = optimizeModuleTags(
      { 'libs/a': ['domain:auth'], 'libs/b': ['domain:core'], 'libs/c': ['domain:shared'] },
      { 'libs/a': ['domain:auth'], 'libs/b': ['domain:other'] },
    );

    expect(result).toEqual({ 'libs/b': ['domain:core'], 'libs/c': ['domain:shared'] });
  });
});
