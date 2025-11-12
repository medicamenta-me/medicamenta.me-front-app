import { Injectable, signal, inject } from '@angular/core';
import { CompressionService } from './compression.service';
import { LogService } from './log.service';

/**
 * IndexedDB Service - Gerencia armazenamento local robusto
 * 
 * Estrutura do banco:
 * - DB Name: medicamenta-db
 * - Version: 1
 * - Stores:
 *   - medications: Medicamentos do usuário
 *   - logs: Logs de atividades
 *   - users: Perfis de usuários
 *   - insights: Insights do dashboard
 *   - stats: Estatísticas calculadas
 *   - queue: Fila de operações offline
 * 
 * Features:
 * - Automatic data compression for large items
 * - Performance metrics tracking
 * - Cache hit/miss statistics
 */

export interface PerformanceMetrics {
  totalReads: number;
  totalWrites: number;
  cacheHits: number;
  cacheMisses: number;
  averageReadTime: number;
  averageWriteTime: number;
  compressionRatio: number;
  totalSpaceSaved: number;
}

export interface IndexedDBConfig {
  dbName: string;
  version: number;
  stores: StoreConfig[];
}

export interface StoreConfig {
  name: string;
  keyPath: string;
  autoIncrement: boolean;
  indexes: IndexConfig[];
}

