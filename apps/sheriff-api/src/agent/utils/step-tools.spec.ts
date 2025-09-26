import { describe, expect, it } from 'vitest';
import { extractToolCalls, extractToolResults } from './step-tools';

describe('step-tools helpers', () => {
  it('extracts toolCalls/toolResults from legacy step shape', () => {
    const step = {
      toolCalls: [
        { toolName: 'uiState', input: { response: { type: 'confirmation' } } },
        { toolName: 'readConfig', args: { cwd: '/tmp/project' } },
      ],
      toolResults: [
        { toolName: 'readConfig', output: { content: 'config-content' } },
      ],
    };

    const calls = extractToolCalls(step);
    const results = extractToolResults(step);

    expect(calls.map((call) => call.toolName)).toEqual(['uiState', 'readConfig']);
    expect(results).toEqual([
      { toolName: 'readConfig', output: { content: 'config-content' } },
    ]);
  });

  it('extracts toolInvocations from modern step shape', () => {
    const step = {
      toolInvocations: [
        {
          toolName: 'readConfig',
          input: { cwd: '/tmp/project' },
          result: {
            output: { content: 'export const config = {};' },
          },
        },
        {
          call: {
            toolName: 'uiState',
            input: { response: { type: 'question' } },
          },
          result: {
            response: { type: 'question' },
          },
        },
      ],
    };

    const calls = extractToolCalls(step);
    const results = extractToolResults(step);

    expect(calls.map((call) => call.toolName)).toEqual(['readConfig', 'uiState']);
    expect(calls[0].input).toEqual({ cwd: '/tmp/project' });
    expect(calls[1].input).toEqual({ response: { type: 'question' } });

    expect(results).toEqual([
      { toolName: 'readConfig', output: { content: 'export const config = {};' } },
      { toolName: 'uiState', output: { response: { type: 'question' } } },
    ]);
  });

  it('handles missing data gracefully', () => {
    expect(extractToolCalls(undefined)).toEqual([]);
    expect(extractToolResults(undefined)).toEqual([]);
    expect(extractToolCalls({})).toEqual([]);
    expect(extractToolResults({})).toEqual([]);
  });
});



