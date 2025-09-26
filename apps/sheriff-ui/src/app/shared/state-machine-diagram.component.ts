import { Component, input, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

type State = 'INIT' | 'STRUCTURE' | 'DEPENDENCY_RULES' | 'DONE';

@Component({
  selector: 'app-state-machine-diagram',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="w-full p-4 flex justify-center items-center">
      <svg
        [attr.width]="width()"
        [attr.height]="height()"
        class="max-w-full h-auto transition-all duration-200"
        [attr.viewBox]="'0 0 ' + width() + ' ' + height()">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="3"
            orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#94a3b8" />
          </marker>
        </defs>
        @for (state of states(); track state.id; let i = $index) {
          <rect
            [attr.x]="state.x"
            [attr.y]="state.y"
            [attr.width]="state.width"
            [attr.height]="boxHeight"
            [attr.rx]="8"
            [class.drop-shadow-sm]="state.id === currentState()"
            class="transition-all duration-200"
            [attr.fill]="state.id === currentState() ? colors()[state.id].bg : '#f8fafc'"
            [attr.stroke]="state.id === currentState() ? colors()[state.id].border : '#cbd5e1'"
            [attr.stroke-width]="state.id === currentState() ? '2' : '1'"
          />
          <text
            [attr.x]="state.x + state.width / 2"
            [attr.y]="state.y + boxHeight / 2"
            [attr.fill]="state.id === currentState() ? colors()[state.id].text : '#475569'"
            text-anchor="middle"
            dominant-baseline="middle"
            class="text-xs font-sans pointer-events-none select-none"
            [attr.font-weight]="state.id === currentState() ? '600' : '500'">
            {{ state.label }}
          </text>
          @if (i < states().length - 1) {
            <line
              [attr.x1]="state.x + state.width"
              [attr.y1]="state.y + boxHeight / 2"
              [attr.x2]="states()[i + 1].x"
              [attr.y2]="states()[i + 1].y + boxHeight / 2"
              [attr.stroke]="getArrowColor(state.id, states()[i + 1].id)"
              [attr.stroke-width]="(state.id === currentState() || states()[i + 1].id === currentState()) ? '2' : '1.5'"
              marker-end="url(#arrowhead)"
              class="transition-[stroke-width] duration-200"
            />
          }
        }
      </svg>
    </div>
  `,
})
export class StateMachineDiagramComponent {
  readonly currentState = input<State>('INIT');

  protected readonly boxHeight = 50;
  private readonly spacing = 40;
  private readonly padding = 20;

  readonly colors = signal<Record<State, { bg: string; border: string; text: string }>>({
    INIT: { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af' },
    STRUCTURE: { bg: '#f3e8ff', border: '#9333ea', text: '#6b21a8' },
    DEPENDENCY_RULES: { bg: '#fed7aa', border: '#ea580c', text: '#9a3412' },
    DONE: { bg: '#dcfce7', border: '#16a34a', text: '#166534' },
  });

  private readonly stateWidths = signal<Record<State, number>>({
    INIT: 120,
    STRUCTURE: 120,
    DEPENDENCY_RULES: 180,
    DONE: 120,
  });

  private readonly stateLabels = signal<Record<State, string>>({
    INIT: 'INIT',
    STRUCTURE: 'STRUCTURE',
    DEPENDENCY_RULES: 'DEPENDENCY_RULES',
    DONE: 'DONE',
  });

  readonly width = computed(() => {
    let totalWidth = this.padding * 2;
    const states: State[] = ['INIT', 'STRUCTURE', 'DEPENDENCY_RULES', 'DONE'];
    for (let i = 0; i < states.length; i++) {
      totalWidth += this.stateWidths()[states[i]];
      if (i < states.length - 1) {
        totalWidth += this.spacing;
      }
    }
    return totalWidth;
  });

  readonly height = computed(() => this.boxHeight + this.padding * 2);

  readonly states = computed(() => {
    const states: State[] = ['INIT', 'STRUCTURE', 'DEPENDENCY_RULES', 'DONE'];
    let currentX = this.padding;
    return states.map((id) => {
      const width = this.stateWidths()[id];
      const state = {
        id,
        label: this.stateLabels()[id],
        x: currentX,
        y: this.padding,
        width,
      };
      currentX += width + this.spacing;
      return state;
    });
  });

  getArrowColor(fromState: State, toState: State): string {
    const current = this.currentState();
    if (fromState === current) {
      return this.colors()[fromState].border;
    }
    if (toState === current) {
      return this.colors()[toState].border;
    }
    return '#94a3b8';
  }
}

