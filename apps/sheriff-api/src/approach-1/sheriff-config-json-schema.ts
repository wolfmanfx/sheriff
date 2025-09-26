export const SHERIFF_CONFIG_JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'SheriffConfig',
  description: 'JSON Schema for Sheriff configuration file structure',
  type: 'object',
  required: ['depRules'],
  properties: {
    depRules: {
      type: 'object',
      description: 'Required. Dependency rules defining which tags can access which other tags',
      additionalProperties: {
        oneOf: [
          { type: 'string', description: 'Single allowed tag' },
          {
            type: 'array',
            description: 'Array of allowed tags or functions',
            items: {
              oneOf: [
                { type: 'string' },
                { type: 'null' },
                {
                  type: 'object',
                  description: 'Function (represented as object in JSON, but function in TypeScript)',
                },
              ],
            },
          },
          { type: 'null' },
          {
            type: 'object',
            description: 'Function (represented as object in JSON, but function in TypeScript)',
          },
        ],
      },
      examples: [
        {
          'domain:*': ['shared'],
          'type:feature': ['type:data', 'type:ui'],
          root: 'type:feature',
        },
      ],
    },
    modules: {
      type: 'object',
      description: 'Module configuration with path patterns and tags. Supports nested objects and placeholder syntax',
      additionalProperties: {
        oneOf: [
          { type: 'string', description: 'Single tag' },
          {
            type: 'array',
            description: 'Array of tags',
            items: { type: 'string' },
          },
          {
            type: 'object',
            description: 'Nested module configuration',
            additionalProperties: true,
          },
        ],
      },
      examples: [
        {
          'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>'],
          'src/app/shared/<type>': ['domain:shared', 'type:<type>'],
        },
      ],
    },
    entryFile: {
      type: 'string',
      description: 'Single entry file path for single-app projects. Mutually exclusive with entryPoints',
      examples: ['src/main.ts'],
    },
    entryPoints: {
      type: 'object',
      description: 'Named entry points for multi-app workspaces. Mutually exclusive with entryFile',
      additionalProperties: { type: 'string' },
      examples: [
        {
          app1: 'apps/app1/src/main.ts',
          lib1: 'libs/lib1/src/index.ts',
        },
      ],
    },
    autoTagging: {
      type: 'boolean',
      description: 'Automatically detect modules and tag them as noTag. Default: true',
      default: true,
    },
    enableBarrelLess: {
      type: 'boolean',
      description: 'Enable barrel-less modules with encapsulation folders. Recommended for tree-shaking. Default: false',
      default: false,
    },
    encapsulationPattern: {
      oneOf: [
        { type: 'string', description: 'Folder name pattern (e.g., "internal")' },
        {
          type: 'object',
          description: 'RegExp (represented as object in JSON, but RegExp in TypeScript)',
        },
      ],
      description: 'Pattern for encapsulated content in barrel-less modules. Default: "internal"',
      default: 'internal',
    },
    barrelFileName: {
      type: 'string',
      description: 'Barrel entry filename. Default: "index.ts"',
      default: 'index.ts',
    },
    excludeRoot: {
      type: 'boolean',
      description: 'Remove implicit root module from all checks. Default: false',
      default: false,
    },
    version: {
      type: 'number',
      description: 'Config schema version. Default: 1',
      default: 1,
    },
    log: {
      type: 'boolean',
      description: 'Enable internal logging to sheriff.log. Default: false',
      default: false,
    },
    ignoreFileExtensions: {
      oneOf: [
        {
          type: 'array',
          description: 'Array of file extensions to ignore',
          items: { type: 'string' },
        },
        {
          type: 'object',
          description: 'Function (represented as object in JSON, but function in TypeScript)',
        },
      ],
      description: 'Customize file extensions to ignore during traversal',
    },
    tagging: {
      type: 'object',
      description: 'Deprecated. Use modules instead',
      deprecated: true,
    },
    encapsulatedFolderNameForBarrelLess: {
      type: 'string',
      description: 'Deprecated. Use encapsulationPattern instead',
      deprecated: true,
    },
    showWarningOnBarrelCollision: {
      type: 'boolean',
      description: 'Deprecated. No warning is shown',
      deprecated: true,
    },
  },
  additionalProperties: false,
  examples: [
    {
      depRules: {
        root: 'noTag',
        noTag: ['noTag', 'root'],
      },
    },
    {
      entryFile: 'src/main.ts',
      modules: {
        'src/app/<domain>/<type>': ['domain:<domain>', 'type:<type>'],
      },
      depRules: {
        'domain:*': ['shared'],
        'type:feature': ['type:data', 'type:ui'],
        root: 'type:feature',
      },
    },
  ],
};

