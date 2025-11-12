import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { SmartSuggestionsModalComponent } from './smart-suggestions-modal.component';

describe('SmartSuggestionsModalComponent', () => {
  let component: SmartSuggestionsModalComponent;
  let fixture: ComponentFixture<SmartSuggestionsModalComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [SmartSuggestionsModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SmartSuggestionsModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
