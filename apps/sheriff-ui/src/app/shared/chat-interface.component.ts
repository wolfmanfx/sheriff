import {
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl } from '@angular/forms';
import { PreviewPanelComponent } from './preview-panel.component';
import { BlobBackgroundComponent } from './blob-background.component';
import { FolderNode } from '../module-renderer/+state/models/folder-node';

/**
 * Shared Chat Interface Component
 * Provides the look and feel of the chat interface with optional preview panel
 */
@Component({
  selector: 'app-chat-interface',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PreviewPanelComponent,
    BlobBackgroundComponent,
  ],
  styles: [`
    .chat-layout-container {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
    }
    .chat-main-container {
      position: relative;
      width: 100%;
      height: 100%;
      display: flex;
      transition: all 0.3s ease-in-out;
    }
    .chat-content {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      transition: width 0.3s ease-in-out;
      position: relative;
      z-index: 10;
    }
    .chat-main-container.with-panel .chat-content {
      width: 40%;
    }
    .chat-messages-container {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding: 1.5rem;
    }
    .chat-messages-scroll {
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding-right: 0.75rem;
      scroll-behavior: smooth;
      scrollbar-width: thin;
      scrollbar-color: rgba(148, 163, 184, 0.35) transparent;
    }
    .chat-messages-scroll::-webkit-scrollbar {
      width: 6px;
    }
    .chat-messages-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .chat-messages-scroll::-webkit-scrollbar-thumb {
      background-color: rgba(148, 163, 184, 0.35);
      border-radius: 3px;
    }
    .chat-messages-scroll::-webkit-scrollbar-thumb:hover {
      background-color: rgba(148, 163, 184, 0.5);
    }
    .chat-input-container {
      flex-shrink: 0;
      padding: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid rgba(226, 232, 240, 0.5);
      background: white;
      position: relative;
      z-index: 10;
    }
    :host-context([data-theme="dark"]) .chat-input-container {
      border-top-color: rgba(71, 85, 105, 0.5);
      background: rgb(15, 23, 42);
    }
    .chat-input-form {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .chat-input {
      flex: 1;
      background: white;
      border: 1px solid rgba(148, 163, 184, 0.35);
      border-radius: 9999px;
      padding: 0.875rem 1.25rem;
      font-size: 0.875rem;
      transition: all 0.2s;
      color: #1e293b;
    }
    :host-context([data-theme="dark"]) .chat-input {
      background: rgb(30, 41, 59);
      border-color: rgba(71, 85, 105, 0.5);
      color: #e2e8f0;
    }
    .chat-input:focus {
      outline: none;
      border-color: rgba(59, 130, 246, 0.6);
      box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.18);
      background: white;
    }
    :host-context([data-theme="dark"]) .chat-input:focus {
      background: rgb(30, 41, 59);
      border-color: rgba(99, 102, 241, 0.6);
      box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.2);
    }
    .chat-send-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      padding: 0.875rem 1.25rem;
      border-radius: 9999px;
      border: 0;
      background: linear-gradient(to right, rgb(37, 99, 235), rgb(79, 70, 229));
      color: rgb(241, 245, 249);
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
    }
    .chat-send-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    }
    .chat-send-button:disabled {
      opacity: 0.55;
      cursor: not-allowed;
      box-shadow: none;
    }
    .preview-panel-wrapper {
      width: 60%;
      height: 100%;
      flex-shrink: 0;
      background: white;
      border-left: 1px solid #e5e7eb;
      box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.1);
      position: relative;
      z-index: 20;
      display: flex;
      overflow: hidden;
    }
    :host-context([data-theme="dark"]) .preview-panel-wrapper {
      background: rgb(15, 23, 42);
      border-left-color: #334155;
      box-shadow: -4px 0 6px -1px rgba(0, 0, 0, 0.4);
    }
  `],
  template: `
    <div class="chat-layout-container">
      <app-blob-background></app-blob-background>

      <div class="chat-main-container" [class.with-panel]="showPreviewPanel()">
        <div class="chat-content">
          <div class="chat-messages-container">
            <div class="chat-messages-scroll" #messagesContainer>
              <ng-content></ng-content>
            </div>
          </div>

          <div class="chat-input-container">
            <form class="chat-input-form" (submit)="onFormSubmit($event)">
              <input
                type="text"
                [formControl]="userInput()"
                [placeholder]="inputPlaceholder()"
                class="chat-input"
                (keydown.enter)="onEnterKey($event)"
              />
              <button
                type="button"
                class="chat-send-button"
                [disabled]="isStreaming() || !userInput().value?.trim()"
                (click)="onSendClick()"
              >
                <span class="text-xs tracking-wide">Send</span>
                <svg class="w-[18px] h-[18px]" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
                  <path d="M2.5 10.75l14-7a.75.75 0 011.05.84l-1.5 6a.75.75 0 01-.5.54l-5.33 1.62 3.52 4.7a.75.75 0 01-1.2.9l-4.5-6a.75.75 0 01.32-1.13l4.94-2.4-9.07 2.76a.75.75 0 01-.63-1.33z" fill="currentColor" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        @if (showPreviewPanel()) {
          <div class="preview-panel-wrapper">
            <app-preview-panel
              [mergedTree]="mergedTree()"
              [sessionData]="sessionData()"
              (onSaveRequested)="onSaveRequested.emit()"
              (onInitDefaultRequested)="onInitDefaultRequested.emit()"
              (onPreviewOrgChartRequested)="onPreviewOrgChartRequested.emit()"
              (onCloseRequested)="onCloseRequested.emit()">
            </app-preview-panel>
          </div>
        }
      </div>
    </div>
  `,
})
export class ChatInterfaceComponent {
  // Inputs
  readonly userInput = input.required<FormControl>();
  readonly isStreaming = input.required<boolean>();
  readonly showPreviewPanel = input<boolean>(false);
  readonly mergedTree = input<FolderNode | null>(null);
  readonly sessionData = input<any>(null);
  readonly inputPlaceholder = input<string>('Ask about Sheriff configuration or analysis goals...');
  readonly showEmptyState = input<boolean>(false);
  readonly emptyStateTemplate = input<any>(null); // TemplateRef

