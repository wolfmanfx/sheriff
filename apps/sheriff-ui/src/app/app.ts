import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from './shared/header.component';
import { AppStore } from './api/store';
import { AgentStore } from './api/agent.store';

@Component({
  imports: [
    RouterModule,
    HeaderComponent,
  ],
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.html',
})
export class App {
  private store = inject(AppStore);
  private agentStore = inject(AgentStore);

  constructor() {
    // Listen for action events from chat component
    window.addEventListener('selectConfigAsset', () => {
      this.selectConfigAsset();
    });

    window.addEventListener('previewOrgChart', () => {
      this.previewOrgChart();
    });
  }

  private selectConfigAsset(): void {
    this.store.selectAsset({
      name: 'sheriff.config.ts',
      content: this.store.config(),
      type: 'typescript',
    });
  }

  private previewOrgChart(): void {
    if (!this.store.merged()) {
      this.store.analyzeMerged();
      setTimeout(() => {
        if (!this.store.showAssetView()) {
          this.store.toggleAssetView();
        }
        this.store.selectAsset({
          name: 'org-chart.json',
          content: '',
          type: 'json',
        });
      }, 1000);
    } else {
      if (!this.store.showAssetView()) {
        this.store.toggleAssetView();
      }
      this.store.selectAsset({
        name: 'org-chart.json',
        content: '',
        type: 'json',
      });
    }
  }
}
