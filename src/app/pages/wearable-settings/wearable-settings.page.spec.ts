import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { WearableSettingsPage } from './wearable-settings.page';
import { LogService } from '../../services/log.service';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../services/analytics.service';
import { UserService } from '../../services/user.service';
import { WearableService } from '../../services/wearable.service';

describe('WearableSettingsPage', () => {
  let component: WearableSettingsPage;
  let fixture: ComponentFixture<WearableSettingsPage>;

  beforeEach(() => {
    // Create mocks for circular dependency chain
    const mockLogService = jasmine.createSpyObj('LogService', ['debug', 'info', 'warn', 'error', 'log']);
    const mockAuthService = jasmine.createSpyObj('AuthService', ['getCurrentUser', 'isAuthenticated']);
    mockAuthService.currentUser = jasmine.createSpy('currentUser').and.returnValue(null); // Signal
    const mockAnalyticsService = jasmine.createSpyObj('AnalyticsService', ['logEvent', 'setUserProperties']);
    const mockUserService = jasmine.createSpyObj('UserService', ['getCurrentUser', 'updateUser']);
    mockUserService.currentUser = jasmine.createSpy('currentUser').and.returnValue(null); // Signal
    const mockWearableService = jasmine.createSpyObj('WearableService', ['getConnectedDevices', 'syncData']);
    mockWearableService.isSupported = jasmine.createSpy('isSupported').and.returnValue(false); // Signal

    TestBed.configureTestingModule({
      imports: [
        WearableSettingsPage,
        TranslateModule.forRoot()
      ],
      providers: [
        { provide: LogService, useValue: mockLogService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: AnalyticsService, useValue: mockAnalyticsService },
        { provide: UserService, useValue: mockUserService },
        { provide: WearableService, useValue: mockWearableService }
      ]
    });

    fixture = TestBed.createComponent(WearableSettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
