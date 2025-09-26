declare module 'zod-to-json-schema' {
  import type { ZodSchema } from 'zod/v3';

  export type JsonSchemaLike = Record<string, unknown> & {
    $schema?: string;
    definitions?: Record<string, unknown>;
  };

  export function zodToJsonSchema(schema: ZodSchema<unknown>, options?: unknown): JsonSchemaLike;
  export default zodToJsonSchema;
}

