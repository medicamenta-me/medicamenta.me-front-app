import { Component, inject, OnInit, signal, computed } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { HeatmapService } from '../../services/heatmap.service';

/**
 * Heatmap Debug Component
 * Development tool to visualize user interactions
 * Only visible in development mode
 */
@Component({
  selector: 'app-heatmap-debug',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (isVisible()) {
      <div class="heatmap-debug-panel">
        <div class="panel-header">
          <h3>🔥 Heatmap Debug</h3>
          <button (click)="togglePanel()">
            {{ isPanelOpen() ? '−' : '+' }}
          </button>
        </div>

        @if (isPanelOpen()) {
          <div class="panel-content">
            <!-- Controls -->
            <div class="controls">
              @if (heatmapService.isTrackingActive()) {
                <button (click)="stopTracking()" class="btn-stop">
                  ⏸️ Pausar
                </button>
              } @else {
                <button (click)="startTracking()" class="btn-start">
                  ▶️ Iniciar
                </button>
              }
              <button (click)="clearSession()" class="btn-clear">
                🗑️ Limpar
              </button>
              <button (click)="exportData()" class="btn-export">
                💾 Exportar
              </button>
            </div>

            <!-- Statistics -->
            <div class="stats">
              <div class="stat-item">
                <span class="stat-label">Interações:</span>
                <span class="stat-value">{{ stats().totalInteractions }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Páginas:</span>
                <span class="stat-value">{{ stats().pages.length }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">Duração:</span>
                <span class="stat-value">{{ formatDuration(stats().sessionDuration) }}</span>
              </div>
            </div>

            <!-- Most Clicked Elements -->
            @if (stats().mostClickedElements.length > 0) {
              <div class="most-clicked">
                <h4>Elementos mais clicados:</h4>
                <ul>
                  @for (element of stats().mostClickedElements.slice(0, 5); track element.id) {
                    <li>
                      <span class="element-name">{{ element.id }}</span>
                      <span class="element-count">{{ element.count }}x</span>
                    </li>
                  }
                </ul>
              </div>
            }

            <!-- Heatmap Overlay Toggle -->
            <div class="overlay-toggle">
              <label>
                <input 
                  type="checkbox" 
                  [(ngModel)]="showOverlay"
                  (change)="toggleOverlay()">
                Mostrar pontos de calor
              </label>
            </div>
          </div>
        }
      </div>

      <!-- Heatmap Overlay (dots on screen) -->
      @if (showOverlay) {
        <div class="heatmap-overlay">
          @for (point of currentPagePoints(); track $index) {
            <div 
              class="heatmap-point"
              [style.left.px]="point.x"
              [style.top.px]="point.y"
              [title]="point.elementId || point.elementType || 'Unknown'">
            </div>
          }
        </div>
      }
    }
  `,
  styles: [`
    .heatmap-debug-panel {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 320px;
      background: rgba(0, 0, 0, 0.9);
      color: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .panel-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    .panel-header button {
      background: none;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 0;
      width: 32px;
      height: 32px;
    }

    .panel-content {
      padding: 16px;
    }

    .controls {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      flex-wrap: wrap;
    }

    .controls button {
      flex: 1;
      padding: 8px 12px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 500;
      transition: opacity 0.2s;
    }

    .controls button:hover {
      opacity: 0.8;
    }

    .btn-start {
      background: #10dc60;
      color: white;
    }

    .btn-stop {
      background: #ffce00;
      color: black;
    }

    .btn-clear {
      background: #f04141;
      color: white;
    }

    .btn-export {
      background: #3880ff;
      color: white;
    }

    .stats {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 16px;
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .stat-item:last-child {
      margin-bottom: 0;
    }

    .stat-label {
      opacity: 0.7;
    }

    .stat-value {
      font-weight: 600;
    }

    .most-clicked {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 8px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .most-clicked h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      opacity: 0.8;
    }

    .most-clicked ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .most-clicked li {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }

    .most-clicked li:last-child {
      border-bottom: none;
    }

    .element-name {
      opacity: 0.9;
      font-family: monospace;
      font-size: 12px;
    }

    .element-count {
      font-weight: 600;
      color: #10dc60;
    }

    .overlay-toggle {
      padding-top: 12px;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .overlay-toggle label {
      display: flex;
      align-items: center;
      cursor: pointer;
      user-select: none;
    }

    .overlay-toggle input {
      margin-right: 8px;
    }

    /* Heatmap Overlay */
    .heatmap-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 9999;
    }

    .heatmap-point {
      position: absolute;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: radial-gradient(circle, rgba(255, 0, 0, 0.8), rgba(255, 0, 0, 0.2));
      transform: translate(-50%, -50%);
      pointer-events: none;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: translate(-50%, -50%) scale(1);
        opacity: 0.8;
      }
      50% {
        transform: translate(-50%, -50%) scale(1.3);
        opacity: 0.4;
      }
    }
  `]
})
export class HeatmapDebugComponent implements OnInit {
  protected readonly heatmapService = inject(HeatmapService);

  // Panel state
  protected readonly isPanelOpen = signal<boolean>(true);
  protected readonly isVisible = signal<boolean>(true);
  protected showOverlay = false;

  // Statistics
  protected readonly stats = signal({
    totalInteractions: 0,
    pages: [] as string[],
    mostClickedElements: [] as { id: string; count: number }[],
    sessionDuration: 0
  });

  // Current page points
  protected readonly currentPagePoints = computed(() => {
    const currentPage = window.location.pathname;
    return this.heatmapService.getPageData(currentPage);
  });

  ngOnInit(): void {
    // Update stats every 2 seconds
    setInterval(() => {
      this.updateStats();
    }, 2000);

    // Hide in production
    if (this.isProduction()) {
      this.isVisible.set(false);
    }
  }

  private isProduction(): boolean {
    return window.location.hostname !== 'localhost' && 
           !window.location.hostname.includes('127.0.0.1');
  }

  protected togglePanel(): void {
    this.isPanelOpen.set(!this.isPanelOpen());
  }

  protected startTracking(): void {
    this.heatmapService.startTracking();
  }

  protected stopTracking(): void {
    this.heatmapService.stopTracking();
  }

  protected clearSession(): void {
    this.heatmapService.clearSession();
    this.updateStats();
  }

  protected exportData(): void {
    const json = this.heatmapService.exportSessionData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `heatmap-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  protected toggleOverlay(): void {
    // Showoverlay is already bound via ngModel
  }

  private updateStats(): void {
    this.stats.set(this.heatmapService.getStatistics());
  }

  protected formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
}
