import { describe, it, expect } from 'vitest';
import { ConfigValidator } from './config-validator';
import type { ConfigValidationError } from './types';

/**
 * Helper function to check if detailed validation errors contain runtime validation errors
 */
function hasDetailedRuntimeValidationErrors(errors: ConfigValidationError[]): boolean {
  const runtimeErrors = errors.filter((e) => {
    if (e.type !== 'runtime') return false;
    const msg = e.message.toLowerCase();
    return (
      msg.includes('config must') ||
      (msg.includes('deprules') && msg.includes('object')) ||
      msg.includes('autotagging') ||
      msg.includes('tagging') ||
      msg.includes('modules')
    );
  });
  return runtimeErrors.length > 0;
}

describe('ConfigValidator', () => {
  it('should validate a complete valid config with modules and depRules', () => {
    const content = `import { SheriffConfig, sameTag, noDependencies } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  modules: {
    'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>']
  },
  depRules: {
    'domain:*': sameTag,
    'type:feature': ['type:data', 'shared'],
    'type:model': noDependencies
  }
};`;
    const errors = ConfigValidator.validateDetailed(
      content,
      '/test/sheriff.config.ts',
      '/test',
    );
    const structureErrors = errors.filter((e) => e.type === 'structure');
    const semanticErrors = errors.filter((e) => e.type === 'semantic');
    expect(structureErrors).toHaveLength(0);
    expect(semanticErrors).toHaveLength(0);
    expect(hasDetailedRuntimeValidationErrors(errors)).toBe(false);
  });

  it('should validate a simple valid config with auto-tagging', () => {
    const content = `import { SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  depRules: {
    root: 'noTag',
    noTag: ['noTag', 'root']
  }
};`;
    const errors = ConfigValidator.validateDetailed(
      content,
      '/test/sheriff.config.ts',
      '/test',
    );
    const structureErrors = errors.filter((e) => e.type === 'structure');
    const semanticErrors = errors.filter((e) => e.type === 'semantic');
    expect(structureErrors).toHaveLength(0);
    expect(semanticErrors).toHaveLength(0);
    expect(hasDetailedRuntimeValidationErrors(errors)).toBe(false);
  });

  it('should validate a valid config with manual tagging', () => {
    const content = `import { SheriffConfig, sameTag } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  autoTagging: false,
  modules: {
    'src/app/holidays/feature': ['domain:holidays', 'type:feature'],
    'src/app/holidays/data': ['domain:holidays', 'type:data']
  },
  depRules: {
    'domain:holidays': ['domain:holidays'],
    'type:feature': 'type:data'
  }
};`;
    const errors = ConfigValidator.validateDetailed(
      content,
      '/test/sheriff.config.ts',
      '/test',
    );
    const structureErrors = errors.filter((e) => e.type === 'structure');
    const semanticErrors = errors.filter((e) => e.type === 'semantic');
    expect(structureErrors).toHaveLength(0);
    expect(semanticErrors).toHaveLength(0);
    expect(hasDetailedRuntimeValidationErrors(errors)).toBe(false);
  });

  it('should reject config with missing depRules', () => {
    const content = `import { SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  modules: {}
};`;
    const errors = ConfigValidator.validateDetailed(
      content,
      '/test/sheriff.config.ts',
      '/test',
    );
    expect(errors.some((e) => e.type === 'runtime' && e.message.includes('depRules'))).toBe(true);
  });

  it('should reject config with conflicting properties', () => {
    const content = `import { SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  tagging: {},
  modules: {},
  depRules: {}
};`;
    const errors = ConfigValidator.validateDetailed(
      content,
      '/test/sheriff.config.ts',
      '/test',
    );
    expect(errors.some((e) => e.type === 'semantic')).toBe(true);
  });

  it('should handle config with sameTag and noDependencies without TDZ errors', () => {
    const content = `import { noDependencies, sameTag, SheriffConfig } from '@softarc/sheriff-core';
export const config: SheriffConfig = {
  version: 1,
  entryFile: 'src/main.ts',
  modules: {
    'src/app': {
      'shared/<type>': ['shared', 'type:<type>'],
      '<domain>/<type>': ['domain:<domain>', 'type:<type>'],
      'bookings/+state': ['domain:bookings', 'type:state'],
      'bookings/overview': ['domain:bookings', 'type:feature'],
      'shell': 'root',
    },
  },
  depRules: {
    'root': ['type:feature', 'shared:*'],
    'domain:*': [sameTag, 'shared'],
    'type:feature': ['type:*', 'shared:*'],
    'type:data': ['type:model', 'shared:http', 'shared:ngrx-utils'],
    'type:ui': ['type:model', 'shared:form', 'shared:ui'],
    'type:api': ['type:model', 'shared'],
    'type:state': ['type:model', 'shared:ngrx-utils', 'shared'],
    'type:model': noDependencies,
    'shared': 'shared:*',
    '*': noDependencies,
  },
};`;
    const errors = ConfigValidator.validateDetailed(
      content,
      '/test/sheriff.config.ts',
      '/test',
    );
    // Should not have TDZ errors
    const tdzErrors = errors.filter((e) =>
      e.message.includes("Cannot access 'config' before initialization"),
    );
    expect(tdzErrors).toHaveLength(0);
    // Should validate successfully
    const structureErrors = errors.filter((e) => e.type === 'structure');
    const semanticErrors = errors.filter((e) => e.type === 'semantic');
    expect(structureErrors).toHaveLength(0);
    expect(semanticErrors).toHaveLength(0);
    expect(hasDetailedRuntimeValidationErrors(errors)).toBe(false);
  });

  it('should validate the actual angular-iv config file without TDZ errors', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path');
    const configPath = path.join(process.cwd(), 'test-projects/angular-iv/sheriff.config.ts');
    const content = fs.readFileSync(configPath, 'utf8');

    const errors = ConfigValidator.validateDetailed(
      content,
      configPath,
      path.dirname(configPath),
    );

    // Should not have TDZ errors
    const tdzErrors = errors.filter((e) =>
      e.message.includes("Cannot access 'config' before initialization"),
    );
    expect(tdzErrors).toHaveLength(0);

    // Log all errors for debugging
    if (errors.length > 0) {
      console.log('Validation errors:', JSON.stringify(errors, null, 2));
    }

    // Should validate successfully
    const structureErrors = errors.filter((e) => e.type === 'structure');
    const semanticErrors = errors.filter((e) => e.type === 'semantic');
    expect(structureErrors).toHaveLength(0);
    expect(semanticErrors).toHaveLength(0);
    expect(hasDetailedRuntimeValidationErrors(errors)).toBe(false);
  });
});

