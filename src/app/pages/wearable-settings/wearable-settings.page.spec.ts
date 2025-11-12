import { ComponentFixture, TestBed } from '@angular/core/testing';
import { WearableSettingsPage } from './wearable-settings.page';

describe('WearableSettingsPage', () => {
  let component: WearableSettingsPage;
  let fixture: ComponentFixture<WearableSettingsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(WearableSettingsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
