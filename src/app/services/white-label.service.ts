import { Injectable, inject, signal } from '@angular/core';
import { FirebaseService } from './firebase.service';
import { EnterpriseService } from './enterprise.service';
import { LogService } from './log.service';
import { Organization } from '../models/enterprise.model';
import { updateDoc, doc } from 'firebase/firestore';

/**
 * White-label Service
 * 
 * Gerenciamento de branding customizado para organizações Enterprise
 * - Upload de logo
 * - Cores customizadas
 * - Domínio personalizado
 * - Tema dinâmico
 * - PDFs com branding
 * 
 * @author Medicamenta.me Enterprise Team
 * @version 1.0
 */
@Injectable({
  providedIn: 'root'
})
export class WhiteLabelService {
  private readonly firebaseService = inject(FirebaseService);
  private readonly enterpriseService = inject(EnterpriseService);
  private readonly logService = inject(LogService);

  private readonly _customBranding = signal<Organization['branding'] | null>(null);
  public readonly customBranding = this._customBranding.asReadonly();

  /**
   * Aplica branding da organização
   */
  async applyBranding(branding?: Organization['branding']) {
    const org = this.enterpriseService.currentOrganization();
    if (!org) return;

    if (!this.enterpriseService.hasFeature('whiteLabel')) {
      this.logService.info('WhiteLabel', 'White-label not available in current plan');
      return;
    }

    const brandingToApply = branding || org.branding;
    if (!brandingToApply) return;

    this._customBranding.set(brandingToApply);

    // Aplicar cores
    if (brandingToApply.primaryColor) {
      document.documentElement.style.setProperty('--ion-color-primary', brandingToApply.primaryColor);
    }

    if (brandingToApply.secondaryColor) {
      document.documentElement.style.setProperty('--ion-color-secondary', brandingToApply.secondaryColor);
    }

    // Aplicar logo (se tiver elemento no DOM)
    if (brandingToApply.logo) {
      const logoElements = document.querySelectorAll('.app-logo');
      logoElements.forEach(el => {
        (el as HTMLImageElement).src = brandingToApply.logo!;
      });
    }

    // Aplicar favicon
    if (brandingToApply.logo) {
      this.updateFavicon(brandingToApply.logo);
    }

    this.logService.info('WhiteLabel', 'Branding applied');
  }

  /**
   * Atualiza logo
   */
  async updateLogo(logoUrl: string) {
    const org = this.enterpriseService.currentOrganization();
    if (!org) throw new Error('No organization');

    const db = this.firebaseService.firestore;

    await updateDoc(doc(db, `organizations/${org.id}`), {
      'branding.logo': logoUrl
    });

    await this.applyBranding({ ...org.branding, logo: logoUrl });

    await this.enterpriseService.logAudit({
      organizationId: org.id,
      action: 'organization.update',
      description: 'Logo updated',
      resourceType: 'organization',
      resourceId: org.id,
      severity: 'info'
    });
  }

  /**
   * Atualiza cores
   */
  async updateColors(primaryColor: string, secondaryColor?: string) {
    const org = this.enterpriseService.currentOrganization();
    if (!org) throw new Error('No organization');

    const db = this.firebaseService.firestore;

    await updateDoc(doc(db, `organizations/${org.id}`), {
      'branding.primaryColor': primaryColor,
      'branding.secondaryColor': secondaryColor || org.branding?.secondaryColor
    });

    await this.applyBranding({ ...org.branding, primaryColor, secondaryColor });

    await this.enterpriseService.logAudit({
      organizationId: org.id,
      action: 'organization.update',
      description: 'Colors updated',
      resourceType: 'organization',
      resourceId: org.id,
      severity: 'info'
    });
  }

  /**
   * Atualiza domínio customizado
   */
  async setCustomDomain(domain: string) {
    const org = this.enterpriseService.currentOrganization();
    if (!org) throw new Error('No organization');

    if (!this.enterpriseService.hasFeature('customDomain')) {
      throw new Error('Custom domain not available in current plan');
    }

    const db = this.firebaseService.firestore;

    await updateDoc(doc(db, `organizations/${org.id}`), {
      'branding.customDomain': domain
    });

    await this.enterpriseService.logAudit({
      organizationId: org.id,
      action: 'organization.update',
      description: `Custom domain set: ${domain}`,
      resourceType: 'organization',
      resourceId: org.id,
      severity: 'info'
    });

    // TODO: Implementar validação DNS e provisionamento SSL
  }

  /**
   * Atualiza favicon
   */
  private updateFavicon(iconUrl: string) {
    let link: HTMLLinkElement | null = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = iconUrl;
  }

  /**
   * Gera PDF com branding (futuro)
   */
  async generateBrandedPDF(content: any): Promise<Blob> {
    const branding = this._customBranding();
    
    // TODO: Implementar geração de PDF com jsPDF
    // Incluir logo no header
    // Usar cores customizadas
    // Footer com domínio customizado ou "Powered by Medicamenta.me"
    
    this.logService.info('WhiteLabel', 'Generating branded PDF', { branding });
    return new Blob(['PDF content'], { type: 'application/pdf' });
  }

  /**
   * Reseta branding para padrão
   */
  resetBranding() {
    this._customBranding.set(null);
    document.documentElement.style.removeProperty('--ion-color-primary');
    document.documentElement.style.removeProperty('--ion-color-secondary');
  }
}

