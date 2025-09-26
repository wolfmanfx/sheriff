/**
 * Bootstrap-time VS Code Detection
 *
 * This file provides a simple function for detecting VS Code webview context
 * at Angular bootstrap time (before dependency injection is available).
 *
 * For runtime use, inject EnvironmentService instead.
 * @see ../core/environment.service.ts
 */

/**
 * Checks if the app is running inside a VS Code webview.
 * Used only at bootstrap time (e.g., router configuration).
 *
 * For runtime code, inject EnvironmentService instead.
 *
 * @returns True if running in VS Code webview
 */
export function isVsCodeWebview(): boolean {
  return typeof globalThis.__SHERIFF_API_BASE__ !== 'undefined';
}
