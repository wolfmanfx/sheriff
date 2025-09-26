import type { Request, Response } from 'express';
import type { ManualService } from './manual.service';
import {
  InitRequestSchema,
  PreviewRequestSchema,
  GenerateRequestSchema,
  SaveRequestSchema,
  AddTagRequestSchema,
  RemoveTagRequestSchema,
  DeleteTagRequestSchema,
  ToggleDepRuleRequestSchema,
} from './models';

/**
 * Controller class for manual configuration HTTP endpoints.
 * Handles request parsing, validation, and response formatting.
 */
export class ManualController {
  constructor(private readonly service: ManualService) {}

  /**
   * POST /init - Initialize manual flow with current config
   */
  handleInit(req: Request, res: Response): void {
    try {
      const parsed = InitRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.format() });
        return;
      }
      const result = this.service.init(parsed.data);
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  /**
   * POST /init-default - Create default config and initialize
   */
  handleInitDefault(req: Request, res: Response): void {
    try {
      const parsed = InitRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.format() });
        return;
      }
      const result = this.service.initDefault(parsed.data);
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  /**
   * POST /preview - Generate preview from draft
   */
  handlePreview(req: Request, res: Response): void {
    try {
      const parsed = PreviewRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.format() });
        return;
      }
      const result = this.service.preview(parsed.data);
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  /**
   * POST /generate - Generate draft from modules and rules
   */
  handleGenerate(req: Request, res: Response): void {
    try {
      const parsed = GenerateRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.format() });
        return;
      }
      const result = this.service.generate(parsed.data);
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  /**
   * POST /save - Validate and save draft to disk
   */
  handleSave(req: Request, res: Response): void {
    try {
      const parsed = SaveRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.format() });
        return;
      }
      const result = this.service.save(parsed.data);
      if (!result.ok) {
        res.status(400).json(result);
        return;
      }
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  // ============================================================
  // MUTATION ENDPOINTS
  // ============================================================

  /**
   * POST /add-tag - Add a tag to a module
   */
  handleAddTag(req: Request, res: Response): void {
    try {
      const parsed = AddTagRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.format() });
        return;
      }
      const result = this.service.addTag(parsed.data);
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  /**
   * POST /remove-tag - Remove a tag from a module
   */
  handleRemoveTag(req: Request, res: Response): void {
    try {
      const parsed = RemoveTagRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.format() });
        return;
      }
      const result = this.service.removeTag(parsed.data);
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  /**
   * POST /delete-tag-everywhere - Delete a tag from all modules and dep rules
   */
  handleDeleteTagEverywhere(req: Request, res: Response): void {
    try {
      const parsed = DeleteTagRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.format() });
        return;
      }
      const result = this.service.deleteTagEverywhere(parsed.data);
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  }

  /**
   * POST /toggle-dep-rule - Toggle a dependency rule
   */
  handleToggleDepRule(req: Request, res: Response): void {
    try {
      const parsed = ToggleDepRuleRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.format() });
        return;
      }
      const result = this.service.toggleDepRule(parsed.data);
      res.json(result);
    } catch (e: unknown) {
      res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
    }
  }
}
