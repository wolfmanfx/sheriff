import { Component, inject, computed, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Chat } from '@ai-sdk/angular';
import { DefaultChatTransport } from 'ai';
import { AppStore } from '../api/store';
import { ChatInterfaceComponent } from '../shared/chat-interface.component';
import { StreamingIndicatorComponent } from '../chat/streaming-indicator.component';
import { MarkdownViewerComponent } from '../shared/markdown-viewer.component';
import { ChatEmptyStateComponent } from '../shared/chat-empty-state.component';
import { toFolderTreeFromMergedTree } from '../shared/to-folder-tree-from-merged-tree';
import { FolderNode } from '../module-renderer/+state/models/folder-node';
import { approach2ExamplePrompts } from './example-prompts';

export interface SessionData {
  sessionId: string;
  state: 'INIT' | 'STRUCTURE' | 'DEPENDENCY_RULES' | 'DONE';
  cwd?: string;
  entry?: string;
  analysisResult?: unknown;
  data: {
    domains: string[];
    types: string[];
    hasShared: boolean;
    domainBasePath?: string;
    domainIsolation?: boolean;
    typeHierarchy?: Record<string, string[]>;
    sharedAccess?: boolean;
    rootAccess?: string[];
  };
}

@Component({
  selector: 'app-approach2-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChatInterfaceComponent, StreamingIndicatorComponent, MarkdownViewerComponent, ChatEmptyStateComponent],
  templateUrl: './chat.component.html',
})
export class Approach2ChatComponent {
  protected appStore = inject(AppStore);
  private http = inject(HttpClient);

  private sessionId = signal<string | null>(null);
  protected sessionData = signal<SessionData | null>(null);

  private getOrCreateSessionId(): string {
    const existing = this.sessionId();
    if (existing) {
      return existing;
    }
    const newSessionId = `session-${Date.now()}`;
    this.sessionId.set(newSessionId);
    return newSessionId;
  }

  public chat: Chat = new Chat({
    transport: new DefaultChatTransport({
      api: '/api/approach2/chat',
      fetch: async (url, options) => {
        const sessionId = this.getOrCreateSessionId();
        const body = options?.body ? JSON.parse(options.body as string) : {};
        body.sessionId = sessionId;
        return fetch(url, {
          ...options,
          body: JSON.stringify(body),
        });
      },
    }),
  });

  messages = computed(() => this.chat.messages);
  status = computed(() => this.chat.status);

  isStreaming = computed(() => {
    const currentStatus = this.status();
    return currentStatus === 'submitted' || currentStatus === 'streaming';
  });

  private previousStatus: string | null = null;
  private previousMessageCount = 0;

  constructor() {
    // Fetch session data after streaming completes
    effect(() => {
      const currentStatus = this.status();
      const sessionId = this.sessionId();
      const messageCount = this.messages().length;
      
      // Fetch session data when:
      // 1. Status transitions from streaming/submitted to idle, OR
      // 2. New messages are added (indicating a response completed)
      const statusChanged = this.previousStatus !== currentStatus;
      const messagesAdded = messageCount > this.previousMessageCount;
      
      if (sessionId && (statusChanged || messagesAdded)) {
        // Only fetch when not streaming and have new messages or status changed
        const isNotStreaming = currentStatus !== 'submitted' && currentStatus !== 'streaming';
        const wasStreaming = this.previousStatus === 'submitted' || this.previousStatus === 'streaming';
        
        if (isNotStreaming && (messagesAdded || (statusChanged && wasStreaming))) {
          this.fetchSessionData();
        }
      }
      
      this.previousStatus = currentStatus;
      this.previousMessageCount = messageCount;
    });
  }


  private fetchSessionData(): void {
    const sessionId = this.sessionId();
    if (!sessionId) {
      return;
    }

    this.http.get<SessionData>(`/api/approach2/session/${sessionId}`).subscribe({
      next: (data) => {
        this.sessionData.set(data);
      },
      error: (error) => {
        console.error('Failed to fetch session data:', error);
        // Don't set to null on error, keep previous data
      },
    });
  }

  userInput = new FormControl('', Validators.required);

  mergedTree = computed((): FolderNode | null => {
    const merged = this.appStore.merged();
    return toFolderTreeFromMergedTree(
      typeof merged === 'object' ? merged : undefined,
    );
  });

  protected readonly emptyStateExamples = approach2ExamplePrompts;

  protected onSendMessage(text: string): void {
    this.userInput.setValue('');
    this.chat.sendMessage(
      {
        text,
      },
      {},
    );
  }

  protected useExamplePrompt(prompt: string): void {
    this.userInput.setValue(prompt);
    this.onSendMessage(prompt);
  }

  protected saveConfig(): void {
    this.appStore.saveConfig();
  }

  protected initDefaultConfig(): void {
    this.appStore.initDefaultConfig();
  }

  protected async previewOrgChart(): Promise<void> {
    if (!this.appStore.showAssetView()) {
      this.appStore.toggleAssetView();
    }
    if (!this.appStore.merged()) {
      await this.appStore.analyzeMerged();
    }
    this.appStore.setPreviewTab('graph');
  }

  protected closeCanvas(): void {
    this.appStore.toggleAssetView();
  }

  protected resetSession(): void {
    this.sessionId.set(null);
    this.sessionData.set(null);
    // Clear chat messages by creating a new chat instance
    this.chat = new Chat({
      transport: new DefaultChatTransport({
        api: '/api/approach2/chat',
        fetch: async (url, options) => {
          const sessionId = this.getOrCreateSessionId();
          const body = options?.body ? JSON.parse(options.body as string) : {};
          body.sessionId = sessionId;
          return fetch(url, {
            ...options,
            body: JSON.stringify(body),
          });
        },
      }),
    });
  }
}

