/**
 * Response parsing utilities
 */
import { StructuredAgentResponseSchema } from '../schemas/structured-response';
import type { StructuredAgentResponse } from '../schemas/structured-response';

/**
 * Parse structured response from text
 */
export function tryParseStructuredResponse(
  text: string,
):
  | {
      success: true;
      text: StructuredAgentResponse['text'];
      actions: StructuredAgentResponse['actions'];
      data: StructuredAgentResponse['data'];
    }
  | { success: false } {
  if (!text) {
    return { success: false };
  }

  // Find the last fenced code block (```json ... ``` or ``` ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/gi;
  let match: RegExpExecArray | null = null;
  let lastMatch: RegExpExecArray | null = null;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    lastMatch = match;
  }

  if (!lastMatch) {
    console.log('[DEBUG] No code block found in text, trying raw JSON extraction');
    return { success: false };
  }

  console.log('[DEBUG] Found code block, content length:', lastMatch[1].length);
  console.log('[DEBUG] Code block content preview:', lastMatch[1].substring(0, 200));

  try {
    const parsed = JSON.parse(lastMatch[1]);
    console.log('[DEBUG] Successfully parsed JSON from code block');
    
    // Handle new format with response wrapper: { response: { type, text, data, actions } }
    if (parsed.response && typeof parsed.response === 'object') {
      console.log('[DEBUG] Found response wrapper, type:', parsed.response.type);
      const responseData = parsed.response as {
        type?: string;
        text?: string;
        data?: unknown;
        actions?: unknown;
      };
      // Extract text, actions, and data from response wrapper
      const structuredResponse = StructuredAgentResponseSchema.safeParse({
        text: responseData.text || '',
        actions: responseData.actions,
        data: responseData.data,
      });
      if (structuredResponse.success) {
        // Merge type into data object so UI can find it
        const dataWithType = structuredResponse.data.data && typeof structuredResponse.data.data === 'object'
          ? { ...structuredResponse.data.data, type: responseData.type }
          : (responseData.type ? { type: responseData.type } : structuredResponse.data.data);
        
        console.log('[DEBUG] Successfully parsed structured response with type:', responseData.type);
        return {
          success: true,
          text: structuredResponse.data.text,
          actions: structuredResponse.data.actions,
          data: dataWithType,
        };
      } else {
        console.log('[DEBUG] Structured response validation failed:', structuredResponse.error);
      }
    }
    
    // Handle legacy format: { text, actions, data }
    const structuredResponse = StructuredAgentResponseSchema.safeParse(parsed);
    if (structuredResponse.success) {
      console.log('[DEBUG] Successfully parsed legacy format');
      return {
        success: true,
        text: structuredResponse.data.text,
        actions: structuredResponse.data.actions,
        data: structuredResponse.data.data,
      };
    }

    console.log('[DEBUG] Structured response validation failed:', structuredResponse.error);
  } catch (error) {
    console.log('[DEBUG] Failed to parse structured response JSON:', (error as Error).message);
  }

  return { success: false };
}

/**
 * Fallback: parse raw JSON object (not fenced) from the text
 */
export function tryParseStructuredResponseFromRawJson(
  text: string,
):
  | {
      success: true;
      text: StructuredAgentResponse['text'];
      actions: StructuredAgentResponse['actions'];
      data: StructuredAgentResponse['data'];
    }
  | { success: false } {
  const trimmed = text.trim();

  // Helper to extract a balanced JSON object starting at a given index
  function extractBalancedJson(startIndex: number): string | null {
    let depth = 0;
    let inString = false;
    let prevChar: string | null = null;
    for (let i = startIndex; i < text.length; i++) {
      const ch = text[i];
      if (inString) {
        if (ch === '"' && prevChar !== '\\') {
          inString = false;
        }
      } else {
        if (ch === '"') {
          inString = true;
        } else if (ch === '{') {
          depth++;
        } else if (ch === '}') {
          depth--;
          if (depth === 0) {
            return text.slice(startIndex, i + 1);
          }
        }
      }
      prevChar = ch;
    }
    return null;
  }

  const candidates: string[] = [];

  // Case 1: whole text is a JSON object
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    candidates.push(trimmed);
  }

  // Case 2: find object containing a "text" key
  const textKeyIndex = text.lastIndexOf('"text"');
  if (textKeyIndex !== -1) {
    const braceStart = text.lastIndexOf('{', textKeyIndex);
    if (braceStart !== -1) {
      const obj = extractBalancedJson(braceStart);
      if (obj) candidates.push(obj);
    }
  }

  // Case 2b: find object containing a "response" key (new format)
  const responseKeyIndex = text.lastIndexOf('"response"');
  if (responseKeyIndex !== -1) {
    const braceStart = text.lastIndexOf('{', responseKeyIndex);
    if (braceStart !== -1) {
      const obj = extractBalancedJson(braceStart);
      if (obj) candidates.push(obj);
    }
  }

  // Case 3: last JSON-looking object in text
  const lastBrace = text.lastIndexOf('{');
  if (lastBrace !== -1) {
    const obj = extractBalancedJson(lastBrace);
    if (obj) candidates.push(obj);
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      
      // Handle new format with response wrapper: { response: { type, text, data, actions } }
      if (parsed.response && typeof parsed.response === 'object') {
        const responseData = parsed.response as {
          type?: string;
          text?: string;
          data?: unknown;
          actions?: unknown;
        };
        // Extract text, actions, and data from response wrapper
        const validated = StructuredAgentResponseSchema.safeParse({
          text: responseData.text || '',
          actions: responseData.actions,
          data: responseData.data,
        });
        if (validated.success) {
          // Merge type into data object so UI can find it
          const dataWithType = validated.data.data && typeof validated.data.data === 'object'
            ? { ...validated.data.data, type: responseData.type }
            : (responseData.type ? { type: responseData.type } : validated.data.data);
          
          return {
            success: true,
            text: validated.data.text,
            actions: validated.data.actions,
            data: dataWithType,
          };
        }
      }
      
      // Handle legacy format: { text, actions, data }
      const validated = StructuredAgentResponseSchema.safeParse(parsed);
      if (validated.success) {
        return {
          success: true,
          text: validated.data.text,
          actions: validated.data.actions,
          data: validated.data.data,
        };
      }
    } catch {
      // ignore and try next candidate
    }
  }

  return { success: false };
}

