import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { FeatureId, FEATURE_MAP, PlanLimits } from '../../models/feature-mapping.model';
import { FeatureMappingService } from '../../services/feature-mapping.service';

/**
 * Modal shown when user reaches a plan limit
 * Provides upgrade call-to-action
 */
@Component({
  selector: 'app-limit-reached-modal',
  templateUrl: './limit-reached-modal.component.html',
  styleUrls: ['./limit-reached-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule]
})
export class LimitReachedModalComponent {
  private readonly modalController = inject(ModalController);
  private readonly router = inject(Router);
  private readonly featureMapping = inject(FeatureMappingService);

  @Input() limitKey!: keyof PlanLimits;
  @Input() featureId?: FeatureId;
  @Input() currentUsage?: number;

  get title(): string {
    const titles: Record<keyof PlanLimits, string> = {
      maxDependents: 'Limite de Dependentes Atingido',
      maxCaretakers: 'Limite de Cuidadores Atingido',
      maxMedications: 'Limite de Medicações Atingido',
      reportsPerMonth: 'Limite de Relatórios Mensais Atingido',
      ocrScansPerMonth: 'Limite de Scans OCR Mensais Atingido',
      telehealthConsultsPerMonth: 'Limite de Consultas de Telemedicina Atingido',
      insightsHistoryDays: 'Limite de Histórico Atingido',
      maxStorageMB: 'Limite de Armazenamento Atingido',
    };
    return titles[this.limitKey] || 'Limite Atingido';
  }

  get message(): string {
    const limit = this.featureMapping.getCurrentPlanLimits()[this.limitKey];
    const usage = this.currentUsage || 0;

    const messages: Record<keyof PlanLimits, string> = {
      maxDependents: `Você atingiu o limite de ${limit} dependente(s) do seu plano atual.`,
      maxCaretakers: `Você atingiu o limite de ${limit} cuidador(es) do seu plano atual.`,
      maxMedications: `Você atingiu o limite de ${limit} medicação(ões) do seu plano atual.`,
      reportsPerMonth: `Você já gerou ${usage} de ${limit} relatórios este mês.`,
      ocrScansPerMonth: `Você já usou ${usage} de ${limit} scans OCR este mês.`,
      telehealthConsultsPerMonth: `Você já agendou ${usage} de ${limit} consultas este mês.`,
      insightsHistoryDays: `Seu plano atual limita o histórico a ${limit} dias.`,
      maxStorageMB: `Você atingiu o limite de ${limit}MB de armazenamento.`,
    };

    return messages[this.limitKey] || 'Você atingiu o limite do seu plano atual.';
  }

  get recommendedPlan(): string {
    if (this.featureId) {
      const feature = FEATURE_MAP[this.featureId];
      return this.getPlanName(feature.requiredPlan);
    }

    // Default recommendations based on limit
    if (this.limitKey === 'maxDependents' || this.limitKey === 'maxCaretakers') {
      return 'Premium';
    }
    if (this.limitKey === 'ocrScansPerMonth' && this.currentUsage && this.currentUsage >= 20) {
      return 'Família';
    }
    return 'Premium';
  }

  get benefits(): string[] {
    const currentPlan = this.featureMapping.currentPlan();

    if (currentPlan === 'free') {
      return [
        'Dependentes e cuidadores ilimitados',
        'Relatórios ilimitados',
        '20 scans OCR por mês',
        'Insights avançados com ML',
        'Integração com wearables',
        'Verificador de interações medicamentosas',
        'Suporte prioritário',
      ];
    }

    if (currentPlan === 'premium') {
      return [
        'Scans OCR ilimitados',
        '3 consultas de telemedicina por mês',
        'Dashboard familiar agregado',
        'Chat entre cuidadores',
        'Calendário compartilhado',
      ];
    }

    return ['Recursos ilimitados', 'Suporte dedicado'];
  }

  get pricing(): { monthly: string; yearly: string; savings: string } {
    const recommended = this.recommendedPlan.toLowerCase();

    if (recommended === 'premium') {
      return {
        monthly: 'R$ 14,90',
        yearly: 'R$ 149,00',
        savings: 'Economize R$ 71,52/ano',
      };
    }

    if (recommended === 'família') {
      return {
        monthly: 'R$ 29,90',
        yearly: 'R$ 299,00',
        savings: 'Economize R$ 143,04/ano',
      };
    }

    return {
      monthly: 'Sob consulta',
      yearly: 'Sob consulta',
      savings: 'Plano personalizado',
    };
  }

  async dismiss() {
    await this.modalController.dismiss();
  }

  async goToUpgrade() {
    await this.modalController.dismiss();
    
    const queryParams: any = {};
    if (this.featureId) {
      queryParams.feature = this.featureId;
    }
    if (this.limitKey) {
      queryParams.reason = `limit_${this.limitKey}`;
    }

    this.router.navigate(['/upgrade'], { queryParams });
  }

  private getPlanName(plan: string): string {
    const names: Record<string, string> = {
      free: 'Gratuito',
      premium: 'Premium',
      family: 'Família',
      enterprise: 'Enterprise',
    };
    return names[plan] || plan;
  }
}
