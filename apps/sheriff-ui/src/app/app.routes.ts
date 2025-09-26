import { Route } from '@angular/router';

export const appRoutes: Route[] = [
  {
    path: '',
    redirectTo: 'approach-manual',
    pathMatch: 'full',
  },
  {
    path: 'approach-manual',
    loadComponent: () =>
      import('./approach-manual/approach-manual.component').then(
        (m) => m.ApproachManualComponent,
      ),
  },
  {
    path: 'chat',
    loadComponent: () =>
      import('./chat/chat.component').then((m) => m.ChatComponent),
  },
  {
    path: 'debug',
    loadComponent: () =>
      import('./debug-playground/debug-playground.component').then((m) => m.DebugPlaygroundComponent),
  },
  {
    path: 'chat-approach1',
    loadComponent: () =>
      import('./approach1/chat.component').then((m) => m.Approach1ChatComponent),
  },
  {
    path: 'chat-approach2',
    loadComponent: () =>
      import('./approach2/chat.component').then((m) => m.Approach2ChatComponent),
  },
  // Named outlet route for popup modals
  {
    path: 'create-tag',
    outlet: 'popup',
    loadComponent: () =>
      import('./approach-manual/create-tag-modal.component').then(
        (m) => m.CreateTagModalComponent,
      ),
  },
  {
    path: '**',
    redirectTo: 'approach-manual',
  },
];
