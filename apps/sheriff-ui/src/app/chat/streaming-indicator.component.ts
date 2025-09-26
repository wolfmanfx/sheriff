import { Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Streaming Indicator Component
 * Displays loading indicator during streaming
 */
@Component({
  selector: 'app-streaming-indicator',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="inline-flex items-center gap-2.5 py-3 px-4 rounded-lg border border-blue-200/50 bg-blue-50/80 backdrop-blur-sm text-slate-900 text-xs w-fit mx-auto animate-pulse-gentle shadow-sm"
    >
      <div class="flex items-center gap-1">
        <span class="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style="animation-delay: 0s; animation-duration: 1.2s;"></span>
        <span class="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style="animation-delay: 0.2s; animation-duration: 1.2s;"></span>
        <span class="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style="animation-delay: 0.4s; animation-duration: 1.2s;"></span>
      </div>
      <span class="font-medium text-blue-900 animate-shimmer">{{ message() }}</span>
    </div>
  `,
})
export class StreamingIndicatorComponent {
  readonly message = input<string>('Generating response');
}






