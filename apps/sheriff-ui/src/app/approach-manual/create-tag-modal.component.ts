import { Component, computed, inject, signal, OnInit, ViewEncapsulation, AfterViewInit, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';

export interface TagCreatedEvent {
  tag: string;
}

@Component({
  selector: 'app-create-tag-modal',
  standalone: true,
  imports: [CommonModule],
  encapsulation: ViewEncapsulation.None,
  template: `
    <dialog #dialogRef class="modal modal-open">
      <div class="modal-box">
        <!-- Header -->
        <h3 class="text-lg font-bold">Create New Tag</h3>
        <p class="text-sm opacity-60 mt-1">
          Assigns the new tag to the selected module.
        </p>

        <!-- Body -->
        <div class="py-4 space-y-4">
          <!-- Kind Select -->
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text font-medium">Kind (prefix)</span>
            </label>
            <select
              class="select select-bordered w-full"
              [value]="newTagKind()"
              (change)="newTagKind.set($any($event.target).value)"
            >
              @for (kind of detectedTagKinds(); track kind) {
                <option [value]="kind">{{ kind }}</option>
              }
              <option value="custom">(custom - no prefix)</option>
            </select>
          </div>

          <!-- Value Input -->
          <div class="form-control w-full">
            <label class="label">
              <span class="label-text font-medium">Value</span>
            </label>
            <input
              #tagInput
              data-testid="modal-new-tag-input"
              type="text"
              class="input input-bordered w-full"
              placeholder="e.g. auth, users, core"
              [value]="newTagValue()"
              (input)="newTagValue.set($any($event.target).value || '')"
              (keydown.enter)="confirmCreate()"
              autofocus
            />
          </div>

          <!-- Preview -->
          <div class="bg-base-200 rounded-lg px-4 py-3">
            <span class="text-xs opacity-60">Preview: </span>
            <span class="font-mono text-sm font-semibold text-primary">
              {{ previewNewTag() }}
            </span>
          </div>
        </div>

        <!-- Footer / Actions -->
        <div class="modal-action">
          <button
            type="button"
            class="btn btn-ghost"
            (click)="close()"
          >
            Cancel
          </button>
          <button
            data-testid="modal-create-tag-btn"
            type="button"
            class="btn btn-primary"
            [disabled]="!newTagValue().trim()"
            (click)="confirmCreate()"
          >
            Create Tag
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button (click)="close()">close</button>
      </form>
    </dialog>
  `,
})
export class CreateTagModalComponent implements OnInit, AfterViewInit {
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  private dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialogRef');

  protected newTagKind = signal<string>('type');
  protected newTagValue = signal('');
  protected detectedTagKinds = signal<string[]>(['type', 'domain', 'shared', 'feature', 'scope']);

  protected previewNewTag = computed(() => {
    const kind = this.newTagKind();
    const val = this.newTagValue().trim();
    if (!val) return '(enter a value)';
    return kind === 'custom' ? val : `${kind}:${val}`;
  });

  ngOnInit(): void {
    // Read initial data from query params
    const params = this.route.snapshot.queryParams;
    
    if (params['kinds']) {
      try {
        const kinds = JSON.parse(params['kinds']);
        if (Array.isArray(kinds) && kinds.length > 0) {
          this.detectedTagKinds.set(kinds);
          this.newTagKind.set(kinds[0]);
        }
      } catch {
        // Use defaults
      }
    }
  }

  ngAfterViewInit(): void {
    // Ensure the dialog is shown when component loads
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  }

  protected close(): void {
    const dialog = this.dialogRef()?.nativeElement;
    if (dialog) {
      dialog.close();
    }
    this.router.navigate([{ outlets: { popup: null } }], {
      relativeTo: this.route.parent,
      queryParamsHandling: 'preserve',
    });
  }

  protected confirmCreate(): void {
    const raw = this.newTagValue().trim();
    if (!raw) return;

    const kind = this.newTagKind();
    const tag = kind === 'custom' ? raw : `${kind}:${raw}`;

    // Dispatch custom event for parent to handle
    const event = new CustomEvent<TagCreatedEvent>('tagCreated', {
      bubbles: true,
      detail: { tag },
    });
    window.dispatchEvent(event);

    this.close();
  }
}
