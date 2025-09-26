import {
  Component,
  effect,
  inject,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import type { UIMessage } from 'ai';
import { AgentStore, type AgentContext } from '../api/agent.store';
import { AppStore } from '../api/store';
import {
  getAgentRoleFromMessage,
  getMessageAnnotations,
} from '../api/message-metadata';
import { ChatInterfaceComponent } from '../shared/chat-interface.component';
import { MarkdownViewerComponent } from '../shared/markdown-viewer.component';
import { ConfigDraftMessageComponent } from './config-draft-message.component';
import { ConfirmationResponseComponent } from './confirmation-response.component';
import { QuestionResponseComponent } from './question-response.component';
import { ProjectAnalysisViewerComponent } from './project-analysis-viewer.component';
import { MessageHeaderComponent } from './message-header.component';
import { ConfigBriefViewerComponent } from './config-brief-viewer.component';
import { ToolCallComponent } from './tool-call.component';
import { ChatEmptyStateComponent, type ExamplePrompt } from '../shared/chat-empty-state.component';
import { StreamingIndicatorComponent } from './streaming-indicator.component';
import {
  getConfigDraftPayload,
  getToolInfo,
  getTextFromPart,
  hasStructuredParts,
  getUserMessageContent,
  parseUiStateResponse,
  isSkippableUiPart,
} from '../api/message-parts';
import { toFolderTreeFromMergedTree } from '../shared/to-folder-tree-from-merged-tree';
import { FolderNode } from '../module-renderer/+state/models/folder-node';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ChatInterfaceComponent,
    MarkdownViewerComponent,
    ConfigDraftMessageComponent,
    ConfirmationResponseComponent,
    QuestionResponseComponent,
    ProjectAnalysisViewerComponent,
    MessageHeaderComponent,
    ConfigBriefViewerComponent,
    ToolCallComponent,
    ChatEmptyStateComponent,
    StreamingIndicatorComponent,
  ],
  templateUrl: './chat.component.html',
})
export class ChatComponent {
  protected agentStore = inject(AgentStore);
  protected appStore = inject(AppStore);

  protected userInput = new FormControl('');

  mergedTree = computed((): FolderNode | null => {
    const merged = this.appStore.merged();
    return toFolderTreeFromMergedTree(
      typeof merged === 'object' ? merged : undefined,
    );
  });

  // Expose utility functions for template access
  protected getAgentRoleFromMessage = getAgentRoleFromMessage;
  protected getMessageAnnotations = getMessageAnnotations;
  protected parseUiStateResponse = parseUiStateResponse;
  protected isSkippableUiPart = isSkippableUiPart;
  protected getConfigDraftPayload = getConfigDraftPayload;
  protected getToolInfo = getToolInfo;
  protected getTextFromPart = getTextFromPart;
  protected hasStructuredParts = hasStructuredParts;
  protected getUserMessageContent = getUserMessageContent;

  protected readonly emptyStateExamples: ExamplePrompt[] = [
    {
      title: 'Setup Configuration',
      description: 'Help me set up Sheriff for my project',
      prompt: `Help me set up Sheriff for my project.

Root directory: /Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv
Entry file: src/main.ts`,
      icon: '⚙️',
    },
    {
      title: 'Analyze Structure',
      description: 'Analyze my project structure and suggest module boundaries',
      prompt: `Analyze my project structure and suggest module boundaries.

Root directory: /Users/wolfmanfx/Dev/opensource/sheriff-ai/test-projects/angular-iv
Entry file: src/main.ts`,
      icon: '🔍',
    },
    {
      title: 'Generate Config',
      description: 'Generate a Sheriff config using Domain-Driven Design principles',
      prompt: 'Generate a Sheriff config using Domain-Driven Design principles',
      icon: '🏗️',
    },
    {
      title: 'Architecture Guide',
      description: 'What dependency rules should I use for a layered architecture?',
      prompt: 'What dependency rules should I use for a layered architecture?',
      icon: '📐',
    },
  ];

  constructor() {
    effect(() => {
      const isStreaming = this.agentStore.isStreaming();
      if (isStreaming) {
        this.userInput.disable({ emitEvent: false });
      } else {
        this.userInput.enable({ emitEvent: false });
      }
    });
  }

  protected useExamplePrompt(prompt: string): void {
    this.userInput.setValue(prompt);
    this.forwardTextToAgent(prompt);
  }

  protected handleStructuredResponse(text: string): void {
    this.forwardTextToAgent(text);
  }

  protected handleQuestionAnswer(answer: string | string[]): void {
    this.agentStore.sendQuestionAnswer(answer, this.buildAgentContext());
  }

  protected handleAgentAction(action: {
    type: string;
    label?: string;
    params?: Record<string, unknown>;
  }): void {
    void this.agentStore.handleAction(action, this.buildAgentContext());
  }

  protected forwardTextToAgent(text: string): void {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }
    this.userInput.setValue('');
    this.agentStore.sendMessage(trimmed, this.buildAgentContext());
  }

  private buildAgentContext(): AgentContext {
    return {
      cwd: this.appStore.cwd(),
      entry: this.appStore.entry(),
    };
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
    // Switch to graph tab to show the visualization
    this.appStore.setPreviewTab('graph');
  }

  protected closeCanvas(): void {
    this.appStore.toggleAssetView();
  }
}
