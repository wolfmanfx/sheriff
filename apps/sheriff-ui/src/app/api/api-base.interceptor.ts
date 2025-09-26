/**
 * API Base Interceptor
 * Rewrites API request URLs to use the configured base URL.
 * This enables the UI to work both in normal browser context and VS Code webview.
 */
import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EnvironmentService } from '../core/environment.service';

/**
 * HTTP interceptor that prepends the API base URL to relative API requests.
 * Only affects requests starting with "/api".
 *
 * @param req - The outgoing HTTP request
 * @param next - The next handler in the chain
 * @returns Observable of the HTTP event
 */
export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  const env = inject(EnvironmentService);
  const apiBase = env.apiBaseUrl;

  if (apiBase && req.url.startsWith('/api')) {
    const rewrittenUrl = `${apiBase}${req.url}`;
    const clonedReq = req.clone({ url: rewrittenUrl });
    return next(clonedReq);
  }

  return next(req);
};
