import { Component, OnInit, computed, inject, signal } from '@angular/core';

import { IonicModule, AlertController, LoadingController, ToastController } from '@ionic/angular';
import { Router } from '@angular/router';
import { SubscriptionService } from '../../services/subscription.service';
import { StripePaymentService } from '../../services/stripe-payment.service';
import { PagSeguroPaymentService } from '../../services/pagseguro-payment.service';
import { AuthService } from '../../services/auth.service';
import { UserSubscription } from '../../models/subscription.model';
import { PLAN_LIMITS, SubscriptionPlan } from '../../models/feature-mapping.model';

interface PaymentHistoryItem {
  id: string;
  date: Date;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  method: string;
  invoice?: string;
}

interface UsageStats {
  medicationsUsed: number;
  medicationsLimit: number;
  patientsUsed: number;
  patientsLimit: number;
  alarmsUsed: number;
  alarmsLimit: number;
}

@Component({
  selector: 'app-manage-subscription',
  templateUrl: './manage-subscription.page.html',
  styleUrls: ['./manage-subscription.page.scss'],
  standalone: true,
  imports: [IonicModule]
})
export class ManageSubscriptionPage implements OnInit {
  private readonly subscriptionService = inject(SubscriptionService);
  private readonly stripeService = inject(StripePaymentService);
  private readonly pagSeguroService = inject(PagSeguroPaymentService);
  private readonly authService = inject(AuthService);
  private readonly alertController = inject(AlertController);
  private readonly loadingController = inject(LoadingController);
  private readonly toastController = inject(ToastController);
  private readonly router = inject(Router);

  // Signals
  subscription = signal<UserSubscription | null>(null);
  loading = signal<boolean>(false);
  paymentHistory = signal<PaymentHistoryItem[]>([]);
  usageStats = signal<UsageStats>({
    medicationsUsed: 0,
    medicationsLimit: 5,
    patientsUsed: 0,
    patientsLimit: 1,
    alarmsUsed: 0,
    alarmsLimit: 3
  });

  // Computed
  currentPlan = computed(() => this.subscription()?.plan || 'free' as SubscriptionPlan);
  
  planLimits = computed(() => PLAN_LIMITS[this.currentPlan()]);
  
  isActive = computed(() => 
    this.subscription()?.status === 'active' || 
    this.subscription()?.status === 'trialing'
  );
  
  isCanceled = computed(() => 
    this.subscription()?.status === 'canceled' || 
    this.subscription()?.cancelAtPeriodEnd === true
  );
  
  nextBillingDate = computed(() => {
    const sub = this.subscription();
    if (!sub?.currentPeriodEnd) return null;
    return sub.currentPeriodEnd.toDate();
  });
  
  daysUntilRenewal = computed(() => {
    const nextDate = this.nextBillingDate();
    if (!nextDate) return null;
    const diff = nextDate.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  });
  
  canUpgrade = computed(() => {
    const plan = this.currentPlan();
    return plan === 'free' || plan === 'premium';
  });
  
  canDowngrade = computed(() => {
    const plan = this.currentPlan();
    return plan === 'premium' || plan === 'family';
  });
  
  isPaidPlan = computed(() => this.currentPlan() !== 'free');

  paymentProvider = computed(() => {
    const sub = this.subscription();
    return sub?.stripeCustomerId ? 'stripe' : 
           sub?.pagSeguroCode ? 'pagseguro' : null;
  });

  // Usage percentages
  medicationsUsagePercent = computed(() => {
    const stats = this.usageStats();
    return (stats.medicationsUsed / stats.medicationsLimit) * 100;
  });

  patientsUsagePercent = computed(() => {
    const stats = this.usageStats();
    return (stats.patientsUsed / stats.patientsLimit) * 100;
  });

  alarmsUsagePercent = computed(() => {
    const stats = this.usageStats();
    return (stats.alarmsUsed / stats.alarmsLimit) * 100;
  });

  ngOnInit() {
    this.loadSubscriptionData();
  }

  async loadSubscriptionData() {
    this.loading.set(true);

    try {
      const userId = this.authService.currentUser()?.uid;
      if (!userId) {
        throw new Error('Usuário não autenticado');
      }

      // Load subscription
      await this.subscriptionService.loadSubscription(userId);
      const sub = this.subscriptionService.currentSubscription();
      this.subscription.set(sub);

      // Load payment history
      await this.loadPaymentHistory();

      // Load usage stats (mock data for now - replace with actual service)
      this.loadUsageStats();

    } catch (error) {
      console.error('Error loading subscription data:', error);
      this.showToast('Erro ao carregar dados da assinatura', 'danger');
    } finally {
      this.loading.set(false);
    }
  }

  async loadPaymentHistory() {
    const provider = this.paymentProvider();
    
    if (provider === 'stripe') {
      const history = await this.stripeService.getPaymentHistory();
      this.paymentHistory.set(history.map(invoice => ({
        id: invoice.id,
        date: new Date(invoice.created * 1000),
        amount: invoice.amount_paid / 100,
        status: invoice.paid ? 'paid' : 'pending',
        method: 'Cartão de Crédito',
        invoice: invoice.hosted_invoice_url || undefined
      })));
    } else if (provider === 'pagseguro') {
      const history = await this.pagSeguroService.getTransactionHistory();
      this.paymentHistory.set(history.map(transaction => ({
        id: transaction.code,
        date: new Date(transaction.date),
        amount: transaction.grossAmount,
        status: transaction.status === 'PAID' ? 'paid' : 
                transaction.status === 'PENDING' ? 'pending' : 'failed',
        method: this.getPagSeguroMethodName(transaction.paymentMethod.type)
      })));
    }
  }

