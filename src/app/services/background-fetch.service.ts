import { Injectable, signal, inject } from '@angular/core';
import { LogService } from './log.service';

export interface BackgroundFetchRegistration {
  id: string;
  downloadTotal: number;
  downloaded: number;
  result: 'success' | 'failure' | 'pending';
  failureReason?: string;
}

export interface BackgroundFetchStats {
  totalFetches: number;
  successfulFetches: number;
  failedFetches: number;
  totalBytesDownloaded: number;
}

/**
 * Background Fetch Service
 * 
 * Gerencia downloads em background usando Background Fetch API.
 * Features:
 * - Download de arquivos grandes em background
 * - Funciona mesmo com app fechado
 * - Progress tracking
 * - Retry automático em caso de falha
 * - Notificações de progresso
 */
@Injectable({
  providedIn: 'root'
})
export class BackgroundFetchService {
  private readonly logService = inject(LogService);
  
  private readonly _activeFetches = signal<Map<string, BackgroundFetchRegistration>>(new Map());
  private readonly _stats = signal<BackgroundFetchStats>({
    totalFetches: 0,
    successfulFetches: 0,
    failedFetches: 0,
    totalBytesDownloaded: 0
  });

  readonly activeFetches = this._activeFetches.asReadonly();
  readonly stats = this._stats.asReadonly();

  private swRegistration: ServiceWorkerRegistration | null = null;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializar service
   */
  private async initialize(): Promise<void> {
    if (!('serviceWorker' in navigator)) {
      this.logService.warn('BackgroundFetchService', 'Service Worker not supported');
      return;
    }

    try {
      this.swRegistration = await navigator.serviceWorker.ready;
      this.logService.info('BackgroundFetchService', 'Service Worker ready');

      // Escutar mensagens do Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        this.handleServiceWorkerMessage(event.data);
      });

