import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * Blob Background Component
 * Displays an animated metaball/blob background effect
 */
@Component({
  selector: 'app-blob-background',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 -z-10 bg-gray-200 overflow-hidden">
      <div class="absolute inset-0 metaball-container">
        <div class="absolute blob blob-1"></div>
        <div class="absolute blob blob-2"></div>
        <div class="absolute blob blob-3"></div>
        <div class="absolute blob blob-4"></div>
        <div class="absolute blob blob-5"></div>
      </div>
    </div>
  `,
  styles: [`
    .metaball-container {
      filter: blur(40px) contrast(1.2);
      background: rgb(229, 231, 235);
    }
    :host-context([data-theme="dark"]) .metaball-container {
      background: rgb(30, 41, 59);
    }
    .blob {
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(147, 197, 253, 0.5), rgba(96, 165, 250, 0.4));
      filter: blur(20px);
    }
    :host-context([data-theme="dark"]) .blob {
      background: linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(79, 70, 229, 0.3));
    }
    .blob-1 {
      width: 300px;
      height: 300px;
      top: -50px;
      left: -50px;
      animation: blob-1-animation 25s ease-in-out infinite;
    }
    .blob-2 {
      width: 250px;
      height: 250px;
      top: 20%;
      right: 10%;
      background: linear-gradient(135deg, rgba(147, 197, 253, 0.5), rgba(96, 165, 250, 0.4));
      animation: blob-2-animation 30s ease-in-out infinite;
    }
    .blob-3 {
      width: 280px;
      height: 280px;
      bottom: 15%;
      left: 15%;
      background: linear-gradient(135deg, rgba(191, 219, 254, 0.5), rgba(147, 197, 253, 0.4));
      animation: blob-3-animation 28s ease-in-out infinite;
    }
    .blob-4 {
      width: 220px;
      height: 220px;
      bottom: 10%;
      right: 25%;
      background: linear-gradient(135deg, rgba(147, 197, 253, 0.45), rgba(96, 165, 250, 0.35));
      animation: blob-4-animation 32s ease-in-out infinite;
    }
    .blob-5 {
      width: 200px;
      height: 200px;
      top: 50%;
      left: 50%;
      background: linear-gradient(135deg, rgba(191, 219, 254, 0.45), rgba(147, 197, 253, 0.35));
      animation: blob-5-animation 26s ease-in-out infinite;
    }
    @keyframes blob-1-animation {
      0%, 100% { transform: translate(0, 0) scale(1); }
      33% { transform: translate(200px, 150px) scale(1.1); }
      66% { transform: translate(-100px, 200px) scale(0.9); }
    }
    @keyframes blob-2-animation {
      0%, 100% { transform: translate(0, 0) scale(1); }
      25% { transform: translate(-180px, 100px) scale(1.2); }
      50% { transform: translate(-100px, -150px) scale(0.8); }
      75% { transform: translate(150px, 50px) scale(1.1); }
    }
    @keyframes blob-3-animation {
      0%, 100% { transform: translate(0, 0) scale(1); }
      40% { transform: translate(150px, -200px) scale(1.15); }
      80% { transform: translate(-120px, -100px) scale(0.85); }
    }
    @keyframes blob-4-animation {
      0%, 100% { transform: translate(0, 0) scale(1); }
      30% { transform: translate(-200px, 180px) scale(1.1); }
      60% { transform: translate(100px, -120px) scale(0.9); }
    }
    @keyframes blob-5-animation {
      0%, 100% { transform: translate(0, 0) scale(1); }
      20% { transform: translate(120px, 150px) scale(1.2); }
      40% { transform: translate(-150px, 100px) scale(0.8); }
      60% { transform: translate(100px, -180px) scale(1.1); }
      80% { transform: translate(-80px, -100px) scale(0.95); }
    }
  `],
})
export class BlobBackgroundComponent {}