  loadUsageStats() {
    // TODO: Replace with actual usage data from services
    // For now, using mock data
    this.usageStats.set({
      medicationsUsed: 3,
      medicationsLimit: this.planLimits().maxMedications || 5,
      patientsUsed: 1,
      patientsLimit: this.planLimits().maxPatients || 1,
      alarmsUsed: 2,
      alarmsLimit: this.planLimits().maxAlarms || 3
    });
  }

  getPagSeguroMethodName(type: number): string {
    const methods: Record<number, string> = {
      1: 'Cartão de Crédito',
      2: 'Boleto',
      3: 'Débito Online',
      4: 'Saldo PagSeguro',
      5: 'PIX'
    };
    return methods[type] || 'Outro';
  }

  async openCustomerPortal() {
    if (this.paymentProvider() !== 'stripe') {
      this.showToast('Portal disponível apenas para assinaturas Stripe', 'warning');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Abrindo portal...'
    });
    await loading.present();

    try {
      await this.stripeService.createCustomerPortalSession();
    } catch (error) {
      console.error('Error opening customer portal:', error);
      this.showToast('Erro ao abrir portal do cliente', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async cancelSubscription() {
    const alert = await this.alertController.create({
      header: 'Cancelar Assinatura',
      message: 'Tem certeza que deseja cancelar sua assinatura? Você continuará tendo acesso aos benefícios até o fim do período pago.',
      buttons: [
        {
          text: 'Não',
          role: 'cancel'
        },
        {
          text: 'Sim, Cancelar',
          role: 'destructive',
          handler: () => this.confirmCancellation()
        }
      ]
    });

    await alert.present();
  }

  async confirmCancellation() {
    const loading = await this.loadingController.create({
      message: 'Cancelando assinatura...'
    });
    await loading.present();

    try {
      const provider = this.paymentProvider();
      
      if (provider === 'stripe') {
        await this.stripeService.cancelSubscription();
      } else if (provider === 'pagseguro') {
        await this.pagSeguroService.cancelSubscription();
      }

      this.showToast('Assinatura cancelada com sucesso', 'success');
      await this.loadSubscriptionData();
      
    } catch (error) {
      console.error('Error canceling subscription:', error);
      this.showToast('Erro ao cancelar assinatura', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async reactivateSubscription() {
    const loading = await this.loadingController.create({
      message: 'Reativando assinatura...'
    });
    await loading.present();

    try {
      const provider = this.paymentProvider();
      
      if (provider === 'stripe') {
        await this.stripeService.reactivateSubscription();
      } else if (provider === 'pagseguro') {
        await this.pagSeguroService.reactivateSubscription();
      }

      this.showToast('Assinatura reativada com sucesso', 'success');
      await this.loadSubscriptionData();
      
    } catch (error) {
      console.error('Error reactivating subscription:', error);
      this.showToast('Erro ao reativar assinatura', 'danger');
    } finally {
      loading.dismiss();
    }
  }

  async upgradePlan() {
    this.router.navigate(['/pricing']);
  }

  async downgradePlan() {
    const alert = await this.alertController.create({
      header: 'Fazer Downgrade',
      message: 'Para fazer downgrade, cancele sua assinatura atual. Ao final do período pago, você poderá escolher um novo plano.',
      buttons: ['OK']
    });

    await alert.present();
  }

  getStatusBadgeColor(status?: string): string {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'success';
      case 'canceled':
        return 'danger';
      case 'past_due':
        return 'warning';
      default:
        return 'medium';
    }
  }

  getStatusLabel(status?: string): string {
    switch (status) {
      case 'active':
        return 'Ativa';
      case 'trialing':
        return 'Período de Teste';
      case 'canceled':
        return 'Cancelada';
      case 'past_due':
        return 'Pagamento Atrasado';
      case 'incomplete':
        return 'Incompleta';
      default:
        return 'Desconhecido';
    }
  }

  getPlanName(plan: SubscriptionPlan): string {
    const names: Record<SubscriptionPlan, string> = {
      [SubscriptionPlan.FREE]: 'Gratuito',
      [SubscriptionPlan.PREMIUM]: 'Premium',
      [SubscriptionPlan.FAMILY]: 'Família',
      [SubscriptionPlan.ENTERPRISE]: 'Enterprise'
    };
    return names[plan];
  }

  getPlanIcon(plan: SubscriptionPlan): string {
    const icons: Record<SubscriptionPlan, string> = {
      [SubscriptionPlan.FREE]: 'gift-outline',
      [SubscriptionPlan.PREMIUM]: 'star',
      [SubscriptionPlan.FAMILY]: 'people',
      [SubscriptionPlan.ENTERPRISE]: 'business'
    };
    return icons[plan];
  }

  getUsageColor(percent: number): string {
    if (percent >= 90) return 'danger';
    if (percent >= 70) return 'warning';
    return 'success';
  }

  formatDate(date: Date | null): string {
    if (!date) return '-';
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  async showToast(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      color,
      position: 'top'
    });
    await toast.present();
  }
}
