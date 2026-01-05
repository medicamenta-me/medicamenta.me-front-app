/**
 * 🧪 PwaInstallPromptComponent Tests
 *
 * Testes unitários para o componente de prompt de instalação PWA.
 * Cobertura: visibilidade, instalação, iOS instruções, dismiss.
 *
 * @version 1.0.0
 * @date 04/01/2026
 */

import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { Observable, of } from 'rxjs';

class FakeTranslateLoader implements TranslateLoader {
  getTranslation(lang: string): Observable<any> { return of({}); }
}

import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { PwaInstallPromptComponent } from './pwa-install-prompt.component';
import { PwaInstallService } from '../../services/pwa-install.service';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

describe('PwaInstallPromptComponent', () => {
  let component: PwaInstallPromptComponent;
  let fixture: ComponentFixture<PwaInstallPromptComponent>;
  let pwaInstallServiceSpy: jasmine.SpyObj<PwaInstallService>;

  beforeEach(async () => {
    pwaInstallServiceSpy = jasmine.createSpyObj('PwaInstallService', [
      'shouldSuggestInstall',
      'getPlatform',
      'showInstallPrompt'
    ]);
    pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(false);
    pwaInstallServiceSpy.getPlatform.and.returnValue('android');
    pwaInstallServiceSpy.showInstallPrompt.and.returnValue(Promise.resolve('accepted'));

    await TestBed.configureTestingModule({
      imports: [PwaInstallPromptComponent,
        TranslateModule.forRoot({ loader: { provide: TranslateLoader, useClass: FakeTranslateLoader } })
      ],
      providers: [
        { provide: PwaInstallService, useValue: pwaInstallServiceSpy }
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(PwaInstallPromptComponent);
    component = fixture.componentInstance;
  });

  // ============================================================================
  // INITIALIZATION TESTS
  // ============================================================================

  describe('Initialization', () => {
    it('should create', () => {
      expect(component).toBeTruthy();
    });

    it('should not show prompt initially', () => {
      fixture.detectChanges();
      expect(component.shouldShow()).toBe(false);
    });

    it('should not show iOS instructions initially', () => {
      fixture.detectChanges();
      expect(component.showIOSInstructions()).toBe(false);
    });
  });

  // ============================================================================
  // SHOW PROMPT TESTS (after delay)
  // ============================================================================

  describe('Show Prompt After Delay', () => {
    it('should show prompt after 3 seconds if shouldSuggestInstall returns true', fakeAsync(() => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(true);
      fixture.detectChanges();
      component.ngOnInit();
      
      expect(component.shouldShow()).toBe(false);
      
      tick(3500); // Wait for setTimeout
      fixture.detectChanges();
      
      expect(component.shouldShow()).toBe(true);
    }));

    it('should not show prompt if shouldSuggestInstall returns false', fakeAsync(() => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(false);
      fixture.detectChanges();
      component.ngOnInit();
      
      tick(3500);
      fixture.detectChanges();
      
      expect(component.shouldShow()).toBe(false);
    }));
  });

  // ============================================================================
  // INSTALL TESTS
  // ============================================================================

  describe('Install', () => {
    beforeEach(fakeAsync(() => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(true);
      fixture.detectChanges();
      component.ngOnInit();
      tick(3500);
      fixture.detectChanges();
    }));

    it('should call showInstallPrompt for android', async () => {
      pwaInstallServiceSpy.getPlatform.and.returnValue('android');
      pwaInstallServiceSpy.showInstallPrompt.and.returnValue(Promise.resolve('accepted'));
      
      await component.install();
      
      expect(pwaInstallServiceSpy.showInstallPrompt).toHaveBeenCalled();
    });

    it('should hide prompt after accepted', fakeAsync(async () => {
      pwaInstallServiceSpy.getPlatform.and.returnValue('android');
      pwaInstallServiceSpy.showInstallPrompt.and.returnValue(Promise.resolve('accepted'));
      
      await component.install();
      tick();
      
      expect(component.shouldShow()).toBe(false);
    }));

    it('should hide prompt after dismissed', fakeAsync(async () => {
      pwaInstallServiceSpy.getPlatform.and.returnValue('android');
      pwaInstallServiceSpy.showInstallPrompt.and.returnValue(Promise.resolve('dismissed'));
      
      await component.install();
      tick();
      
      expect(component.shouldShow()).toBe(false);
    }));

    it('should show iOS instructions for iOS platform', fakeAsync(async () => {
      pwaInstallServiceSpy.getPlatform.and.returnValue('ios');
      
      await component.install();
      tick();
      
      expect(component.showIOSInstructions()).toBe(true);
      expect(pwaInstallServiceSpy.showInstallPrompt).not.toHaveBeenCalled();
    }));

    it('should call showInstallPrompt for desktop', async () => {
      pwaInstallServiceSpy.getPlatform.and.returnValue('desktop');
      pwaInstallServiceSpy.showInstallPrompt.and.returnValue(Promise.resolve('accepted'));
      
      await component.install();
      
      expect(pwaInstallServiceSpy.showInstallPrompt).toHaveBeenCalled();
    });
  });

  // ============================================================================
  // DISMISS TESTS
  // ============================================================================

  describe('Dismiss', () => {
    beforeEach(fakeAsync(() => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(true);
      fixture.detectChanges();
      component.ngOnInit();
      tick(3500);
      fixture.detectChanges();
    }));

    it('should hide prompt when dismissed', () => {
      expect(component.shouldShow()).toBe(true);
      
      component.dismiss();
      
      expect(component.shouldShow()).toBe(false);
    });
  });

  // ============================================================================
  // CLOSE iOS INSTRUCTIONS TESTS
  // ============================================================================

  describe('Close iOS Instructions', () => {
    beforeEach(fakeAsync(async () => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(true);
      pwaInstallServiceSpy.getPlatform.and.returnValue('ios');
      fixture.detectChanges();
      component.ngOnInit();
      tick(3500);
      fixture.detectChanges();
      await component.install();
    }));

    it('should close iOS instructions', () => {
      expect(component.showIOSInstructions()).toBe(true);
      
      component.closeIOSInstructions();
      
      expect(component.showIOSInstructions()).toBe(false);
    });

    it('should also hide main prompt when closing iOS instructions', () => {
      component.closeIOSInstructions();
      
      expect(component.shouldShow()).toBe(false);
    });
  });

  // ============================================================================
  // DOM RENDERING TESTS
  // ============================================================================

  describe('DOM Rendering', () => {
    it('should not render banner when shouldShow is false', () => {
      fixture.detectChanges();
      
      const banner = fixture.nativeElement.querySelector('.install-prompt-banner');
      expect(banner).toBeFalsy();
    });

    it('should render banner when shouldShow is true', fakeAsync(() => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(true);
      component.ngOnInit();
      tick(3500);
      fixture.detectChanges();
      
      const banner = fixture.nativeElement.querySelector('.install-prompt-banner');
      expect(banner).toBeTruthy();
    }));

    it('should not render iOS modal when showIOSInstructions is false', () => {
      fixture.detectChanges();
      
      const modal = fixture.nativeElement.querySelector('.ios-install-modal');
      expect(modal).toBeFalsy();
    });

    it('should render iOS modal when showIOSInstructions is true', fakeAsync(async () => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(true);
      pwaInstallServiceSpy.getPlatform.and.returnValue('ios');
      component.ngOnInit();
      tick(3500);
      fixture.detectChanges();
      await component.install();
      fixture.detectChanges();
      
      const modal = fixture.nativeElement.querySelector('.ios-install-modal');
      expect(modal).toBeTruthy();
    }));

    it('should render install buttons in banner', fakeAsync(() => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(true);
      component.ngOnInit();
      tick(3500);
      fixture.detectChanges();
      
      const buttons = fixture.nativeElement.querySelectorAll('.install-prompt-actions ion-button');
      expect(buttons.length).toBe(2);
    }));

    it('should render close button in banner', fakeAsync(() => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(true);
      component.ngOnInit();
      tick(3500);
      fixture.detectChanges();
      
      const closeBtn = fixture.nativeElement.querySelector('.install-prompt-close');
      expect(closeBtn).toBeTruthy();
    }));
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases', () => {
    it('should handle install prompt returning undefined', fakeAsync(async () => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(true);
      pwaInstallServiceSpy.getPlatform.and.returnValue('android');
      pwaInstallServiceSpy.showInstallPrompt.and.returnValue(Promise.resolve(undefined as any));
      component.ngOnInit();
      tick(3500);
      fixture.detectChanges();
      
      await component.install();
      tick();
      
      // Should not hide if result is undefined
      expect(component.shouldShow()).toBe(true);
    }));

    it('should handle install prompt error', async () => {
      pwaInstallServiceSpy.shouldSuggestInstall.and.returnValue(true);
      pwaInstallServiceSpy.getPlatform.and.returnValue('android');
      pwaInstallServiceSpy.showInstallPrompt.and.returnValue(Promise.reject(new Error('Failed')));
      
      // Use jasmine clock for timeouts
      jasmine.clock().install();
      component.ngOnInit();
      jasmine.clock().tick(3500);
      fixture.detectChanges();
      jasmine.clock().uninstall();
      
      // Call install and properly await the rejection
      try {
        await component.install();
      } catch {
        // Expected error
      }
      
      // Should still be showing after error
      expect(component.shouldShow()).toBe(true);
    });
  });
});

