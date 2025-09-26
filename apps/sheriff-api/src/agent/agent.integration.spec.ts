import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeDirectoryOnly,
  listDirectories,
  readConfigFile,
  previewWriteConfig,
} from '../core';
import { createSheriffToolClient } from './sheriff-tool-client';
import { createToolRegistry } from './tools';
import { sessionStore } from './session-store';
import * as path from 'path';

describe('MCP Handlers', () => {
  describe('FS Operations', () => {
    it('should list workspace directories', () => {
      const result = listDirectories(process.cwd());
      expect(result).toHaveProperty('entries');
      expect(Array.isArray(result.entries)).toBe(true);
    });

    it('should read config file', () => {
      const testProjectPath = path.join(
        process.cwd(),
        'test-projects',
        'typescript-i',
      );
      const result = readConfigFile(testProjectPath);
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('checksum');
    });

    it('should validate config preview write', () => {
      const testConfig = `export default {
        modules: {},
        tags: {},
        depRules: {},
      };`;
      const result = previewWriteConfig(testConfig);
      expect(result).toHaveProperty('valid');
      expect(result).toHaveProperty('checksum');
    });
  });

  describe('Sheriff Operations', () => {
    it('should analyze project', () => {
      const testProjectPath = path.join(
        process.cwd(),
        'test-projects',
        'typescript-i',
      );
      const result = analyzeDirectoryOnly('tsconfig.json', testProjectPath);
      expect(result).toHaveProperty('tree');
      expect(result).toHaveProperty('analysis');
      expect(result).toHaveProperty('cwd');
    });
  });
});

describe('MCP Client', () => {
  let toolClient: ReturnType<typeof createSheriffToolClient>;

  beforeEach(() => {
    // Client uses in-memory calls - no HTTP server needed
    toolClient = createSheriffToolClient();
  });

  it('should call fs_list tool', async () => {
    const result = await toolClient.call('fs_list', { cwd: process.cwd() });
    expect(result).toHaveProperty('entries');
  });

  it('should call config_read tool', async () => {
    const testProjectPath = path.join(
      process.cwd(),
      'test-projects',
      'typescript-i',
    );
    const result = await toolClient.call('config_read', { cwd: testProjectPath });
    expect(result).toHaveProperty('content');
    expect(result).toHaveProperty('checksum');
  });

  it('should throw error for unknown tool', async () => {
    await expect(
      toolClient.call('unknown.tool' as any, {}),
    ).rejects.toThrow('Invalid tool name');
  });
});

describe('Tool Registry', () => {
  let tools: ReturnType<typeof createToolRegistry>;

  beforeEach(() => {
    tools = createToolRegistry();
  });

  it('should have all required tools', () => {
    expect(tools).toHaveProperty('listWorkspaces');
    expect(tools).toHaveProperty('readConfig');
    expect(tools).toHaveProperty('writeConfigDraft');
    expect(tools).toHaveProperty('analyzeProject');
    expect(tools).toHaveProperty('computeAllowedMatrix');
    expect(tools).toHaveProperty('inspectModuleTags');
  });

  it('should have listWorkspaces tool with execute function', () => {
    const listWorkspacesTool = tools.listWorkspaces;
    expect(listWorkspacesTool).toBeDefined();
    expect(listWorkspacesTool).toHaveProperty('execute');
    expect(listWorkspacesTool).toHaveProperty('description');
  });
});

describe('Session Store', () => {
  beforeEach(() => {
    // Clear session store before each test by deleting known sessions
    // Note: sessionStore doesn't expose getAllSessions, so we'll create unique sessions
  });

  it('should create and retrieve sessions', () => {
    const sessionId = `test-session-${Date.now()}-1`;
    const session = sessionStore.createSession(sessionId);
    expect(session).toBeDefined();
    expect(session.sessionId).toBe(sessionId);

    const retrieved = sessionStore.getSession(sessionId);
    expect(retrieved).toBeDefined();
    expect(retrieved?.sessionId).toBe(sessionId);
  });

  it('should add messages to session', () => {
    const sessionId = `test-session-${Date.now()}-2`;
    sessionStore.createSession(sessionId);

    sessionStore.addMessage(sessionId, {
      role: 'user',
      content: 'Test message',
    });

    const session = sessionStore.getSession(sessionId);
    expect(session?.messages).toHaveLength(1);
    expect(session?.messages[0].content).toBe('Test message');
  });

  it('should store config brief', () => {
    const sessionId = `test-session-${Date.now()}-3`;
    sessionStore.createSession(sessionId);

    const brief = {
      targetRepo: '/test/repo',
      entryFile: 'tsconfig.json',
      architecturalGoals: ['Modularity'],
      constraints: [],
    };

    sessionStore.setBrief(sessionId, brief);
    const session = sessionStore.getSession(sessionId);
    expect(session?.brief).toEqual(brief);
  });
});

