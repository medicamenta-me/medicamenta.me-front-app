import { Injectable } from '@angular/core';
import * as LZString from 'lz-string';
import { LogService } from './log.service';

/**
 * Compression Service
 * 
 * Provides data compression/decompression for storage optimization.
 * Uses LZ-String algorithm for efficient string compression.
 */
@Injectable({
  providedIn: 'root'
})
export class CompressionService {
  private readonly logService = new LogService();
  
  /**
   * Compress data to UTF16 string
   * Optimized for IndexedDB storage
   */
  compress<T>(data: T): string {
    try {
      const jsonString = JSON.stringify(data);
      return LZString.compressToUTF16(jsonString);
    } catch (error: any) {
      this.logService.error('Compression', 'Failed to compress data', error as Error);
      // Return original data as fallback
      return JSON.stringify(data);
    }
  }

  /**
   * Decompress UTF16 string back to original data
   */
  decompress<T>(compressed: string): T | null {
    try {
      const decompressed = LZString.decompressFromUTF16(compressed);
      if (!decompressed) {
        // Try parsing as regular JSON (uncompressed fallback)
        return JSON.parse(compressed) as T;
      }
      return JSON.parse(decompressed) as T;
    } catch (error: any) {
      this.logService.error('Compression', 'Failed to decompress data', error as Error);
      return null;
    }
  }

  /**
   * Calculate compression ratio
   * Returns percentage of space saved (0-100)
   */
  getCompressionRatio(original: string, compressed: string): number {
    const originalSize = original.length;
    const compressedSize = compressed.length;
    
    if (originalSize === 0) return 0;
    
    const saved = originalSize - compressedSize;
    return Math.round((saved / originalSize) * 100);
  }

  /**
   * Check if data should be compressed
   * Small data may not benefit from compression overhead
   */
  shouldCompress(data: any): boolean {
    const jsonString = JSON.stringify(data);
    const sizeInKB = jsonString.length / 1024;
    
    // Only compress data larger than 1KB
    return sizeInKB > 1;
  }

  /**
   * Compress array of items
   */
  compressBatch<T>(items: T[]): string {
    return this.compress(items);
  }

  /**
   * Decompress array of items
   */
  decompressBatch<T>(compressed: string): T[] | null {
    return this.decompress<T[]>(compressed);
  }

  /**
   * Get size in bytes
   */
  getSize(data: string): number {
    return new Blob([data]).size;
  }

  /**
   * Format size for display
   */
  formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }
}

