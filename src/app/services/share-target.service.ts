import { Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LogService } from './log.service';

export interface SharedData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export interface ShareTargetStats {
  totalShares: number;
  lastShareDate: Date | null;
  sharesByType: {
    text: number;
    url: number;
    image: number;
    document: number;
  };
}

/**
 * Share Target Service
 * 
 * Permite que o app receba compartilhamentos de outros aplicativos.
 * Features:
 * - Receber texto compartilhado
 * - Receber URLs compartilhadas
 * - Receber imagens compartilhadas
 * - Receber documentos compartilhados
 * - Processar dados compartilhados
 * - Estatísticas de compartilhamentos
 */
@Injectable({
  providedIn: 'root'
})
export class ShareTargetService {
  private readonly logService = new LogService();
  
  private readonly _pendingShare = signal<SharedData | null>(null);
  private readonly _stats = signal<ShareTargetStats>({
    totalShares: 0,
    lastShareDate: null,
    sharesByType: {
      text: 0,
      url: 0,
      image: 0,
      document: 0
    }
  });

  readonly pendingShare = this._pendingShare.asReadonly();
  readonly stats = this._stats.asReadonly();

  constructor(private router: Router) {
    this.loadStats();
  }

  /**
   * Processar share recebido da URL
   */
  async processShareFromUrl(url: string): Promise<void> {
    try {
      const urlObj = new URL(url, window.location.origin);
      const params = urlObj.searchParams;

      const sharedData: SharedData = {
        title: params.get('title') || undefined,
        text: params.get('text') || undefined,
        url: params.get('url') || undefined
      };

      // Processar arquivos se houver (via FormData no POST)
      // Nota: arquivos precisam ser processados no service worker ou backend

      this.logService.info('Share Target', 'Received share', { sharedData });

      this._pendingShare.set(sharedData);
      this.updateStats(sharedData);

      // Redirecionar para página apropriada
      await this.handleSharedData(sharedData);

    } catch (error: any) {
      this.logService.error('Share Target', 'Failed to process share', error as Error);
    }
  }

  /**
   * Processar share de FormData (POST)
   */
  async processShareFromFormData(formData: FormData): Promise<void> {
    try {
      const sharedData: SharedData = {
        title: formData.get('title') as string || undefined,
        text: formData.get('text') as string || undefined,
        url: formData.get('url') as string || undefined,
        files: []
      };

      // Processar arquivos de imagem
      const imageFiles = formData.getAll('image') as File[];
      if (imageFiles.length > 0) {
        sharedData.files = [...(sharedData.files || []), ...imageFiles];
      }

      // Processar arquivos de documento
      const docFiles = formData.getAll('document') as File[];
      if (docFiles.length > 0) {
        sharedData.files = [...(sharedData.files || []), ...docFiles];
      }

      this.logService.info('Share Target', 'Received share with files', { sharedData });

      this._pendingShare.set(sharedData);
      this.updateStats(sharedData);

      await this.handleSharedData(sharedData);

    } catch (error: any) {
      this.logService.error('Share Target', 'Failed to process FormData', error as Error);
    }
  }

