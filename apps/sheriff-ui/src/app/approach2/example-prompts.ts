import type { ExamplePrompt } from '../shared/chat-empty-state.component';

export const approach2ExamplePrompts: ExamplePrompt[] = [
  {
    title: 'Angular IV Project',
    description: 'test-projects/angular-iv',
    prompt: `This is an Angular project which follows domain-driven design.

Project Structure:
- Each domain is split up into modules: ui, domain, feature, and data
- Domains are located in src/app
- There is also a shared folder where each subdirectory represents a shared module

Project Details:
- Root dir: /Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv
- Main entry: src/main.ts`,
    icon: '📁',
  },
  {
    title: 'Angular III Project',
    description: 'test-projects/angular-iii',
    prompt: 'Hi the root dir is /Users/wolfmanfx/Development/opensource/sheriff/test-projects/angular-iii and the main entry is src/main.ts',
    icon: '📁',
  },
];

