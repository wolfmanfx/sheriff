import { describe, expect, it } from 'vitest';
import { evaluateSheriffConfig, toSerializableDepRules } from './config-evaluator';

describe('config-evaluator', () => {
  describe('toSerializableDepRules', () => {
    it('handles function rules like sameTag and anyTag', () => {
      const configContent = `
import { SheriffConfig, sameTag, anyTag, noDependencies } from '@softarc/sheriff-core';

export const sheriffConfig: SheriffConfig = {
  enableBarrelLess: true,
  modules: {},
  depRules: {
    'domain:*': sameTag,
    'domain:shared': anyTag,
    'type:model': noDependencies,  // This is an empty array []
    'type:feature': ['type:data', 'type:ui'],
    'type:mixed': [sameTag, 'type:api'],
  },
};
`;

      const evaluated = evaluateSheriffConfig(configContent);
      const depRules = toSerializableDepRules(evaluated);

      expect(depRules).toBeDefined();
      expect(depRules!['domain:*']).toEqual({ kind: 'function', source: 'sameTag' });
      expect(depRules!['domain:shared']).toEqual({ kind: 'function', source: 'anyTag' });
      // noDependencies is [], so it becomes static with empty tags
      expect(depRules!['type:model']).toEqual({ kind: 'static', tags: [] });
      expect(depRules!['type:feature']).toEqual({ kind: 'static', tags: ['type:data', 'type:ui'] });
      expect(depRules!['type:mixed']).toEqual({
        kind: 'mixed',
        tags: ['type:api'],
        functions: ['sameTag'],
      });
    });

    it('preserves function rules through the full evaluation pipeline', () => {
      const configContent = `
import { SheriffConfig, sameTag } from '@softarc/sheriff-core';

export const sheriffConfig: SheriffConfig = {
  modules: {
    'src/app/<domain>': ['domain:<domain>'],
  },
  depRules: {
    'domain:auth': sameTag,
    'domain:shared': ['domain:*'],
  },
};
`;

      const evaluated = evaluateSheriffConfig(configContent);
      const depRules = toSerializableDepRules(evaluated);

      // sameTag should be preserved as a function
      expect(depRules!['domain:auth'].kind).toBe('function');
      expect(depRules!['domain:auth']).toEqual({ kind: 'function', source: 'sameTag' });
      
      // Static rules should still work
      expect(depRules!['domain:shared']).toEqual({ kind: 'static', tags: ['domain:*'] });
    });

    it('handles string-only depRules (single tag as string)', () => {
      const configContent = `
import { SheriffConfig } from '@softarc/sheriff-core';

export const sheriffConfig: SheriffConfig = {
  modules: {},
  depRules: {
    'root': 'noTag',
    'noTag': 'noTag',
  },
};
`;

      const evaluated = evaluateSheriffConfig(configContent);
      const depRules = toSerializableDepRules(evaluated);

      expect(depRules!['root']).toEqual({ kind: 'static', tags: ['noTag'] });
      expect(depRules!['noTag']).toEqual({ kind: 'static', tags: ['noTag'] });
    });
  });
});
