import { Component, OnInit, inject } from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { ShareTargetService } from '../../services/share-target.service';

/**
 * Share Target Page
 * 
 * Página que recebe compartilhamentos de outros apps.
 * Processa FormData e redireciona para página apropriada.
 */
@Component({
  selector: 'app-share-target',
  standalone: true,
  imports: [IonicModule],
  template: `
    <ion-content class="ion-padding">
      <div class="share-target-loading">
        <ion-spinner name="crescent"></ion-spinner>
        <h2>Processando compartilhamento...</h2>
        <p>Aguarde enquanto processamos os dados compartilhados.</p>
      </div>
    </ion-content>
  `,
  styles: [`
    .share-target-loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      
      ion-spinner {
        width: 48px;
        height: 48px;
        margin-bottom: 24px;
      }
      
      h2 {
        font-size: 20px;
        font-weight: 600;
        margin-bottom: 8px;
      }
      
      p {
        color: var(--ion-color-medium);
        font-size: 14px;
      }
    }
  `]
})
export class ShareTargetPage implements OnInit {
  private shareTarget = inject(ShareTargetService);

  async ngOnInit() {
    // Obter URL atual
    const url = window.location.href;
    
    try {
      // Se foi POST (com FormData), processar no Service Worker
      // Aqui apenas processamos via URL params
      await this.shareTarget.processShareFromUrl(url);
    } catch (error) {
      console.error('[Share Target Page] Failed to process share:', error);
    }
  }
}
