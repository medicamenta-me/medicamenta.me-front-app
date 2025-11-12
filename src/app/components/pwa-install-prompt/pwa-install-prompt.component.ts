import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { PwaInstallService } from '../../services/pwa-install.service';

/**
 * PWA Install Prompt Component
 * 
 * Banner customizado para instalação do PWA.
 * Aparece quando app é installable e respeita cooldown.
 */
@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    @if (shouldShow()) {
      <div class="install-prompt-banner" [@slideIn]>
        <div class="install-prompt-content">
          <!-- Ícone -->
          <div class="install-prompt-icon">
            <ion-icon name="download-outline"></ion-icon>
          </div>
          
          <!-- Texto -->
          <div class="install-prompt-text">
            <h3>Instalar Medicamenta.me</h3>
            <p>Adicione à tela inicial para acesso rápido</p>
          </div>
          
          <!-- Ações -->
          <div class="install-prompt-actions">
            <ion-button fill="clear" size="small" (click)="dismiss()">
              Não, obrigado
            </ion-button>
            <ion-button size="small" (click)="install()">
              Instalar
            </ion-button>
          </div>
        </div>
        
        <!-- Botão de fechar -->
        <button class="install-prompt-close" (click)="dismiss()">
          <ion-icon name="close-outline"></ion-icon>
        </button>
      </div>
    }
    
    @if (showIOSInstructions()) {
      <div class="ios-install-modal" [@fadeIn]>
        <div class="ios-install-content">
          <div class="ios-install-header">
            <h2>Instalar no iOS</h2>
            <button (click)="closeIOSInstructions()">
              <ion-icon name="close-outline"></ion-icon>
            </button>
          </div>
          
          <div class="ios-install-steps">
            <div class="ios-step">
              <div class="ios-step-number">1</div>
              <p>Toque no botão <ion-icon name="share-outline"></ion-icon> Compartilhar</p>
            </div>
            
            <div class="ios-step">
              <div class="ios-step-number">2</div>
              <p>Selecione "Adicionar à Tela de Início"</p>
            </div>
            
            <div class="ios-step">
              <div class="ios-step-number">3</div>
              <p>Toque em "Adicionar"</p>
            </div>
          </div>
          
          <ion-button expand="block" (click)="closeIOSInstructions()">
            Entendi
          </ion-button>
        </div>
      </div>
    }
  `,
  styles: [`
    .install-prompt-banner {
      position: fixed;
      bottom: 16px;
      left: 16px;
      right: 16px;
      background: var(--ion-color-primary);
      color: white;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    }
    
    @keyframes slideIn {
      from {
        transform: translateY(100%);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }
    
    .install-prompt-content {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      padding-right: 48px;
    }
    
    .install-prompt-icon {
      font-size: 32px;
      flex-shrink: 0;
    }
    
    .install-prompt-text {
      flex: 1;
      
      h3 {
        margin: 0 0 4px 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
      }
    }
    
    .install-prompt-actions {
      display: flex;
      gap: 8px;
      flex-shrink: 0;
      
      ion-button {
        --color: white;
        --background: rgba(255, 255, 255, 0.2);
        --background-activated: rgba(255, 255, 255, 0.3);
      }
      
      ion-button[fill="clear"] {
        --background: transparent;
      }
    }
    
    .install-prompt-close {
      position: absolute;
      top: 8px;
      right: 8px;
      background: transparent;
      border: none;
      color: white;
      font-size: 24px;
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    /* iOS Instructions Modal */
    .ios-install-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }
    
    .ios-install-content {
      background: var(--ion-background-color);
      border-radius: 12px;
      padding: 24px;
      margin: 16px;
      max-width: 400px;
      width: 100%;
    }
    
    .ios-install-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      
      h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
      }
      
      button {
        background: transparent;
        border: none;
        font-size: 24px;
        padding: 4px;
        cursor: pointer;
        color: var(--ion-color-medium);
      }
    }
    
    .ios-install-steps {
      margin-bottom: 24px;
    }
    
    .ios-step {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 16px;
      
      .ios-step-number {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: var(--ion-color-primary);
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        flex-shrink: 0;
      }
      
      p {
        margin: 0;
        font-size: 14px;
        
        ion-icon {
          vertical-align: middle;
          font-size: 18px;
        }
      }
    }
    
    @media (max-width: 576px) {
      .install-prompt-banner {
        left: 8px;
        right: 8px;
      }
      
      .install-prompt-content {
        flex-wrap: wrap;
      }
      
      .install-prompt-actions {
        width: 100%;
        justify-content: flex-end;
      }
    }
  `]
})
export class PwaInstallPromptComponent implements OnInit {
  private pwaInstall = inject(PwaInstallService);
  
  private readonly visible = signal(false);
  private readonly showIOS = signal(false);

  ngOnInit() {
    // Mostrar banner após 3 segundos se deve sugerir instalação
    setTimeout(() => {
      if (this.pwaInstall.shouldSuggestInstall()) {
        this.visible.set(true);
      }
    }, 3000);
  }

  shouldShow(): boolean {
    return this.visible();
  }

  showIOSInstructions(): boolean {
    return this.showIOS();
  }

  async install() {
    const platform = this.pwaInstall.getPlatform();
    
    if (platform === 'ios') {
      // iOS não suporta beforeinstallprompt, mostrar instruções
      this.showIOS.set(true);
    } else {
      // Android/Desktop - mostrar prompt nativo
      const result = await this.pwaInstall.showInstallPrompt();
      
      if (result === 'accepted') {
        console.log('[PWA Install] User accepted installation');
        this.visible.set(false);
      } else if (result === 'dismissed') {
        console.log('[PWA Install] User dismissed installation');
        this.visible.set(false);
      }
    }
  }

  dismiss() {
    this.visible.set(false);
  }

  closeIOSInstructions() {
    this.showIOS.set(false);
    this.visible.set(false);
  }
}
