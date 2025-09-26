/**
 * Environment Service
 * Centralizes all environment detection and configuration.
 * Handles VS Code webview detection and provides environment-specific values.
 */
import { Injectable } from '@angular/core';

/**
 * Service that provides environment-specific configuration.
 * Reads global variables once at construction and provides them via typed getters.
 *
 * In VS Code webview context, globals are injected by the extension.
 * In regular web context, globals are undefined and defaults are used.
 */
@Injectable({ providedIn: 'root' })
export class EnvironmentService {
  private readonly _isVsCodeWebview: boolean;
  private readonly _apiBaseUrl: string;
  private readonly _initialCwd: string | undefined;
  private readonly _initialEntry: string | undefined;

  constructor() {
    this._isVsCodeWebview = typeof globalThis.__SHERIFF_API_BASE__ !== 'undefined';
    this._apiBaseUrl = globalThis.__SHERIFF_API_BASE__ ?? '';
    this._initialCwd = globalThis.__SHERIFF_INITIAL_CWD__;
    this._initialEntry = globalThis.__SHERIFF_INITIAL_ENTRY__;
  }

  /**
   * Whether the app is running inside a VS Code webview.
   */
  get isVsCodeWebview(): boolean {
    return this._isVsCodeWebview;
  }

  /**
   * The API base URL.
   * In VS Code webview: absolute URL like "http://127.0.0.1:3012"
   * In regular web: empty string (uses relative URLs)
   */
  get apiBaseUrl(): string {
    return this._apiBaseUrl;
  }

  /**
   * Initial working directory path (VS Code webview only).
   * Set when user opens Sheriff from a specific folder.
   */
  get initialCwd(): string | undefined {
    return this._initialCwd;
  }

  /**
   * Initial entry file path (VS Code webview only).
   * Default entry point for analysis.
   */
  get initialEntry(): string | undefined {
    return this._initialEntry;
  }
}
