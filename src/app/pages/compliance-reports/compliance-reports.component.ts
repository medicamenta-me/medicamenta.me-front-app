import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { EnterpriseService } from '../../services/enterprise.service';
import { ComplianceReport } from '../../models/enterprise.model';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

@Component({
  selector: 'app-compliance-reports',
  templateUrl: './compliance-reports.component.html',
  styleUrls: ['./compliance-reports.component.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, TranslateModule]
})
export class ComplianceReportsComponent implements OnInit {
  private readonly enterpriseService = inject(EnterpriseService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly reports = signal<ComplianceReport[]>([]);
  protected readonly isLoading = signal(false);
  protected readonly showGenerateModal = signal(false);
  protected readonly startDate = signal<string>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
  protected readonly endDate = signal<string>(new Date().toISOString());

  async ngOnInit() {
    if (!this.enterpriseService.hasFeature('complianceReports')) {
      await this.router.navigate(['/tabs/dashboard']);
      return;
    }
    await this.loadReports();
  }

  async loadReports() {
    this.isLoading.set(true);
    try {
      const org = this.enterpriseService.currentOrganization();
      if (!org) {
        console.warn('[ComplianceReports] No organization selected');
        return;
      }

      // Buscar relatórios históricos da organização
      const reportsRef = collection(this.enterpriseService['firebaseService'].firestore, 'compliance-reports');
      const reportsQuery = query(
        reportsRef,
        where('organizationId', '==', org.id),
        orderBy('generatedAt', 'desc'),
        limit(20) // Limitar a 20 relatórios mais recentes
      );

      const querySnapshot = await getDocs(reportsQuery);
      const loadedReports: ComplianceReport[] = [];

      querySnapshot.forEach(doc => {
        const data = doc.data();
        loadedReports.push({
          id: doc.id,
          ...data,
          startDate: data.startDate?.toDate ? data.startDate.toDate() : new Date(data.startDate),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : new Date(data.endDate),
          generatedAt: data.generatedAt?.toDate ? data.generatedAt.toDate() : new Date(data.generatedAt)
        } as ComplianceReport);
      });

      this.reports.set(loadedReports);
      console.log(`[ComplianceReports] Loaded ${loadedReports.length} reports`);

    } catch (error) {
      console.error('[ComplianceReports] Error loading reports:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async generateReport() {
    this.isLoading.set(true);
    try {
      const report = await this.enterpriseService.generateComplianceReport(
        new Date(this.startDate()),
        new Date(this.endDate())
      );
      this.reports.update(r => [report, ...r]);
      this.showGenerateModal.set(false);
    } catch (error) {
      console.error('[ComplianceReports] Error generating report:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  async exportPDF(report: ComplianceReport) {
    console.log('[ComplianceReports] Exporting PDF for report:', report.id);
    try {
      await this.enterpriseService.exportComplianceReportToPDF(report);
    } catch (error) {
      console.error('[ComplianceReports] Error exporting PDF:', error);
      alert(this.translate.instant('COMPLIANCE_REPORTS.PDF_ERROR'));
    }
  }

  async exportExcel(report: ComplianceReport) {
    console.log('[ComplianceReports] Exporting Excel for report:', report.id);
    try {
      await this.enterpriseService.exportComplianceReportToExcel(report);
    } catch (error) {
      console.error('[ComplianceReports] Error exporting Excel:', error);
      alert(this.translate.instant('COMPLIANCE_REPORTS.EXCEL_ERROR'));
    }
  }
}
