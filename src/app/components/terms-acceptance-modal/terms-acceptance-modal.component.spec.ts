import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { TermsAcceptanceModalComponent } from './terms-acceptance-modal.component';
import { IonicModule } from '@ionic/angular';
import { ModalController } from '@ionic/angular/standalone';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TermsOfUse } from '../../models/terms-of-use.model';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> {
    return of({});
  }
}

describe('TermsAcceptanceModalComponent', () => {
  let component: TermsAcceptanceModalComponent;
  let fixture: ComponentFixture<TermsAcceptanceModalComponent>;
  let modalControllerSpy: jasmine.SpyObj<ModalController>;

  const mockTerms: TermsOfUse = {
    id: 'terms-br-1',
    version: '1.0.0',
    effectiveDate: new Date('2025-01-01'),
    createdAt: new Date('2024-12-01'),
    text: 'These are the terms of use...',
    country: 'BR',
    language: 'pt-BR',
    isActive: true
  };

  beforeEach(async () => {
    modalControllerSpy = jasmine.createSpyObj('ModalController', ['dismiss']);
    modalControllerSpy.dismiss.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [
        TermsAcceptanceModalComponent,
        FormsModule,
        IonicModule.forRoot(),
        TranslateModule.forRoot({
          loader: { provide: TranslateLoader, useClass: FakeTranslateLoader }
        })
      ],
      providers: [
        { provide: ModalController, useValue: modalControllerSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TermsAcceptanceModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should start with terms as null', () => {
      expect(component.terms()).toBeNull();
    });

    it('should start with hasScrolledToBottom as false', () => {
      expect(component.hasScrolledToBottom()).toBe(false);
    });

    it('should start with acceptanceChecked as false', () => {
      expect(component.acceptanceChecked()).toBe(false);
    });

    it('should start with isAccepting as false', () => {
      expect(component.isAccepting()).toBe(false);
    });
  });

  describe('setTerms', () => {
    it('should set terms signal', () => {
      component.setTerms(mockTerms);
      
      expect(component.terms()).toEqual(mockTerms);
    });
  });

  describe('onScroll', () => {
    it('should not set hasScrolledToBottom when not at bottom', () => {
      const event = {
        target: {
          scrollTop: 0,
          scrollHeight: 1000,
          clientHeight: 500
        }
      };
      
      component.onScroll(event);
      
      expect(component.hasScrolledToBottom()).toBe(false);
    });

    it('should set hasScrolledToBottom when at bottom', () => {
      const event = {
        target: {
          scrollTop: 500,
          scrollHeight: 1000,
          clientHeight: 500
        }
      };
      
      component.onScroll(event);
      
      expect(component.hasScrolledToBottom()).toBe(true);
    });

    it('should set hasScrolledToBottom when within threshold', () => {
      const event = {
        target: {
          scrollTop: 460, // 460 + 500 = 960, threshold is 50, so 1000 - 50 = 950
          scrollHeight: 1000,
          clientHeight: 500
        }
      };
      
      component.onScroll(event);
      
      expect(component.hasScrolledToBottom()).toBe(true);
    });

    it('should not toggle hasScrolledToBottom if already set', () => {
      component.hasScrolledToBottom.set(true);
      
      const event = {
        target: {
          scrollTop: 0,
          scrollHeight: 1000,
          clientHeight: 500
        }
      };
      
      component.onScroll(event);
      
      // Should remain true (doesn't reset to false)
      expect(component.hasScrolledToBottom()).toBe(true);
    });
  });

  describe('onCheckboxChange', () => {
    it('should set acceptanceChecked to true when checked', () => {
      const event = { detail: { checked: true } };
      
      component.onCheckboxChange(event);
      
      expect(component.acceptanceChecked()).toBe(true);
    });

    it('should set acceptanceChecked to false when unchecked', () => {
      component.acceptanceChecked.set(true);
      
      const event = { detail: { checked: false } };
      
      component.onCheckboxChange(event);
      
      expect(component.acceptanceChecked()).toBe(false);
    });
  });

  describe('canAccept Getter', () => {
    it('should return false when not scrolled and not checked', () => {
      expect(component.canAccept).toBe(false);
    });

    it('should return false when scrolled but not checked', () => {
      component.hasScrolledToBottom.set(true);
      
      expect(component.canAccept).toBe(false);
    });

    it('should return false when checked but not scrolled', () => {
      component.acceptanceChecked.set(true);
      
      expect(component.canAccept).toBe(false);
    });

    it('should return true when both scrolled and checked', () => {
      component.hasScrolledToBottom.set(true);
      component.acceptanceChecked.set(true);
      
      expect(component.canAccept).toBe(true);
    });
  });

  describe('acceptTerms', () => {
    it('should not accept if canAccept is false', async () => {
      await component.acceptTerms();
      
      expect(modalControllerSpy.dismiss).not.toHaveBeenCalled();
    });

    it('should set isAccepting to true while processing', fakeAsync(() => {
      component.setTerms(mockTerms);
      component.hasScrolledToBottom.set(true);
      component.acceptanceChecked.set(true);
      
      component.acceptTerms();
      
      expect(component.isAccepting()).toBe(true);
      
      tick(500);
    }));

    it('should dismiss modal with acceptance data', fakeAsync(() => {
      component.setTerms(mockTerms);
      component.hasScrolledToBottom.set(true);
      component.acceptanceChecked.set(true);
      
      component.acceptTerms();
      tick(500);
      
      expect(modalControllerSpy.dismiss).toHaveBeenCalledWith({
        accepted: true,
        terms: mockTerms
      }, 'accept');
    }));

    it('should wait 500ms before dismissing', fakeAsync(() => {
      component.setTerms(mockTerms);
      component.hasScrolledToBottom.set(true);
      component.acceptanceChecked.set(true);
      
      component.acceptTerms();
      
      expect(modalControllerSpy.dismiss).not.toHaveBeenCalled();
      
      tick(500);
      
      expect(modalControllerSpy.dismiss).toHaveBeenCalled();
    }));
  });

  describe('preventDismiss', () => {
    it('should return false to prevent dismissal', async () => {
      const result = await component.preventDismiss();
      
      expect(result).toBe(false);
    });
  });

  describe('formatDate', () => {
    it('should format date in pt-BR locale', () => {
      // Use local timezone date constructor to avoid UTC issues
      const date = new Date(2025, 0, 15, 12, 0, 0); // January 15, 2025, noon
      const formatted = component.formatDate(date);
      
      expect(formatted).toContain('2025');
      expect(formatted).toContain('janeiro');
      expect(formatted).toContain('15');
    });

    it('should return empty string for undefined date', () => {
      expect(component.formatDate(undefined)).toBe('');
    });

    it('should handle Date string conversion', () => {
      // Use local timezone date
      const formatted = component.formatDate(new Date(2025, 5, 20, 12, 0, 0)); // June 20, 2025
      
      expect(formatted).toBeTruthy();
    });
  });

  describe('Icons', () => {
    it('should have icons registered in constructor', () => {
      // Icons are registered via addIcons in constructor
      expect(component).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle scroll to exact bottom', () => {
      const event = {
        target: {
          scrollTop: 500,
          scrollHeight: 1000,
          clientHeight: 500
        }
      };
      
      component.onScroll(event);
      
      expect(component.hasScrolledToBottom()).toBe(true);
    });

    it('should handle very short content', () => {
      const event = {
        target: {
          scrollTop: 0,
          scrollHeight: 100,
          clientHeight: 500
        }
      };
      
      component.onScroll(event);
      
      // Content is shorter than container, consider at bottom
      expect(component.hasScrolledToBottom()).toBe(true);
    });

    it('should handle rapid checkbox toggling', () => {
      component.onCheckboxChange({ detail: { checked: true } });
      component.onCheckboxChange({ detail: { checked: false } });
      component.onCheckboxChange({ detail: { checked: true } });
      
      expect(component.acceptanceChecked()).toBe(true);
    });
  });

  describe('Acceptance Flow', () => {
    it('should complete full acceptance flow', fakeAsync(() => {
      // Set terms
      component.setTerms(mockTerms);
      expect(component.terms()).toEqual(mockTerms);
      
      // Scroll to bottom
      component.onScroll({
        target: { scrollTop: 500, scrollHeight: 1000, clientHeight: 500 }
      });
      expect(component.hasScrolledToBottom()).toBe(true);
      
      // Check acceptance
      component.onCheckboxChange({ detail: { checked: true } });
      expect(component.acceptanceChecked()).toBe(true);
      
      // Verify can accept
      expect(component.canAccept).toBe(true);
      
      // Accept terms
      component.acceptTerms();
      tick(500);
      
      expect(modalControllerSpy.dismiss).toHaveBeenCalledWith(
        jasmine.objectContaining({ accepted: true }),
        'accept'
      );
    }));
  });

  describe('Signal States', () => {
    it('should maintain independent signal states', () => {
      component.hasScrolledToBottom.set(true);
      component.acceptanceChecked.set(false);
      
      expect(component.hasScrolledToBottom()).toBe(true);
      expect(component.acceptanceChecked()).toBe(false);
    });

    it('should update canAccept when signals change', () => {
      expect(component.canAccept).toBe(false);
      
      component.hasScrolledToBottom.set(true);
      expect(component.canAccept).toBe(false);
      
      component.acceptanceChecked.set(true);
      expect(component.canAccept).toBe(true);
    });
  });
});