      // Carregar stats
      this.loadStats();
    } catch (error: any) {
      this.logService.error('BackgroundFetchService', 'Failed to initialize', error);
    }
  }

  /**
   * Verificar se Background Fetch é suportado
   */
  isSupported(): boolean {
    return 'BackgroundFetchManager' in window;
  }

  /**
   * Iniciar download em background
   */
  async startBackgroundFetch(
    id: string,
    urls: string[],
    options: {
      title?: string;
      icons?: { src: string; sizes: string; type: string }[];
      downloadTotal?: number;
    } = {}
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('Background Fetch not supported');
    }

    if (!this.swRegistration) {
      throw new Error('Service Worker not ready');
    }

    try {
      this.logService.info('BackgroundFetchService', 'Starting fetch', { id });

      // Criar requests
      const requests = urls.map(url => new Request(url));

      // Iniciar background fetch
      const registration = await (this.swRegistration as any).backgroundFetch.fetch(id, requests, {
        title: options.title || 'Downloading...',
        icons: options.icons || [
          {
            src: '/assets/icon/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          }
        ],
        downloadTotal: options.downloadTotal || 0
      });

      // Monitorar progresso
      this.monitorFetchProgress(registration);

      // Atualizar stats
      this._stats.update(s => ({
        ...s,
        totalFetches: s.totalFetches + 1
      }));

      this.saveStats();

    } catch (error: any) {
      this.logService.error('BackgroundFetchService', 'Failed to start', error);
      throw error;
    }
  }

  /**
   * Monitorar progresso de download
   */
  private async monitorFetchProgress(registration: any): Promise<void> {
    const fetchData: BackgroundFetchRegistration = {
      id: registration.id,
      downloadTotal: registration.downloadTotal,
      downloaded: registration.downloaded,
      result: 'pending',
    };

    this._activeFetches.update(fetches => {
      const newMap = new Map(fetches);
      newMap.set(registration.id, fetchData);
      return newMap;
    });

    // Atualizar progresso periodicamente
    const intervalId = setInterval(() => {
      const updated: BackgroundFetchRegistration = {
        id: registration.id,
        downloadTotal: registration.downloadTotal,
        downloaded: registration.downloaded,
        result: registration.result || 'pending',
        failureReason: registration.failureReason
      };

      this._activeFetches.update(fetches => {
        const newMap = new Map(fetches);
        newMap.set(registration.id, updated);
        return newMap;
      });

      // Parar monitoramento se completou
      if (registration.result !== '' && registration.result !== 'pending') {
        clearInterval(intervalId);
        this.handleFetchComplete(registration);
      }
    }, 1000);
  }

  /**
   * Tratar conclusão de fetch
   */
  private handleFetchComplete(registration: any): void {
    this.logService.info('BackgroundFetchService', 'Fetch complete', { id: registration.id, result: registration.result });

    // Atualizar stats
    this._stats.update(s => {
      const updates: Partial<BackgroundFetchStats> = {};

      if (registration.result === 'success') {
        updates.successfulFetches = s.successfulFetches + 1;
        updates.totalBytesDownloaded = s.totalBytesDownloaded + registration.downloaded;
      } else if (registration.result === 'failure') {
        updates.failedFetches = s.failedFetches + 1;
      }

      return { ...s, ...updates };
    });

    this.saveStats();

    // Remover de fetches ativos após 5 segundos
    setTimeout(() => {
      this._activeFetches.update(fetches => {
        const newMap = new Map(fetches);
        newMap.delete(registration.id);
        return newMap;
      });
    }, 5000);
  }

  /**
   * Tratar mensagem do Service Worker
   */
  private handleServiceWorkerMessage(data: any): void {
    switch (data.type) {
      case 'BACKGROUND_FETCH_SUCCESS':
        this.logService.debug('BackgroundFetchService', 'Success notification', { id: data.id });
        break;

      case 'BACKGROUND_FETCH_FAIL':
        this.logService.warn('BackgroundFetchService', 'Fail notification', { id: data.id });
        break;
    }
  }

  /**
   * Obter fetch ativo por ID
   */
  getFetch(id: string): BackgroundFetchRegistration | undefined {
    return this._activeFetches().get(id);
  }

  /**
   * Obter todas as fetches ativas
   */
  getActiveFetches(): BackgroundFetchRegistration[] {
    return Array.from(this._activeFetches().values());
  }

  /**
   * Cancelar fetch
   */
  async abortFetch(id: string): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service Worker not ready');
    }

    try {
      const registration = await (this.swRegistration as any).backgroundFetch.get(id);
      
      if (registration) {
        await registration.abort();
        this.logService.info('BackgroundFetchService', 'Aborted', { id });

        // Remover de fetches ativos
        this._activeFetches.update(fetches => {
          const newMap = new Map(fetches);
          newMap.delete(id);
          return newMap;
        });
      }
    } catch (error: any) {
      this.logService.error('BackgroundFetchService', 'Failed to abort', error);
      throw error;
    }
  }

  /**
   * Carregar stats do localStorage
   */
  private loadStats(): void {
    try {
      const stored = localStorage.getItem('medicamenta_background_fetch_stats');
      if (stored) {
        const stats = JSON.parse(stored);
        this._stats.set(stats);
      }
    } catch (error: any) {
      this.logService.error('BackgroundFetchService', 'Failed to load stats', error);
    }
  }

  /**
   * Salvar stats no localStorage
   */
  private saveStats(): void {
    try {
      const stats = this._stats();
      localStorage.setItem('medicamenta_background_fetch_stats', JSON.stringify(stats));
    } catch (error: any) {
      this.logService.error('BackgroundFetchService', 'Failed to save stats', error);
    }
  }

  /**
   * Formatar bytes
   */
  formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  /**
   * Obter progresso formatado
   */
  getProgress(id: string): { percent: number; downloaded: string; total: string } | null {
    const fetch = this.getFetch(id);
    if (!fetch) return null;

    const percent = fetch.downloadTotal > 0 
      ? Math.round((fetch.downloaded / fetch.downloadTotal) * 100)
      : 0;

    return {
      percent,
      downloaded: this.formatBytes(fetch.downloaded),
      total: this.formatBytes(fetch.downloadTotal)
    };
  }
}