  // Outputs
  readonly sendMessage = output<string>();
  readonly enterKey = output<KeyboardEvent>();
  readonly saveRequested = output<void>();
  readonly initDefaultRequested = output<void>();
  readonly previewOrgChartRequested = output<void>();
  readonly closeRequested = output<void>();

  // Aliases for backwards compatibility
  readonly onSaveRequested = this.saveRequested;
  readonly onInitDefaultRequested = this.initDefaultRequested;
  readonly onPreviewOrgChartRequested = this.previewOrgChartRequested;
  readonly onCloseRequested = this.closeRequested;

  private messagesContainer = viewChild<ElementRef<HTMLDivElement>>('messagesContainer');

  constructor() {
    // Auto-scroll to bottom when messages change
    effect(() => {
      this.isStreaming();
      const container = this.messagesContainer();
      if (container?.nativeElement) {
        this.scrollToBottom(container.nativeElement);
      }
    });
  }

  protected onFormSubmit(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    this.onSendClick();
  }

  protected onEnterKey(event: Event): void {
    const keyboardEvent = event as KeyboardEvent;
    if (keyboardEvent.key === 'Enter' && !keyboardEvent.shiftKey) {
      keyboardEvent.preventDefault();
      keyboardEvent.stopPropagation();
      this.enterKey.emit(keyboardEvent);
      this.onSendClick();
    }
  }

  protected onSendClick(): void {
    const text = this.userInput().value ?? '';
    if (!text.trim() || this.isStreaming()) {
      return;
    }
    this.sendMessage.emit(text.trim());
  }

  private scrollToBottom(element: HTMLDivElement): void {
    element.scrollTop = element.scrollHeight;
  }
}

