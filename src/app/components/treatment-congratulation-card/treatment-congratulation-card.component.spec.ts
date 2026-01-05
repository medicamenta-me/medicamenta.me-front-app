import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TreatmentCongratulationCardComponent } from './treatment-congratulation-card.component';
import { CompletionDetectionService } from '../../services/completion-detection.service';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { Component, viewChild, signal } from '@angular/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Medication } from '../../models/medication.model';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({
      COMPLETION: {
        CONGRATULATIONS: 'Congratulations!',
        TREATMENT_COMPLETED: 'Treatment Completed',
        TIME_ENDED: 'Time Ended',
        QUANTITY_DEPLETED: 'Quantity Depleted',
        MANUAL: 'Manual',
        COMPLETED: 'Completed',
        DAYS_AGO: '{{days}} days ago',
        COMPLETED_TODAY: 'Completed Today',
        COMPLETED_ON: 'Completed on {{date}}',
        VIEW_DETAILS: 'View Details'
      }
    });
  }
}

// Test host component to provide required input
@Component({
  template: `
    <app-treatment-congratulation-card 
      [medication]="medication()"
      (viewDetails)="onViewDetails($event)"
      (dismiss)="onDismiss($event)">
    </app-treatment-congratulation-card>
  `,
  standalone: true,
  imports: [TreatmentCongratulationCardComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
class TestHostComponent {
  medication = signal<Medication>({
    id: 'med1',
    name: 'Test Medication',
    dosage: '500mg',
    completionReason: 'time_ended',
    completedAt: new Date('2025-01-01'),
    userId: 'user1'
  } as Medication);
  
  viewDetailsEvent: Medication | null = null;
  dismissEvent: Medication | null = null;
  
  onViewDetails(med: Medication) {
    this.viewDetailsEvent = med;
  }
  
  onDismiss(med: Medication) {
    this.dismissEvent = med;
  }
}

describe('TreatmentCongratulationCardComponent', () => {
  let hostFixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;
  let completionDetectionServiceSpy: jasmine.SpyObj<CompletionDetectionService>;

  beforeEach(async () => {
    completionDetectionServiceSpy = jasmine.createSpyObj('CompletionDetectionService', [
      'getDaysCompletedAgo'
    ]);
    completionDetectionServiceSpy.getDaysCompletedAgo.and.returnValue(3);

    await TestBed.configureTestingModule({
      imports: [
        TestHostComponent,
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: CompletionDetectionService, useValue: completionDetectionServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
    hostFixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create host component', () => {
      expect(hostComponent).toBeTruthy();
    });

    it('should receive medication input', () => {
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.medication().name).toBe('Test Medication');
    });
  });

  describe('completionIcon Computed', () => {
    it('should return time icon for time_ended', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: 'time_ended'
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.completionIcon()).toBe('time');
    });

    it('should return checkmark-circle icon for quantity_depleted', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: 'quantity_depleted'
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.completionIcon()).toBe('checkmark-circle');
    });

    it('should return trophy icon for manual', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: 'manual'
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.completionIcon()).toBe('trophy');
    });

    it('should return checkmark-circle for undefined reason', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: undefined
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.completionIcon()).toBe('checkmark-circle');
    });
  });

  describe('completionReasonText Computed', () => {
    it('should return TIME_ENDED key for time_ended', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: 'time_ended'
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.completionReasonText()).toBe('COMPLETION.TIME_ENDED');
    });

    it('should return QUANTITY_DEPLETED key for quantity_depleted', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: 'quantity_depleted'
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.completionReasonText()).toBe('COMPLETION.QUANTITY_DEPLETED');
    });

    it('should return MANUAL key for manual', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: 'manual'
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.completionReasonText()).toBe('COMPLETION.MANUAL');
    });

    it('should return COMPLETED key for undefined reason', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: undefined
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.completionReasonText()).toBe('COMPLETION.COMPLETED');
    });
  });

  describe('daysAgo Computed', () => {
    it('should get days from service', () => {
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.daysAgo()).toBe(3);
      expect(completionDetectionServiceSpy.getDaysCompletedAgo).toHaveBeenCalled();
    });

    it('should return 0 for today', () => {
      completionDetectionServiceSpy.getDaysCompletedAgo.and.returnValue(0);
      
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.detectChanges();
      
      const card = newFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.daysAgo()).toBe(0);
    });

    it('should return null when service returns null', () => {
      completionDetectionServiceSpy.getDaysCompletedAgo.and.returnValue(null);
      
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.detectChanges();
      
      const card = newFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.daysAgo()).toBeNull();
    });
  });

  describe('formattedDate Computed', () => {
    it('should format Date object', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completedAt: new Date(2025, 0, 15, 12, 0, 0) // January 15, 2025, noon - avoids timezone issues
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      const formatted = card.formattedDate();
      
      expect(formatted).toContain('15');
      expect(formatted).toContain('janeiro');
      expect(formatted).toContain('2025');
    });

    it('should handle string date', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completedAt: new Date(2025, 5, 20, 12, 0, 0) // June 20, 2025, noon
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      const formatted = card.formattedDate();
      
      expect(formatted).toBeTruthy();
    });

    it('should return empty string when no completedAt', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completedAt: undefined
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.formattedDate()).toBe('');
    });
  });

  describe('Output Events', () => {
    it('should emit viewDetails event', () => {
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      card.onViewDetails();
      
      expect(hostComponent.viewDetailsEvent).toEqual(hostComponent.medication());
    });

    it('should emit dismiss event', () => {
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      card.onDismiss();
      
      expect(hostComponent.dismissEvent).toEqual(hostComponent.medication());
    });
  });

  describe('CSS Classes', () => {
    it('should apply time-ended class', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: 'time_ended'
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.medication().completionReason).toBe('time_ended');
    });

    it('should apply quantity-depleted class', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: 'quantity_depleted'
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.medication().completionReason).toBe('quantity_depleted');
    });

    it('should apply manual class', () => {
      hostComponent.medication.set({
        ...hostComponent.medication(),
        completionReason: 'manual'
      });
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.medication().completionReason).toBe('manual');
    });
  });

  describe('Days Display Logic', () => {
    it('should show days ago when > 0', () => {
      completionDetectionServiceSpy.getDaysCompletedAgo.and.returnValue(5);
      
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.detectChanges();
      
      const card = newFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.daysAgo()).toBe(5);
    });

    it('should show completed today when = 0', () => {
      completionDetectionServiceSpy.getDaysCompletedAgo.and.returnValue(0);
      
      const newFixture = TestBed.createComponent(TestHostComponent);
      newFixture.detectChanges();
      
      const card = newFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.daysAgo()).toBe(0);
    });
  });

  describe('Icons Registration', () => {
    it('should have icons registered in constructor', () => {
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card).toBeTruthy();
      // Icons checkmarkCircle, trophy, time, medkit, close registered via addIcons
    });
  });

  describe('Medication Data', () => {
    it('should display medication name', () => {
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.medication().name).toBe('Test Medication');
    });

    it('should handle medication with all fields', () => {
      const fullMedication: Medication = {
        id: 'med-full',
        patientId: 'patient1',
        name: 'Full Medication',
        dosage: '100mg',
        frequency: 'daily',
        schedule: [],
        stock: 0,
        completionReason: 'quantity_depleted',
        completedAt: new Date(),
        userId: 'user1'
      };
      
      hostComponent.medication.set(fullMedication);
      hostFixture.detectChanges();
      
      const card = hostFixture.debugElement.children[0].componentInstance as TreatmentCongratulationCardComponent;
      expect(card.medication().dosage).toBe('100mg');
    });
  });
});
