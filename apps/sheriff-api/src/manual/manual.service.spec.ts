import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ManualService } from './manual.service';

// Mock the core module
vi.mock('../core', () => ({
  resolveCwd: vi.fn((cwd?: string) => cwd ?? '/mock/cwd'),
  readConfig: vi.fn(),
  writeConfig: vi.fn(() => ({ checksum: 'abc123' })),
  applyConfigPreview: vi.fn(() => ({
    cwd: '/mock/cwd',
    tree: { type: 'dir', name: 'src', pathRel: 'src', children: [], isSheriffModule: false },
    analysis: {},
    fileIdByPathRel: {},
    configValid: true,
  })),
}));

// Mock config-evaluator
vi.mock('../core/config-evaluator', () => ({
  evaluateSheriffConfig: vi.fn(() => ({})),
  toSerializableDepRules: vi.fn(() => ({})),
  toSerializableModules: vi.fn(() => undefined),
}));

// Mock config-operations
vi.mock('../core/config-operations', () => ({
  previewWriteConfig: vi.fn(() => ({ valid: true })),
}));

// Mock utils
vi.mock('./utils', () => ({
  optimizeModuleTags: vi.fn(() => ({ 'src/app': ['domain:app'] })),
  generateManualSheriffConfig: vi.fn(() => 'generated draft'),
  materializeModulesByPathRel: vi.fn(() => ({})),
  applyModulesToTree: vi.fn(),
}));

import { resolveCwd, readConfig, writeConfig, applyConfigPreview } from '../core';
import { toSerializableModules } from '../core/config-evaluator';
import { previewWriteConfig } from '../core/config-operations';
import { optimizeModuleTags, generateManualSheriffConfig, materializeModulesByPathRel } from './utils';

