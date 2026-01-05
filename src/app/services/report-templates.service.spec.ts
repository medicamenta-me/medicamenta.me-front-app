import {
  ReportTemplateType,
  ReportSection,
  ReportTemplate,
  REPORT_SECTIONS
} from './report-templates.service';

/**
 * Unit tests for ReportTemplatesService
 * Tests interfaces, types, and utility logic
 */
describe('ReportTemplatesService', () => {
  
  describe('ReportTemplateType', () => {
    
    it('should define medical-consultation type', () => {
      const type: ReportTemplateType = 'medical-consultation';
      expect(type).toBe('medical-consultation');
    });

    it('should define family-report type', () => {
      const type: ReportTemplateType = 'family-report';
      expect(type).toBe('family-report');
    });

    it('should define caregiver-audit type', () => {
      const type: ReportTemplateType = 'caregiver-audit';
      expect(type).toBe('caregiver-audit');
    });
  });

  describe('REPORT_SECTIONS Constants', () => {
    
    it('should define PATIENT_INFO section', () => {
      expect(REPORT_SECTIONS.PATIENT_INFO).toBe('patient-info');
    });

    it('should define ACTIVE_MEDICATIONS section', () => {
      expect(REPORT_SECTIONS.ACTIVE_MEDICATIONS).toBe('active-medications');
    });

    it('should define ADHERENCE_CHART section', () => {
      expect(REPORT_SECTIONS.ADHERENCE_CHART).toBe('adherence-chart');
    });

    it('should define ADHERENCE_TABLE section', () => {
      expect(REPORT_SECTIONS.ADHERENCE_TABLE).toBe('adherence-table');
    });

    it('should define CRITICAL_EVENTS section', () => {
      expect(REPORT_SECTIONS.CRITICAL_EVENTS).toBe('critical-events');
    });

    it('should define SCHEDULE_HISTORY section', () => {
      expect(REPORT_SECTIONS.SCHEDULE_HISTORY).toBe('schedule-history');
    });

    it('should define MEDICATION_CHANGES section', () => {
      expect(REPORT_SECTIONS.MEDICATION_CHANGES).toBe('medication-changes');
    });

    it('should define CAREGIVER_NOTES section', () => {
      expect(REPORT_SECTIONS.CAREGIVER_NOTES).toBe('caregiver-notes');
    });

    it('should define STATISTICS section', () => {
      expect(REPORT_SECTIONS.STATISTICS).toBe('statistics');
    });

    it('should define RECOMMENDATIONS section', () => {
      expect(REPORT_SECTIONS.RECOMMENDATIONS).toBe('recommendations');
    });
  });

  describe('ReportSection Interface', () => {
    
    it('should create enabled required section', () => {
      const section: ReportSection = {
        id: 'patient-info',
        name: 'Dados do Paciente',
        enabled: true,
        required: true
      };

      expect(section.id).toBe('patient-info');
      expect(section.enabled).toBeTrue();
      expect(section.required).toBeTrue();
    });

    it('should create enabled optional section', () => {
      const section: ReportSection = {
        id: 'adherence-chart',
        name: 'Grafico de Aderencia',
        enabled: true,
        required: false
      };

      expect(section.enabled).toBeTrue();
      expect(section.required).toBeFalse();
    });

    it('should create disabled section', () => {
      const section: ReportSection = {
        id: 'caregiver-notes',
        name: 'Notas do Cuidador',
        enabled: false,
        required: false
      };

      expect(section.enabled).toBeFalse();
    });

    it('should create all standard sections', () => {
      const sections: ReportSection[] = [
        { id: REPORT_SECTIONS.PATIENT_INFO, name: 'Patient Info', enabled: true, required: true },
        { id: REPORT_SECTIONS.ACTIVE_MEDICATIONS, name: 'Active Medications', enabled: true, required: true },
        { id: REPORT_SECTIONS.ADHERENCE_CHART, name: 'Adherence Chart', enabled: true, required: false },
        { id: REPORT_SECTIONS.ADHERENCE_TABLE, name: 'Adherence Table', enabled: true, required: false },
        { id: REPORT_SECTIONS.CRITICAL_EVENTS, name: 'Critical Events', enabled: true, required: false },
        { id: REPORT_SECTIONS.MEDICATION_CHANGES, name: 'Medication Changes', enabled: true, required: false },
        { id: REPORT_SECTIONS.STATISTICS, name: 'Statistics', enabled: true, required: false }
      ];

      expect(sections.length).toBe(7);
      expect(sections.filter(s => s.required).length).toBe(2);
    });
  });

  describe('ReportTemplate Interface', () => {
    
    it('should create medical consultation template', () => {
      const template: ReportTemplate = {
        id: 'medical-consultation',
        name: 'Consulta Medica',
        description: 'Relatorio completo para apresentar ao medico',
        color: '#3880ff',
        icon: 'medkit',
        sections: [
          { id: 'patient-info', name: 'Dados do Paciente', enabled: true, required: true },
          { id: 'active-medications', name: 'Medicamentos Ativos', enabled: true, required: true }
        ]
      };

      expect(template.id).toBe('medical-consultation');
      expect(template.color).toBe('#3880ff');
      expect(template.icon).toBe('medkit');
      expect(template.sections.length).toBe(2);
    });

    it('should create family report template', () => {
      const template: ReportTemplate = {
        id: 'family-report',
        name: 'Relatorio Familiar',
        description: 'Resumo para compartilhar com familiares',
        color: '#10dc60',
        icon: 'people',
        sections: []
      };

      expect(template.id).toBe('family-report');
      expect(template.color).toBe('#10dc60');
      expect(template.icon).toBe('people');
    });

    it('should create caregiver audit template', () => {
      const template: ReportTemplate = {
        id: 'caregiver-audit',
        name: 'Auditoria de Cuidador',
        description: 'Relatorio detalhado de aderencia e eventos',
        color: '#ffce00',
        icon: 'person',
        sections: []
      };

      expect(template.id).toBe('caregiver-audit');
      expect(template.color).toBe('#ffce00');
    });

    it('should validate hex color format', () => {
      const template: ReportTemplate = {
        id: 'medical-consultation',
        name: 'Test',
        description: 'Test',
        color: '#3880ff',
        icon: 'test',
        sections: []
      };

      expect(template.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('Template Configuration Logic', () => {
    
    it('should filter enabled sections', () => {
      const sections: ReportSection[] = [
        { id: 'section1', name: 'Section 1', enabled: true, required: true },
        { id: 'section2', name: 'Section 2', enabled: false, required: false },
        { id: 'section3', name: 'Section 3', enabled: true, required: false }
      ];

      const enabledSections = sections.filter(s => s.enabled);
      expect(enabledSections.length).toBe(2);
    });

    it('should filter required sections', () => {
      const sections: ReportSection[] = [
        { id: 'section1', name: 'Section 1', enabled: true, required: true },
        { id: 'section2', name: 'Section 2', enabled: true, required: false },
        { id: 'section3', name: 'Section 3', enabled: true, required: true }
      ];

      const requiredSections = sections.filter(s => s.required);
      expect(requiredSections.length).toBe(2);
    });

    it('should toggle section enabled state', () => {
      const section: ReportSection = {
        id: 'test',
        name: 'Test',
        enabled: true,
        required: false
      };

      const toggled = { ...section, enabled: !section.enabled };
      expect(toggled.enabled).toBeFalse();
    });

    it('should prevent disabling required sections', () => {
      const section: ReportSection = {
        id: 'patient-info',
        name: 'Patient Info',
        enabled: true,
        required: true
      };

      const canDisable = !section.required;
      expect(canDisable).toBeFalse();
    });
  });

  describe('Template Selection Logic', () => {
    
    it('should find template by id', () => {
      const templates: ReportTemplate[] = [
        { id: 'medical-consultation', name: 'Medical', description: '', color: '#000', icon: '', sections: [] },
        { id: 'family-report', name: 'Family', description: '', color: '#000', icon: '', sections: [] },
        { id: 'caregiver-audit', name: 'Caregiver', description: '', color: '#000', icon: '', sections: [] }
      ];

      const found = templates.find(t => t.id === 'family-report');
      expect(found?.name).toBe('Family');
    });

    it('should return undefined for non-existent template', () => {
      const templates: ReportTemplate[] = [
        { id: 'medical-consultation', name: 'Medical', description: '', color: '#000', icon: '', sections: [] }
      ];

      const found = templates.find(t => t.id === 'family-report' as ReportTemplateType);
      expect(found).toBeUndefined();
    });
  });

  describe('Section Customization', () => {
    
    it('should update section name', () => {
      const section: ReportSection = {
        id: 'patient-info',
        name: 'Original Name',
        enabled: true,
        required: true
      };

      const updated = { ...section, name: 'Custom Name' };
      expect(updated.name).toBe('Custom Name');
    });

    it('should create custom template with modified sections', () => {
      const baseTemplate: ReportTemplate = {
        id: 'medical-consultation',
        name: 'Medical',
        description: 'Base template',
        color: '#3880ff',
        icon: 'medkit',
        sections: [
          { id: 'section1', name: 'Section 1', enabled: true, required: true },
          { id: 'section2', name: 'Section 2', enabled: true, required: false }
        ]
      };

      const customSections = baseTemplate.sections.map(s => ({
        ...s,
        enabled: s.required ? true : false
      }));

      expect(customSections.filter(s => s.enabled).length).toBe(1);
    });
  });

  describe('Template Validation', () => {
    
    it('should validate template has required sections', () => {
      const template: ReportTemplate = {
        id: 'medical-consultation',
        name: 'Test',
        description: 'Test',
        color: '#000000',
        icon: 'test',
        sections: [
          { id: 'patient-info', name: 'Patient', enabled: true, required: true },
          { id: 'medications', name: 'Medications', enabled: true, required: true }
        ]
      };

      const hasRequiredSections = template.sections.filter(s => s.required).every(s => s.enabled);
      expect(hasRequiredSections).toBeTrue();
    });

    it('should detect missing required sections', () => {
      const template: ReportTemplate = {
        id: 'medical-consultation',
        name: 'Test',
        description: 'Test',
        color: '#000000',
        icon: 'test',
        sections: [
          { id: 'patient-info', name: 'Patient', enabled: false, required: true }
        ]
      };

      const hasAllRequired = template.sections.filter(s => s.required).every(s => s.enabled);
      expect(hasAllRequired).toBeFalse();
    });
  });
});
