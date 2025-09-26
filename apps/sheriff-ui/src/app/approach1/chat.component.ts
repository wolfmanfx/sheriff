import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormControl,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Chat } from '@ai-sdk/angular';
import { DefaultChatTransport } from 'ai';
import { AppStore } from '../api/store';
import { ChatInterfaceComponent } from '../shared/chat-interface.component';
import { StreamingIndicatorComponent } from '../chat/streaming-indicator.component';
import { ChatEmptyStateComponent } from '../shared/chat-empty-state.component';
import { MarkdownViewerComponent } from '../shared/markdown-viewer.component';
import { toFolderTreeFromMergedTree } from '../shared/to-folder-tree-from-merged-tree';
import { FolderNode } from '../module-renderer/+state/models/folder-node';
import { APPROACH1_EMPTY_STATE_EXAMPLES } from './example-prompts';

@Component({
  selector: 'app-approach1-chat',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ChatInterfaceComponent, StreamingIndicatorComponent, ChatEmptyStateComponent, MarkdownViewerComponent],
  templateUrl: './chat.component.html',
})
export class Approach1ChatComponent {
  private fb = inject(FormBuilder);
  protected appStore = inject(AppStore);

  public chat: Chat = new Chat({
    transport: new DefaultChatTransport({
      api: '/api/approach1/chat',
    }),
  });

  messages = computed(() => this.chat.messages);
  status = computed(() => this.chat.status);

  isStreaming = computed(() => {
    const currentStatus = this.status();
    return currentStatus === 'submitted' || currentStatus === 'streaming';
  });

  userInput = new FormControl('', Validators.required);

  mergedTree = computed((): FolderNode | null => {
    const merged = this.appStore.merged();
    return toFolderTreeFromMergedTree(
      typeof merged === 'object' ? merged : undefined,
    );
  });

  protected readonly emptyStateExamples = APPROACH1_EMPTY_STATE_EXAMPLES;

  protected onSendMessage(text: string): void {
    this.userInput.setValue('');
    this.chat.sendMessage(
      {
        text,
      },
      {},
    );
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

  protected useExamplePrompt(prompt: string): void {
    this.userInput.setValue(prompt);
    this.onSendMessage(prompt);
  }
}

