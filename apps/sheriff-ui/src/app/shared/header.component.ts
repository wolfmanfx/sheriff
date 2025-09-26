import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AppStore } from '../api/store';
import { AgentStore } from '../api/agent.store';
import { ThemeService } from '../core/theme.service';
import { getSheriffAssetUrl } from './asset-url';

/**
 * Header Component
 * Displays the application header with logo, title, streaming indicator, and current directory
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div
      class="max-w-[1600px] mx-auto flex items-center justify-between px-5 py-3"
    >
      <div class="flex items-center gap-4">
        <div
          class="flex items-center justify-center rounded-xl bg-slate-900/5 dark:bg-white/10 ring-1 ring-slate-200/70 dark:ring-slate-700/70 p-1.5"
        >
          <img [src]="logoUrl" alt="Sheriff" class="w-9 h-9 md:w-10 md:h-10" />
        </div>
        <div class="flex flex-col leading-tight">
          <h1
            class="m-0 text-[15px] md:text-lg font-semibold tracking-tight text-slate-800 dark:text-slate-100"
          >
            Sheriff Assistant
          </h1>
          <span class="text-[11px] md:text-xs text-slate-500 dark:text-slate-400"
            >Module boundaries & dependency guardrails</span
          >
        </div>
      </div>
      <div class="flex grow justify-center">
        <div class="join">
          <a
            class="btn btn-sm join-item"
            routerLink="/approach-manual"
            routerLinkActive="btn-active"
            [routerLinkActiveOptions]="{ exact: true }"
            >Config Builder</a
          >
          <a
            class="btn btn-sm join-item"
            routerLink="/chat"
            routerLinkActive="btn-active"
            [routerLinkActiveOptions]="{ exact: true }"
            >Chat</a
          >
        </div>
      </div>
      @if (agentStore.isStreaming()) {
        <span
          class="ml-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] md:text-[12px] font-medium bg-indigo-600/12 dark:bg-indigo-400/20 text-indigo-800 dark:text-indigo-300 ring-1 ring-indigo-300/50 dark:ring-indigo-500/50"
        >
          <span
            class="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 animate-pulse"
          ></span>
          Thinking
        </span>
      }
      <div class="flex items-center gap-3 md:gap-4 text-xs text-slate-600 dark:text-slate-400">
        <button
          type="button"
          class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 dark:focus:ring-offset-slate-900 transition-colors"
          [class.bg-blue-50]="appStore.showAssetView()"
          [class.dark:bg-blue-900]="appStore.showAssetView()"
          [class.border-blue-300]="appStore.showAssetView()"
          [class.dark:border-blue-700]="appStore.showAssetView()"
          [class.text-blue-700]="appStore.showAssetView()"
          [class.dark:text-blue-300]="appStore.showAssetView()"
          (click)="appStore.toggleAssetView()"
          title="Toggle Preview Panel"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <span class="hidden md:inline">Preview</span>
        </button>
        <button
          type="button"
          class="inline-flex items-center justify-center w-9 h-9 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
          (click)="themeService.toggle()"
          [title]="themeService.theme() === 'light' ? 'Switch to dark mode' : 'Switch to light mode'"
        >
          <svg *ngIf="themeService.theme() === 'light'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
          <svg *ngIf="themeService.theme() === 'dark'" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </button>
        <span class="hidden md:inline text-slate-500 dark:text-slate-400 truncate max-w-[520px]">{{ appStore.cwd() }}</span>
      </div>
    </div>
  `,
  host: {
    class:
      'block w-full sticky top-0 z-20 bg-white/55 dark:bg-slate-900/80 backdrop-blur supports-backdrop-filter:bg-white/40 dark:supports-backdrop-filter:bg-slate-900/60 border-b border-slate-200/70 dark:border-slate-700/70 shadow-[0_2px_12px_rgba(15,23,42,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)]',
  },
})
export class HeaderComponent {
  protected appStore = inject(AppStore);
  protected agentStore = inject(AgentStore);
  protected themeService = inject(ThemeService);
  protected readonly logoUrl = getSheriffAssetUrl('logo.png');
}