describe('ManualService', () => {
  let service: ManualService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ManualService();
  });

  describe('init', () => {
    it('returns init result with preview when config exists', () => {
      vi.mocked(readConfig).mockReturnValue({ content: 'existing config', checksum: 'abc' });

      const result = service.init({ cwd: '/test', entry: 'src/main.ts' });

      expect(resolveCwd).toHaveBeenCalledWith('/test');
      expect(readConfig).toHaveBeenCalledWith('/test');
      expect(applyConfigPreview).toHaveBeenCalledWith('existing config', 'src/main.ts', '/test');
      expect(result).toMatchObject({
        cwd: '/test',
        entry: 'src/main.ts',
        missingConfig: false,
        activeConfigContent: 'existing config',
        draft: 'existing config',
      });
      expect(result.preview).toBeDefined();
    });

    it('returns init result without preview when config is missing', () => {
      vi.mocked(readConfig).mockImplementation(() => {
        throw new Error('Config not found');
      });

      const result = service.init({ cwd: '/test' });

      expect(result.missingConfig).toBe(true);
      expect(result.activeConfigContent).toBe('');
      expect(result.preview).toBeUndefined();
    });

    it('uses default entry when not provided', () => {
      vi.mocked(readConfig).mockReturnValue({ content: 'config', checksum: 'abc' });

      const result = service.init({});

      expect(result.entry).toBe('src/main.ts');
    });
  });

  describe('initDefault', () => {
    it('creates default config and returns init result', () => {
      vi.mocked(readConfig).mockReturnValue({ content: 'default config content', checksum: 'abc' });

      const result = service.initDefault({ cwd: '/test', entry: 'src/main.ts' });

      expect(writeConfig).toHaveBeenCalled();
      expect(readConfig).toHaveBeenCalledWith('/test');
      expect(result.missingConfig).toBe(false);
      expect(result.preview).toBeDefined();
    });
  });

  describe('preview', () => {
    it('generates preview from draft', () => {
      const result = service.preview({
        draft: 'test draft',
        entry: 'src/main.ts',
        cwd: '/test',
      });

      expect(applyConfigPreview).toHaveBeenCalledWith('test draft', 'src/main.ts', '/test');
      expect(result).toBeDefined();
    });
  });

  describe('generate', () => {
    it('generates draft from input', () => {
      const input = {
        baseDraft: 'base',
        desiredModulesByPathRel: { 'src/app': ['domain:app'] },
        inferredModulesByPathRel: {},
        depRules: { 'domain:app': ['domain:app'] },
      };

      const result = service.generate(input);

      expect(optimizeModuleTags).toHaveBeenCalledWith(
        input.desiredModulesByPathRel,
        input.inferredModulesByPathRel,
      );
      expect(generateManualSheriffConfig).toHaveBeenCalled();
      expect(result.draft).toBe('generated draft');
    });
  });

  describe('save', () => {
    it('saves draft and returns success', () => {
      vi.mocked(previewWriteConfig).mockReturnValue({ valid: true });

      const result = service.save({ draft: 'test draft', cwd: '/test' });

      expect(previewWriteConfig).toHaveBeenCalledWith('test draft', '/test');
      expect(writeConfig).toHaveBeenCalledWith('/test', 'test draft');
      expect(result).toEqual({ ok: true, checksum: 'abc123' });
    });

    it('returns validation errors when draft is invalid', () => {
      vi.mocked(previewWriteConfig).mockReturnValue({
        valid: false,
        errors: ['Invalid syntax'],
      });

      const result = service.save({ draft: 'invalid', cwd: '/test' });

      expect(writeConfig).not.toHaveBeenCalled();
      expect(result).toEqual({ ok: false, errors: ['Invalid syntax'] });
    });
  });

  describe('addTag - sequential mutations', () => {
    it('should not lose first tag when adding a second tag to a different module', () => {
      // Simulate: 1st drag sets domain:bookings on src/booking,
      // 2nd drag sets domain:customer on src/customer.
      // The bug was that the 2nd addTag lost the booking entry because
      // optimizeModuleTags treated config-derived tags as "inferred" baseline.

      const baseDraft = 'config without modules';
      const draftAfterFirstTag = 'config with booking';

      // --- 1st addTag: domain:bookings → src/booking ---

      // Tree has both modules with noTag (no explicit config yet)
      vi.mocked(materializeModulesByPathRel).mockReturnValueOnce({
        'src/booking': ['noTag'],
        'src/customer': ['noTag'],
      });
      // No explicit modules in the original draft
      vi.mocked(toSerializableModules).mockReturnValueOnce(undefined);
      // generateManualSheriffConfig produces draft with booking tag
      vi.mocked(generateManualSheriffConfig).mockReturnValueOnce(draftAfterFirstTag);
      // 2nd buildPreviewContext call inside regenerateFromMutation for the returned preview
      vi.mocked(materializeModulesByPathRel).mockReturnValueOnce({
        'src/booking': ['domain:bookings'],
        'src/customer': ['noTag'],
      });
      vi.mocked(toSerializableModules).mockReturnValueOnce({
        patterns: {},
        explicit: { 'src/booking': ['domain:bookings'] },
      });

      service.addTag({
        draft: baseDraft,
        entry: 'src/main.ts',
        cwd: '/test',
        pathRel: 'src/booking',
        tag: 'domain:bookings',
      });

      // --- 2nd addTag: domain:customer → src/customer ---

      vi.clearAllMocks();

      // The tree (analyzed against the draft that has booking) shows booking with its tag
      vi.mocked(materializeModulesByPathRel).mockReturnValueOnce({
        'src/booking': ['domain:bookings'],
        'src/customer': ['noTag'],
      });
      // evaluateSheriffConfig sees booking as an explicit module in the draft
      vi.mocked(toSerializableModules).mockReturnValueOnce({
        patterns: {},
        explicit: { 'src/booking': ['domain:bookings'] },
      });
      vi.mocked(generateManualSheriffConfig).mockReturnValueOnce('config with both tags');
      // Preview after regeneration
      vi.mocked(materializeModulesByPathRel).mockReturnValueOnce({
        'src/booking': ['domain:bookings'],
        'src/customer': ['domain:customer'],
      });
      vi.mocked(toSerializableModules).mockReturnValueOnce({
        patterns: {},
        explicit: {
          'src/booking': ['domain:bookings'],
          'src/customer': ['domain:customer'],
        },
      });

      service.addTag({
        draft: draftAfterFirstTag,
        entry: 'src/main.ts',
        cwd: '/test',
        pathRel: 'src/customer',
        tag: 'domain:customer',
      });

      // The critical assertion: optimizeModuleTags must receive an inferredModulesByPathRel
      // that does NOT contain src/booking, because that tag came from the config, not
      // from the file structure. If it were present, optimizeModuleTags would strip
      // the booking entry from the generated config.
      const optimizeCalls = vi.mocked(optimizeModuleTags).mock.calls;
      const lastCall = optimizeCalls[optimizeCalls.length - 1];
      const [desiredModules, inferredModules] = lastCall;

      // desired should have BOTH modules
      expect(desiredModules['src/booking']).toEqual(['domain:bookings']);
      expect(desiredModules['src/customer']).toEqual(['domain:customer']);

      // inferred must NOT include src/booking (it was explicit in the config)
      expect(inferredModules).not.toHaveProperty('src/booking');
      // inferred should still have src/customer with its structural tag
      expect(inferredModules['src/customer']).toEqual(['noTag']);
    });
  });
});
