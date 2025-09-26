import { Router } from 'express';
import { ManualService } from './manual.service';
import { ManualController } from './manual.controller';

/**
 * Creates an Express router for manual configuration endpoints.
 * Uses the service/controller pattern for clean separation of concerns.
 */
export function createManualRouter(): Router {
  const router = Router();
  const service = new ManualService();
  const controller = new ManualController(service);

  // Init & Save
  router.post('/init', (req, res) => controller.handleInit(req, res));
  router.post('/init-default', (req, res) => controller.handleInitDefault(req, res));
  router.post('/preview', (req, res) => controller.handlePreview(req, res));
  router.post('/generate', (req, res) => controller.handleGenerate(req, res));
  router.post('/save', (req, res) => controller.handleSave(req, res));

  // Mutations (command-based)
  router.post('/add-tag', (req, res) => controller.handleAddTag(req, res));
  router.post('/remove-tag', (req, res) => controller.handleRemoveTag(req, res));
  router.post('/delete-tag-everywhere', (req, res) => controller.handleDeleteTagEverywhere(req, res));
  router.post('/toggle-dep-rule', (req, res) => controller.handleToggleDepRule(req, res));

  return router;
}
