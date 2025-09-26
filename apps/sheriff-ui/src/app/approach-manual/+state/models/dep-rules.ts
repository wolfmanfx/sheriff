export type SerializableDepRule =
  | { kind: 'static'; tags: string[] }
  | { kind: 'function'; source: string }
  | { kind: 'mixed'; tags: string[]; functions: string[] }
  | { kind: 'unknown'; type: string };

export type SerializableDepRules = Record<string, SerializableDepRule>;
