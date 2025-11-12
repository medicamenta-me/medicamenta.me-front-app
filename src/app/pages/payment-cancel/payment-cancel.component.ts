import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeCircleOutline, refreshOutline, helpCircleOutline } from 'ionicons/icons';

@Component({
  selector: 'app-payment-cancel',
  template: `
    <ion-header>
      <ion-toolbar color="warning">
        <ion-title>Pagamento Cancelado</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="cancel-container">
        <div class="cancel-icon">
          <ion-icon name="close-circle-outline" color="warning"></ion-icon>
        </div>

        <h1>Pagamento não concluído</h1>
        <p class="subtitle">Você cancelou o processo de pagamento</p>

        <ion-card>
          <ion-card-header>
            <ion-card-title>Precisa de ajuda?</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <p>Se você teve algum problema durante o processo de pagamento ou tem dúvidas sobre os planos, estamos aqui para ajudar!</p>
            
            <ul>
              <li>📧 Email: support@medicamenta.me</li>
              <li>💬 Chat: Disponível no app</li>
              <li>📱 WhatsApp: (11) 99999-9999</li>
            </ul>
          </ion-card-content>
        </ion-card>

        <div class="actions">
          <ion-button expand="block" color="primary" (click)="tryAgain()">
            <ion-icon name="refresh-outline" slot="start"></ion-icon>
            Tentar Novamente
          </ion-button>

          <ion-button expand="block" fill="outline" (click)="goToPlans()">
            <ion-icon name="help-circle-outline" slot="start"></ion-icon>
            Ver Planos
          </ion-button>

          <ion-button expand="block" fill="clear" (click)="goToDashboard()">
            Voltar ao Início
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .cancel-container {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
      padding: 2rem 0;
    }

    .cancel-icon {
      margin: 2rem 0;

      ion-icon {
        font-size: 8rem;
      }
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      color: var(--ion-color-warning);
    }

    .subtitle {
      font-size: 1.1rem;
      color: var(--ion-color-medium);
      margin-bottom: 2rem;
    }

    ion-card {
      margin: 2rem 0;
      text-align: left;

      p {
        margin-bottom: 1rem;
        line-height: 1.6;
      }

      ul {
        margin: 0;
        padding-left: 1.5rem;

        li {
          margin-bottom: 0.75rem;
          line-height: 1.6;
        }
      }
    }

    .actions {
      margin-top: 2rem;

      ion-button {
        margin-bottom: 1rem;
      }
    }
  `],
  standalone: true,
  imports: [
    IonHeader, IonToolbar, IonTitle, IonContent,
    IonButton, IonIcon, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent
  ]
})
export class PaymentCancelComponent {
  private readonly router = inject(Router);

  constructor() {
    addIcons({ closeCircleOutline, refreshOutline, helpCircleOutline });
  }

  tryAgain() {
    this.router.navigate(['/upgrade']);
  }

  goToPlans() {
    this.router.navigate(['/upgrade']);
  }

  goToDashboard() {
    this.router.navigate(['/tabs/dashboard']);
  }
}
