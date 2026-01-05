import {
  PatientData,
  CriticalEvent,
  MedicationChange,
  CaregiverNote,
  AdherenceData,
  ReportConfig,
  ProfessionalReportConfig
} from './report-generator.service';

/**
 * Unit tests for ReportGeneratorService
 * Tests interfaces, types, and utility logic
 */
describe('ReportGeneratorService', () => {
  
  describe('PatientData Interface', () => {
    
    it('should create complete patient data', () => {
      const patient: PatientData = {
        name: 'John Doe',
        age: 45,
        gender: 'Male',
        email: 'john.doe@example.com',
        phone: '+55 11 99999-9999',
        document: '123.456.789-00',
        address: '123 Main St, City'
      };

      expect(patient.name).toBe('John Doe');
      expect(patient.age).toBe(45);
      expect(patient.gender).toBe('Male');
      expect(patient.email).toBe('john.doe@example.com');
    });

    it('should create minimal patient data', () => {
      const patient: PatientData = {
        name: 'Jane Doe'
      };

      expect(patient.name).toBe('Jane Doe');
      expect(patient.age).toBeUndefined();
      expect(patient.email).toBeUndefined();
    });

    it('should handle different age ranges', () => {
      const ages = [0, 18, 45, 65, 100];
      
      ages.forEach(age => {
        const patient: PatientData = {
          name: 'Test',
          age
        };
        expect(patient.age).toBe(age);
      });
    });

    it('should handle different genders', () => {
      const genders = ['Male', 'Female', 'Other', 'Prefer not to say'];
      
      genders.forEach(gender => {
        const patient: PatientData = {
          name: 'Test',
          gender
        };
        expect(patient.gender).toBe(gender);
      });
    });
  });

  describe('CriticalEvent Interface', () => {
    
    it('should create missed dose event', () => {
      const event: CriticalEvent = {
        date: new Date(),
        type: 'missed',
        medicationName: 'Aspirin',
        description: 'Dose not taken',
        severity: 'high'
      };

      expect(event.type).toBe('missed');
      expect(event.severity).toBe('high');
    });

    it('should create late dose event', () => {
      const event: CriticalEvent = {
        date: new Date(),
        type: 'late',
        medicationName: 'Metformin',
        description: 'Dose taken 30 minutes late',
        severity: 'medium'
      };

      expect(event.type).toBe('late');
      expect(event.severity).toBe('medium');
    });

    it('should create early dose event', () => {
      const event: CriticalEvent = {
        date: new Date(),
        type: 'early',
        medicationName: 'Insulin',
        description: 'Dose taken 1 hour early',
        severity: 'low'
      };

      expect(event.type).toBe('early');
      expect(event.severity).toBe('low');
    });

    it('should create wrong dose event', () => {
      const event: CriticalEvent = {
        date: new Date(),
        type: 'wrong-dose',
        medicationName: 'Blood Pressure Med',
        description: 'Double dose taken by mistake',
        severity: 'high'
      };

      expect(event.type).toBe('wrong-dose');
      expect(event.severity).toBe('high');
    });

    it('should validate all event types', () => {
      const types: Array<'missed' | 'late' | 'early' | 'wrong-dose'> = ['missed', 'late', 'early', 'wrong-dose'];
      
      types.forEach(type => {
        const event: CriticalEvent = {
          date: new Date(),
          type,
          medicationName: 'Test',
          description: 'Test event',
          severity: 'low'
        };
        expect(types).toContain(event.type);
      });
    });

    it('should validate all severity levels', () => {
      const severities: Array<'low' | 'medium' | 'high'> = ['low', 'medium', 'high'];
      
      severities.forEach(severity => {
        const event: CriticalEvent = {
          date: new Date(),
          type: 'missed',
          medicationName: 'Test',
          description: 'Test event',
          severity
        };
        expect(severities).toContain(event.severity);
      });
    });
  });

  describe('MedicationChange Interface', () => {
    
    it('should create added medication change', () => {
      const change: MedicationChange = {
        date: new Date(),
        medicationName: 'New Medication',
        type: 'added',
        description: 'New medication prescribed by Dr. Smith'
      };

      expect(change.type).toBe('added');
      expect(change.medicationName).toBe('New Medication');
    });

    it('should create removed medication change', () => {
      const change: MedicationChange = {
        date: new Date(),
        medicationName: 'Old Medication',
        type: 'removed',
        description: 'Treatment completed'
      };

      expect(change.type).toBe('removed');
    });

    it('should create modified medication change', () => {
      const change: MedicationChange = {
        date: new Date(),
        medicationName: 'Aspirin',
        type: 'modified',
        description: 'Dosage increased from 100mg to 200mg'
      };

      expect(change.type).toBe('modified');
      expect(change.description).toContain('Dosage');
    });

    it('should validate all change types', () => {
      const types: Array<'added' | 'removed' | 'modified'> = ['added', 'removed', 'modified'];
      
      types.forEach(type => {
        const change: MedicationChange = {
          date: new Date(),
          medicationName: 'Test',
          type,
          description: 'Test change'
        };
        expect(types).toContain(change.type);
      });
    });
  });

  describe('CaregiverNote Interface', () => {
    
    it('should create general note', () => {
      const note: CaregiverNote = {
        date: new Date(),
        author: 'Maria (Caregiver)',
        note: 'Patient feeling well today',
        category: 'general'
      };

      expect(note.category).toBe('general');
      expect(note.author).toBe('Maria (Caregiver)');
    });

    it('should create medication note', () => {
      const note: CaregiverNote = {
        date: new Date(),
        author: 'John (Son)',
        note: 'Had difficulty swallowing morning pill',
        category: 'medication'
      };

      expect(note.category).toBe('medication');
    });

    it('should create health note', () => {
      const note: CaregiverNote = {
        date: new Date(),
        author: 'Nurse Jane',
        note: 'Blood pressure slightly elevated',
        category: 'health'
      };

      expect(note.category).toBe('health');
    });

    it('should create behavior note', () => {
      const note: CaregiverNote = {
        date: new Date(),
        author: 'Family Member',
        note: 'Patient seemed confused this afternoon',
        category: 'behavior'
      };

      expect(note.category).toBe('behavior');
    });

    it('should create note without category', () => {
      const note: CaregiverNote = {
        date: new Date(),
        author: 'Anonymous',
        note: 'Simple observation'
      };

      expect(note.category).toBeUndefined();
    });
  });

  describe('AdherenceData Interface', () => {
    
    it('should create daily adherence data', () => {
      const data: AdherenceData = {
        date: '2024-01-15',
        taken: 4,
        total: 5,
        percentage: 80
      };

      expect(data.date).toBe('2024-01-15');
      expect(data.percentage).toBe(80);
    });

    it('should create 100% adherence data', () => {
      const data: AdherenceData = {
        date: '2024-01-16',
        taken: 5,
        total: 5,
        percentage: 100
      };

      expect(data.taken).toBe(data.total);
      expect(data.percentage).toBe(100);
    });

    it('should create 0% adherence data', () => {
      const data: AdherenceData = {
        date: '2024-01-17',
        taken: 0,
        total: 5,
        percentage: 0
      };

      expect(data.taken).toBe(0);
      expect(data.percentage).toBe(0);
    });

    it('should calculate percentage correctly', () => {
      const data: AdherenceData = {
        date: '2024-01-18',
        taken: 3,
        total: 4,
        percentage: 75
      };

      const calculatedPercentage = (data.taken / data.total) * 100;
      expect(calculatedPercentage).toBe(data.percentage);
    });

    it('should validate date format', () => {
      const data: AdherenceData = {
        date: '2024-12-31',
        taken: 5,
        total: 5,
        percentage: 100
      };

      expect(data.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe('ReportConfig Interface', () => {
    
    it('should create medical report config', () => {
      const config: ReportConfig = {
        type: 'medical',
        period: 'month',
        includeGraphs: true,
        includeMedications: true,
        includeAdherence: true,
        includePatterns: true,
        includeStock: false,
        notes: 'For medical consultation'
      };

      expect(config.type).toBe('medical');
      expect(config.period).toBe('month');
      expect(config.includeGraphs).toBeTrue();
    });

    it('should create family report config', () => {
      const config: ReportConfig = {
        type: 'family',
        period: 'week',
        includeGraphs: true,
        includeMedications: true,
        includeAdherence: true,
        includePatterns: false,
        includeStock: false
      };

      expect(config.type).toBe('family');
      expect(config.notes).toBeUndefined();
    });

    it('should create caregiver report config', () => {
      const config: ReportConfig = {
        type: 'caregiver',
        period: 'week',
        includeGraphs: false,
        includeMedications: true,
        includeAdherence: true,
        includePatterns: true,
        includeStock: true
      };

      expect(config.type).toBe('caregiver');
      expect(config.includeStock).toBeTrue();
    });

    it('should create complete report config', () => {
      const config: ReportConfig = {
        type: 'complete',
        period: 'all',
        includeGraphs: true,
        includeMedications: true,
        includeAdherence: true,
        includePatterns: true,
        includeStock: true
      };

      expect(config.type).toBe('complete');
      expect(config.period).toBe('all');
    });

    it('should validate all report types', () => {
      const types: Array<'medical' | 'family' | 'caregiver' | 'complete'> = ['medical', 'family', 'caregiver', 'complete'];
      
      types.forEach(type => {
        const config: ReportConfig = {
          type,
          period: 'month',
          includeGraphs: true,
          includeMedications: true,
          includeAdherence: true,
          includePatterns: true,
          includeStock: true
        };
        expect(types).toContain(config.type);
      });
    });

    it('should validate all period types', () => {
      const periods: Array<'week' | 'month' | 'year' | 'all'> = ['week', 'month', 'year', 'all'];
      
      periods.forEach(period => {
        const config: ReportConfig = {
          type: 'medical',
          period,
          includeGraphs: true,
          includeMedications: true,
          includeAdherence: true,
          includePatterns: true,
          includeStock: true
        };
        expect(periods).toContain(config.period);
      });
    });
  });

  describe('ProfessionalReportConfig Interface', () => {
    
    it('should create complete professional config', () => {
      const config: ProfessionalReportConfig = {
        template: {
          id: 'medical-consultation',
          name: 'Medical Report',
          description: 'For doctors',
          sections: [],
          color: '#3880ff',
          icon: 'medical'
        },
        patient: {
          name: 'John Doe',
          age: 45
        },
        period: {
          start: new Date('2024-01-01'),
          end: new Date('2024-01-31')
        },
        medications: [],
        adherenceData: [],
        criticalEvents: [],
        medicationChanges: [],
        caregiverNotes: [],
        statistics: {
          totalMedications: 5,
          activeMedications: 4,
          overallAdherence: 85,
          missedDoses: 15,
          onTimeDoses: 80,
          lateDoses: 5
        }
      };

      expect(config.template.name).toBe('Medical Report');
      expect(config.statistics?.overallAdherence).toBe(85);
    });

    it('should create config without statistics', () => {
      const config: ProfessionalReportConfig = {
        template: {
          id: 'family-report',
          name: 'Simple Report',
          description: 'Basic report',
          sections: [],
          color: '#5260ff',
          icon: 'people'
        },
        patient: {
          name: 'Jane Doe'
        },
        period: {
          start: new Date(),
          end: new Date()
        },
        medications: [],
        adherenceData: [],
        criticalEvents: [],
        medicationChanges: [],
        caregiverNotes: []
      };

      expect(config.statistics).toBeUndefined();
      expect(config.customLogo).toBeUndefined();
    });

    it('should create config with custom logo', () => {
      const config: ProfessionalReportConfig = {
        template: {
          id: 'caregiver-audit',
          name: 'Branded Report',
          description: 'With logo',
          sections: [],
          color: '#10dc60',
          icon: 'person'
        },
        patient: {
          name: 'Test Patient'
        },
        period: {
          start: new Date(),
          end: new Date()
        },
        medications: [],
        adherenceData: [],
        criticalEvents: [],
        medicationChanges: [],
        caregiverNotes: [],
        customLogo: 'data:image/png;base64,iVBORw0KGgoAAAANS...'
      };

      expect(config.customLogo).toBeDefined();
      expect(config.customLogo).toContain('base64');
    });
  });

  describe('Statistics Calculation', () => {
    
    it('should calculate overall adherence', () => {
      const onTime = 80;
      const late = 10;
      const missed = 10;
      const total = onTime + late + missed;
      
      const adherence = ((onTime + late) / total) * 100;
      expect(adherence).toBe(90);
    });

    it('should calculate active medication percentage', () => {
      const statistics = {
        totalMedications: 10,
        activeMedications: 7
      };
      
      const activePercentage = (statistics.activeMedications / statistics.totalMedications) * 100;
      expect(activePercentage).toBe(70);
    });

    it('should handle zero medications', () => {
      const statistics = {
        totalMedications: 0,
        activeMedications: 0
      };
      
      const activePercentage = statistics.totalMedications === 0 
        ? 0 
        : (statistics.activeMedications / statistics.totalMedications) * 100;
      expect(activePercentage).toBe(0);
    });
  });

  describe('Period Calculation', () => {
    
    it('should calculate week period', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-07');
      
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(days).toBe(6); // 6 days difference
    });

    it('should calculate month period', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      
      const days = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      expect(days).toBe(30);
    });

    it('should format period label', () => {
      const formatPeriodLabel = (start: Date, end: Date): string => {
        return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
      };

      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      
      const label = formatPeriodLabel(start, end);
      expect(label).toContain('-');
    });
  });

  describe('Event Severity Sorting', () => {
    
    it('should sort events by severity', () => {
      const events: CriticalEvent[] = [
        { date: new Date(), type: 'missed', medicationName: 'A', description: '', severity: 'low' },
        { date: new Date(), type: 'missed', medicationName: 'B', description: '', severity: 'high' },
        { date: new Date(), type: 'missed', medicationName: 'C', description: '', severity: 'medium' }
      ];

      const severityOrder = { high: 0, medium: 1, low: 2 };
      const sorted = events.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

      expect(sorted[0].severity).toBe('high');
      expect(sorted[1].severity).toBe('medium');
      expect(sorted[2].severity).toBe('low');
    });

    it('should filter high severity events', () => {
      const events: CriticalEvent[] = [
        { date: new Date(), type: 'missed', medicationName: 'A', description: '', severity: 'low' },
        { date: new Date(), type: 'missed', medicationName: 'B', description: '', severity: 'high' },
        { date: new Date(), type: 'missed', medicationName: 'C', description: '', severity: 'high' }
      ];

      const highSeverity = events.filter(e => e.severity === 'high');
      expect(highSeverity.length).toBe(2);
    });
  });

  describe('Date Formatting', () => {
    
    it('should format date for display', () => {
      const formatDate = (date: Date): string => {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        });
      };

      const date = new Date('2024-01-15');
      const formatted = formatDate(date);
      expect(formatted).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('should format date for filename', () => {
      const formatDateForFilename = (date: Date): string => {
        return date.toISOString().split('T')[0];
      };

      const date = new Date('2024-01-15T12:00:00Z');
      const formatted = formatDateForFilename(date);
      expect(formatted).toBe('2024-01-15');
    });
  });

  describe('Color Constants', () => {
    
    it('should define report colors', () => {
      const colors = {
        PRIMARY: '#3880ff',
        SECONDARY: '#5260ff',
        SUCCESS: '#10dc60',
        WARNING: '#ffce00',
        DANGER: '#f04141'
      };

      expect(colors.PRIMARY).toBe('#3880ff');
      expect(colors.SUCCESS).toBe('#10dc60');
      expect(colors.DANGER).toBe('#f04141');
    });

    it('should validate hex color format', () => {
      const colors = ['#3880ff', '#5260ff', '#10dc60', '#ffce00', '#f04141'];
      
      colors.forEach(color => {
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });
});