export interface IndexConfig {
  name: string;
  keyPath: string | string[];
  unique: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDBService {
  private readonly compression = inject(CompressionService);
  
  private db: IDBDatabase | null = null;
  private readonly _isReady = signal<boolean>(false);
  public readonly isReady = this._isReady.asReadonly();
  
  // Performance metrics
  private readonly _metrics = signal<PerformanceMetrics>({
    totalReads: 0,
    totalWrites: 0,
    cacheHits: 0,
    cacheMisses: 0,
    averageReadTime: 0,
    averageWriteTime: 0,
    compressionRatio: 0,
    totalSpaceSaved: 0
  });
  public readonly metrics = this._metrics.asReadonly();
  
  // Compression settings
  private readonly COMPRESSION_THRESHOLD_KB = 1;
  private readonly STORES_TO_COMPRESS = ['logs', 'insights', 'stats'];

  private readonly config: IndexedDBConfig = {
    dbName: 'medicamenta-db',
    version: 4, // Incrementado para forçar upgrade após correção do keyPath
    stores: [
      {
        name: 'medications',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'userId', keyPath: 'userId', unique: false },
          { name: 'isCompleted', keyPath: 'isCompleted', unique: false },
          { name: 'lastModified', keyPath: 'lastModified', unique: false }
        ]
      },
      {
        name: 'logs',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'userId', keyPath: 'userId', unique: false },
          { name: 'eventType', keyPath: 'eventType', unique: false },
          { name: 'timestamp', keyPath: 'timestamp', unique: false }
        ]
      },
      {
        name: 'users',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'email', keyPath: 'email', unique: true },
          { name: 'lastSync', keyPath: 'lastSync', unique: false }
        ]
      },
      {
        name: 'insights',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'userId', keyPath: 'userId', unique: false },
          { name: 'priority', keyPath: 'priority', unique: false },
          { name: 'timestamp', keyPath: 'timestamp', unique: false }
        ]
      },
      {
        name: 'stats',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'userId', keyPath: 'userId', unique: false },
          { name: 'period', keyPath: 'period', unique: false },
          { name: 'calculatedAt', keyPath: 'calculatedAt', unique: false }
        ]
      },
      {
        name: 'queue',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'userId', keyPath: 'userId', unique: false },
          { name: 'priority', keyPath: 'priority', unique: false },
          { name: 'timestamp', keyPath: 'timestamp', unique: false },
          { name: 'collection', keyPath: 'collection', unique: false }
        ]
      },
      {
        name: 'analytics',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'userId', keyPath: 'userId', unique: false },
          { name: 'timestamp', keyPath: 'timestamp', unique: false }
        ]
      },
      {
        name: 'gamification',
        keyPath: 'userId',
        autoIncrement: false,
        indexes: [
          { name: 'level', keyPath: 'level', unique: false },
          { name: 'totalPoints', keyPath: 'totalPoints', unique: false }
        ]
      },
      {
        name: 'achievements',
        keyPath: 'id',
        autoIncrement: false,
        indexes: [
          { name: 'userId', keyPath: 'userId', unique: false },
          { name: 'type', keyPath: 'type', unique: false },
          { name: 'unlockedAt', keyPath: 'unlockedAt', unique: false }
        ]
      }
    ]
  };
  
  private readonly logService = inject(LogService);

  constructor() {
    this.initializeDB();
  }

  /**
   * Inicializar IndexedDB
   */
  private async initializeDB(): Promise<void> {
    try {
      this.db = await this.openDatabase();
      this._isReady.set(true);
      this.logService.info('IndexedDBService', 'Database initialized successfully');
    } catch (error: any) {
      this.logService.error('IndexedDBService', 'Failed to initialize database', error as Error);
      this._isReady.set(false);
    }
  }

  /**
   * Abrir conexão com o banco de dados
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        this.logService.info('IndexedDBService', 'Upgrading database schema');

        // Criar object stores
        this.config.stores.forEach(storeConfig => {
          // Deletar store existente se necessário
          if (db.objectStoreNames.contains(storeConfig.name)) {
            db.deleteObjectStore(storeConfig.name);
          }

          // Criar novo store
          const store = db.createObjectStore(storeConfig.name, {
            keyPath: storeConfig.keyPath,
            autoIncrement: storeConfig.autoIncrement
          });

          // Criar índices
          storeConfig.indexes.forEach(index => {
            store.createIndex(index.name, index.keyPath, { unique: index.unique });
          });

          this.logService.debug('IndexedDBService', 'Created store', { storeName: storeConfig.name });
        });
      };
    });
  }

  /**
   * Garantir que o banco está pronto
   */
  private async ensureReady(): Promise<void> {
    if (!this.db || !this._isReady()) {
      await this.initializeDB();
    }
    if (!this.db) {
      throw new Error('IndexedDB is not available');
    }
  }

  /**
   * Adicionar ou atualizar um item
   */
  async put<T>(storeName: string, item: T): Promise<void> {
    const startTime = performance.now();
    await this.ensureReady();
    
    // Apply compression if applicable
    const itemToStore = this.shouldCompress(storeName) 
      ? this.compressItem(item)
      : item;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(itemToStore);

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        this.recordWrite(duration);
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Adicionar múltiplos itens em batch
   */
  async putBatch<T>(storeName: string, items: T[]): Promise<void> {
    const startTime = performance.now();
    await this.ensureReady();
    
    // Apply compression if applicable
    const itemsToStore = this.shouldCompress(storeName)
      ? items.map(item => this.compressItem(item))
      : items;
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      itemsToStore.forEach(item => store.put(item));

      transaction.oncomplete = () => {
        const duration = performance.now() - startTime;
        this.recordWrite(duration, items.length);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Obter um item por chave
   */
  async get<T>(storeName: string, key: string): Promise<T | undefined> {
    const startTime = performance.now();
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        const result = request.result;
        
        // Decompress if needed
        const decompressed = this.shouldCompress(storeName) && result
          ? this.decompressItem<T>(result)
          : result;
        
        this.recordRead(duration, !!result);
        resolve(decompressed);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obter todos os itens de uma store
   */
  async getAll<T>(storeName: string): Promise<T[]> {
    const startTime = performance.now();
    await this.ensureReady();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const duration = performance.now() - startTime;
        const results = request.result || [];
        
        // Decompress if needed
        const decompressed = this.shouldCompress(storeName)
          ? results.map(item => this.decompressItem<T>(item))
          : results;
        
        this.recordRead(duration, results.length > 0);
        resolve(decompressed);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Obter itens por índice
   */
  async getByIndex<T>(storeName: string, indexName: string, value: any): Promise<T[]> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.getAll(value);

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Contar itens em uma store
   */
  async count(storeName: string): Promise<number> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Contar itens por índice
   */
  async countByIndex(storeName: string, indexName: string, value: any): Promise<number> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      const request = index.count(value);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletar um item
   */
  async delete(storeName: string, key: string): Promise<void> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Deletar múltiplos itens
   */
  async deleteBatch(storeName: string, keys: string[]): Promise<void> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);

      keys.forEach(key => store.delete(key));

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Limpar uma store completamente
   */
  async clear(storeName: string): Promise<void> {
    await this.ensureReady();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Limpar todos os dados do usuário específico
   */
  async clearUserData(userId: string): Promise<void> {
    await this.ensureReady();
    const stores = ['medications', 'logs', 'insights', 'stats', 'queue'];
    
    const promises = stores.map(async (storeName) => {
      const items = await this.getByIndex<any>(storeName, 'userId', userId);
      const keys = items.map(item => item.id);
      if (keys.length > 0) {
        await this.deleteBatch(storeName, keys);
      }
    });

    await Promise.all(promises);
    this.logService.info('IndexedDBService', 'Cleared all data for user', { userId });
  }

  /**
   * Obter estatísticas de uso do banco
   */
  async getStorageStats(): Promise<{ storeName: string; count: number }[]> {
    await this.ensureReady();
    const stats: { storeName: string; count: number }[] = [];

    for (const storeConfig of this.config.stores) {
      const count = await this.count(storeConfig.name);
      stats.push({ storeName: storeConfig.name, count });
    }

    return stats;
  }

  /**
   * Exportar dados para backup
   */
  async exportData(): Promise<Record<string, any[]>> {
    await this.ensureReady();
    const data: Record<string, any[]> = {};

    for (const storeConfig of this.config.stores) {
      data[storeConfig.name] = await this.getAll(storeConfig.name);
    }

    return data;
  }

  /**
   * Importar dados de backup
   */
  async importData(data: Record<string, any[]>): Promise<void> {
    await this.ensureReady();

    for (const [storeName, items] of Object.entries(data)) {
      if (items.length > 0) {
        await this.putBatch(storeName, items);
      }
    }

    this.logService.info('IndexedDBService', 'Data imported successfully');
  }

  /**
   * Fechar conexão com o banco
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this._isReady.set(false);
      this.logService.info('IndexedDBService', 'Database connection closed');
    }
  }

  /**
   * Deletar banco de dados completamente
   */
  async deleteDatabase(): Promise<void> {
    this.close();
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.config.dbName);
      
      request.onsuccess = () => {
        this.logService.info('IndexedDBService', 'Database deleted successfully');
        resolve();
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  // ==================== COMPRESSION METHODS ====================

  /**
   * Check if store should use compression
   */
  private shouldCompress(storeName: string): boolean {
    return this.STORES_TO_COMPRESS.includes(storeName);
  }

  /**
   * Compress item before storing
   */
  private compressItem<T>(item: T): any {
    const shouldCompress = this.compression.shouldCompress(item);
    
    if (!shouldCompress) {
      return item;
    }

    const originalSize = JSON.stringify(item).length;
    const compressed = this.compression.compress(item);
    const compressedSize = compressed.length;
    
    // Track compression stats
    const spaceSaved = originalSize - compressedSize;
    const ratio = Math.round((spaceSaved / originalSize) * 100);
    
    this.updateCompressionMetrics(ratio, spaceSaved);
    
    return {
      _compressed: true,
      _originalSize: originalSize,
      _data: compressed,
      ...(item as any) // Preserve id and other metadata
    };
  }

  /**
   * Decompress item after retrieving
   */
  private decompressItem<T>(item: any): T {
    if (!item || !item._compressed) {
      return item as T;
    }

    const decompressed = this.compression.decompress<T>(item._data);
    return decompressed || item as T;
  }

  /**
   * Update compression metrics
   */
  private updateCompressionMetrics(ratio: number, spaceSaved: number): void {
    this._metrics.update(current => {
      const totalOps = current.totalWrites + 1;
      const avgRatio = Math.round(
        (current.compressionRatio * current.totalWrites + ratio) / totalOps
      );
      
      return {
        ...current,
        compressionRatio: avgRatio,
        totalSpaceSaved: current.totalSpaceSaved + spaceSaved
      };
    });
  }

  // ==================== PERFORMANCE TRACKING ====================

  /**
   * Record read operation
   */
  private recordRead(duration: number, hit: boolean = true): void {
    this._metrics.update(current => {
      const totalReads = current.totalReads + 1;
      const avgReadTime = Math.round(
        (current.averageReadTime * current.totalReads + duration) / totalReads
      );
      
      return {
        ...current,
        totalReads,
        averageReadTime: avgReadTime,
        cacheHits: hit ? current.cacheHits + 1 : current.cacheHits,
        cacheMisses: hit ? current.cacheMisses : current.cacheMisses + 1
      };
    });
  }

  /**
   * Record write operation
   */
  private recordWrite(duration: number, count: number = 1): void {
    this._metrics.update(current => {
      const totalWrites = current.totalWrites + count;
      const avgWriteTime = Math.round(
        (current.averageWriteTime * current.totalWrites + duration) / totalWrites
      );
      
      return {
        ...current,
        totalWrites,
        averageWriteTime: avgWriteTime
      };
    });
  }

  /**
   * Get cache hit rate percentage
   */
  getCacheHitRate(): number {
    const metrics = this._metrics();
    const total = metrics.cacheHits + metrics.cacheMisses;
    
    if (total === 0) return 0;
    return Math.round((metrics.cacheHits / total) * 100);
  }

  /**
   * Get formatted metrics
   */
  getFormattedMetrics() {
    const metrics = this._metrics();
    return {
      ...metrics,
      cacheHitRate: `${this.getCacheHitRate()}%`,
      spaceSaved: this.compression.formatSize(metrics.totalSpaceSaved),
      avgReadTime: `${metrics.averageReadTime.toFixed(2)}ms`,
      avgWriteTime: `${metrics.averageWriteTime.toFixed(2)}ms`
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this._metrics.set({
      totalReads: 0,
      totalWrites: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageReadTime: 0,
      averageWriteTime: 0,
      compressionRatio: 0,
      totalSpaceSaved: 0
    });
  }
}

