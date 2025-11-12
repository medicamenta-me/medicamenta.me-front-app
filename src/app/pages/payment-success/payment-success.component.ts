import { Component, inject, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';
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
import { checkmarkCircleOutline, rocketOutline } from 'ionicons/icons';

@Component({
  selector: 'app-payment-success',
  template: `
    <ion-header>
      <ion-toolbar color="success">
        <ion-title>Pagamento Confirmado</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <div class="success-container">
        <div class="success-icon">
          <ion-icon name="checkmark-circle-outline" color="success"></ion-icon>
        </div>

        <h1>Bem-vindo ao {{ planName }}!</h1>
        <p class="subtitle">Seu pagamento foi processado com sucesso</p>

        <ion-card>
          <ion-card-header>
            <ion-card-title>O que acontece agora?</ion-card-title>
          </ion-card-header>
          <ion-card-content>
            <ul>
              <li>✅ Teste grátis de 7 dias ativado</li>
              <li>✅ Acesso imediato a todos os recursos premium</li>
              <li>✅ Primeira cobrança apenas após o período de teste</li>
              <li>✅ Cancele a qualquer momento sem custo</li>
            </ul>
          </ion-card-content>
        </ion-card>

        <div class="actions">
          <ion-button expand="block" color="primary" (click)="goToDashboard()">
            <ion-icon name="rocket-outline" slot="start"></ion-icon>
            Começar a Usar
          </ion-button>

          <ion-button expand="block" fill="outline" (click)="goToProfile()">
            Ver Minha Assinatura
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    .success-container {
      max-width: 600px;
      margin: 0 auto;
      text-align: center;
      padding: 2rem 0;
    }

    .success-icon {
      margin: 2rem 0;

      ion-icon {
        font-size: 8rem;
      }
    }

    h1 {
      font-size: 2rem;
      margin-bottom: 0.5rem;
      color: var(--ion-color-success);
    }

    .subtitle {
      font-size: 1.1rem;
      color: var(--ion-color-medium);
      margin-bottom: 2rem;
    }

    ion-card {
      margin: 2rem 0;
      text-align: left;

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
export class PaymentSuccessComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly subscriptionService = inject(SubscriptionService);

  planName = '';

  constructor() {
    addIcons({ checkmarkCircleOutline, rocketOutline });
  }

  ngOnInit() {
    // Get plan from subscription service
    const currentPlan = this.subscriptionService.currentPlan();
    
    if (currentPlan === 'premium') {
      this.planName = 'Premium';
    } else if (currentPlan === 'family') {
      this.planName = 'Family';
    } else {
      this.planName = 'Plano Pago';
    }

    // Optional: Track analytics event
    console.log('[PaymentSuccess] Subscription activated:', currentPlan);
  }

  goToDashboard() {
    this.router.navigate(['/tabs/dashboard']);
  }

  goToProfile() {
    this.router.navigate(['/tabs/profile']);
  }
}
