import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { apiBaseInterceptor } from './api/api-base.interceptor';
import { provideRouter, withHashLocation } from '@angular/router';
import { appRoutes } from './app.routes';
import { isVsCodeWebview } from './api/api-base';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(appRoutes, ...(isVsCodeWebview() ? [withHashLocation()] : [])),
    provideHttpClient(withFetch(), withInterceptors([apiBaseInterceptor])),
  ],
};
