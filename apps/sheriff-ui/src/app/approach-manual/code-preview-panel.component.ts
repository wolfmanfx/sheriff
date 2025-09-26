import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CodeEditorComponent } from '../shared/code-editor.component';

@Component({
  selector: 'app-code-preview-panel',
  standalone: true,
  imports: [CommonModule, CodeEditorComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'contents',
  },
  templateUrl: './code-preview-panel.component.html',
})
export class CodePreviewPanelComponent {
  draft = input.required<string>();
  validating = input.required<boolean>();
  previewValid = input.required<boolean>();
  previewErrors = input.required<string[]>();
  draftDirty = input.required<boolean>();
  collapsed = input.required<boolean>();

  toggleCollapsed = output<void>();
  draftChange = output<string>();
}
