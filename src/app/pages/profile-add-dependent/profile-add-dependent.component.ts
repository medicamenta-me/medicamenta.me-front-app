import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonSelect,
  IonSelectOption
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline } from 'ionicons/icons';

@Component({
  selector: 'app-profile-add-dependent',
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title class="app-title">
          <span class="app-logo">medicamenta.me</span>
        </ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/profile"></ion-back-button>
        </ion-buttons>
        <ion-title>Add Dependent</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="addDependent()" [disabled]="dependentForm.invalid">
            <ion-icon slot="icon-only" name="save-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <form [formGroup]="dependentForm" (ngSubmit)="addDependent()">
        <ion-list [inset]="true">
          <ion-item>
            <ion-input label="Full Name" label-placement="floating" formControlName="name" required></ion-input>
          </ion-item>
          <ion-item>
            <ion-select label="Relationship" label-placement="floating" formControlName="relationship" required>
              <ion-select-option value="Spouse">Spouse</ion-select-option>
              <ion-select-option value="Child">Child</ion-select-option>
              <ion-select-option value="Parent">Parent</ion-select-option>
              <ion-select-option value="Sibling">Sibling</ion-select-option>
              <ion-select-option value="Other">Other</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>
      </form>
    </ion-content>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    IonIcon,
    IonButtons,
    IonBackButton,
    IonSelect,
    IonSelectOption
  ],
})
export class ProfileAddDependentComponent {
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  
  dependentForm: FormGroup;

  constructor() {
    addIcons({ saveOutline });
    this.dependentForm = this.fb.group({
      name: ['', Validators.required],
      relationship: ['', Validators.required],
    });
  }

  async addDependent() {
    if (this.dependentForm.invalid) {
      return;
    }
    const newDependent = {
      ...this.dependentForm.value,
      avatarUrl: `https://picsum.photos/seed/${Date.now()}/128/128`,
    };
    await this.userService.addDependent(newDependent);
    this.router.navigate(['/tabs/profile']);
  }
}
