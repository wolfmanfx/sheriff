import { generateText, generateObject } from 'ai';
import type { LanguageModel } from 'ai';
import type { z } from 'zod/v3';

export interface LLMCallOptions {
  sessionId?: string;
  functionId?: string;
  state?: string;
}

export async function callLLM(
  model: LanguageModel,
  systemPrompt: string,
  userPrompt: string,
  _options?: LLMCallOptions,
): Promise<string> {
  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    temperature: 0.1,
  });

  return result.text;
}

export async function callLLMForStructuredOutput<T extends z.ZodType>(
  model: LanguageModel,
  systemPrompt: string,
  userPrompt: string,
  schema: T,
  _options?: LLMCallOptions,
): Promise<z.infer<T>> {
  const result = await generateObject({
    model,
    system: systemPrompt,
    prompt: userPrompt,
    schema,
    temperature: 0.1,
  });

  return result.object;
}

export function extractJSONFromResponse(response: string): string {
  const trimmed = response.trim();

  const jsonBlockMatch = trimmed.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1].trim();
  }

  const jsonObjectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (jsonObjectMatch && jsonObjectMatch[0]) {
    return jsonObjectMatch[0].trim();
  }

  const jsonArrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (jsonArrayMatch && jsonArrayMatch[0]) {
    return jsonArrayMatch[0].trim();
  }

  return trimmed;
}

export function parseJSONResponse<T>(response: string, fallback?: T): T {
  try {
    const jsonString = extractJSONFromResponse(response);
    return JSON.parse(jsonString) as T;
  } catch {
    if (fallback !== undefined) {
      return fallback;
    }
    throw new Error(
      `Failed to parse JSON from LLM response. Response was: ${response.substring(0, 200)}...`,
    );
  }
}

