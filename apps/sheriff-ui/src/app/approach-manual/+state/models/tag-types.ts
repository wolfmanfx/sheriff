/**
 * Shared tag-related type aliases for the manual approach SignalStore.
 *
 * These are purely compile-time helpers to reduce repeated `Record<string, string[]>`
 * noise across features and keep feature typing consistent.
 */

export type Tag = string;

export type TagList = Tag[];

export type TagsByPathRel = Record<string, TagList>;