  /**
   * Tratar dados compartilhados
   */
  private async handleSharedData(data: SharedData): Promise<void> {
    // Detectar tipo de compartilhamento
    if (data.files && data.files.length > 0) {
      // Compartilhamento com arquivos
      await this.handleFileShare(data);
    } else if (data.url) {
      // Compartilhamento de URL
      await this.handleUrlShare(data);
    } else if (data.text) {
      // Compartilhamento de texto
      await this.handleTextShare(data);
    } else {
      // Compartilhamento genérico
      await this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Tratar compartilhamento de arquivo
   */
  private async handleFileShare(data: SharedData): Promise<void> {
    if (!data.files || data.files.length === 0) {
      return;
    }

    const file = data.files[0];

    // Detectar tipo de arquivo
    if (file.type.startsWith('image/')) {
      // Imagem - pode ser receita médica ou foto de medicamento
      // Redirecionar para página de adicionar medicamento com imagem
      await this.router.navigate(['/medication/new'], {
        queryParams: { hasImage: true }
      });
    } else if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
      // PDF - provavelmente receita médica
      await this.router.navigate(['/medication/new'], {
        queryParams: { hasPrescription: true }
      });
    } else {
      // Outro tipo de arquivo
      await this.router.navigate(['/dashboard']);
    }
  }

  /**
   * Tratar compartilhamento de URL
   */
  private async handleUrlShare(data: SharedData): Promise<void> {
    // URL pode ser link de medicamento, artigo sobre saúde, etc.
    // Salvar como nota ou insight
    await this.router.navigate(['/dashboard'], {
      queryParams: { sharedUrl: data.url }
    });
  }

  /**
   * Tratar compartilhamento de texto
   */
  private async handleTextShare(data: SharedData): Promise<void> {
    // Texto pode ser nome de medicamento, lembrete, etc.
    // Tentar extrair nome de medicamento
    const medicationName = this.extractMedicationName(data.text || '');

    if (medicationName) {
      // Redirecionar para adicionar medicamento com nome pré-preenchido
      await this.router.navigate(['/medication/new'], {
        queryParams: { name: medicationName }
      });
    } else {
      // Texto genérico - salvar como nota
      await this.router.navigate(['/dashboard'], {
        queryParams: { sharedText: data.text }
      });
    }
  }

  /**
   * Extrair nome de medicamento do texto
   */
  private extractMedicationName(text: string): string | null {
    // Remover caracteres especiais e espaços extras
    const cleaned = text.trim().replace(/[^\w\s]/gi, '');

    // Se texto é curto (< 50 chars), provavelmente é nome de medicamento
    if (cleaned.length > 0 && cleaned.length < 50) {
      return cleaned;
    }

    return null;
  }

  /**
   * Atualizar estatísticas
   */
  private updateStats(data: SharedData): void {
    this._stats.update(s => {
      const sharesByType = { ...s.sharesByType };

      // Incrementar contador por tipo
      if (data.files && data.files.length > 0) {
        const file = data.files[0];
        if (file.type.startsWith('image/')) {
          sharesByType.image++;
        } else {
          sharesByType.document++;
        }
      } else if (data.url) {
        sharesByType.url++;
      } else if (data.text) {
        sharesByType.text++;
      }

      return {
        totalShares: s.totalShares + 1,
        lastShareDate: new Date(),
        sharesByType
      };
    });

    this.saveStats();
  }

  /**
   * Limpar share pendente
   */
  clearPendingShare(): void {
    this._pendingShare.set(null);
  }

  /**
   * Obter arquivo do share pendente
   */
  async getPendingFile(index: number = 0): Promise<File | null> {
    const share = this._pendingShare();
    if (!share || !share.files || share.files.length <= index) {
      return null;
    }
    return share.files[index];
  }

  /**
   * Converter arquivo para base64
   */
  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Carregar stats do localStorage
   */
  private loadStats(): void {
    try {
      const stored = localStorage.getItem('medicamenta_share_target_stats');
      if (stored) {
        const stats = JSON.parse(stored);
        
        if (stats.lastShareDate) {
          stats.lastShareDate = new Date(stats.lastShareDate);
        }

        this._stats.set(stats);
      }
    } catch (error: any) {
      this.logService.error('Share Target', 'Failed to load stats', error as Error);
    }
  }

  /**
   * Salvar stats no localStorage
   */
  private saveStats(): void {
    try {
      const stats = this._stats();
      localStorage.setItem('medicamenta_share_target_stats', JSON.stringify(stats));
    } catch (error: any) {
      this.logService.error('Share Target', 'Failed to save stats', error as Error);
    }
  }

  /**
   * Verificar se há share pendente
   */
  hasPendingShare(): boolean {
    return this._pendingShare() !== null;
  }

  /**
   * Obter tipo de share pendente
   */
  getPendingShareType(): 'text' | 'url' | 'file' | null {
    const share = this._pendingShare();
    if (!share) return null;

    if (share.files && share.files.length > 0) return 'file';
    if (share.url) return 'url';
    if (share.text) return 'text';

    return null;
  }
}

