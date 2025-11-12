import { Component, ChangeDetectionStrategy, inject, effect, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { Dependent } from '../../models/user.model';
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
  IonSelectOption,
  ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { saveOutline } from 'ionicons/icons';

@Component({
  selector: 'app-profile-edit-dependent',
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
        <ion-title>Edit Dependent</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="saveDependent()" [disabled]="!dependentForm || dependentForm.invalid">
            <ion-icon slot="icon-only" name="save-outline"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      @if (dependentForm) {
        <form [formGroup]="dependentForm" (ngSubmit)="saveDependent()">
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
      } @else {
        <p>Loading dependent...</p>
      }
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
export class ProfileEditDependentComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly userService = inject(UserService);
  private readonly toastController = inject(ToastController);
  
  dependentForm!: FormGroup;
  private readonly dependent = signal<Dependent | undefined>(undefined);

  constructor() {
    addIcons({ saveOutline });
    const dependentId = this.route.snapshot.paramMap.get('id');

    effect(() => {
      const user = this.userService.currentUser();
      if (user) {
        const foundDependent = user.dependents.find(d => d.id === dependentId);
        this.dependent.set(foundDependent);

        if (foundDependent && !this.dependentForm) {
           this.dependentForm = this.fb.group({
            name: [foundDependent.name, Validators.required],
            relationship: [foundDependent.relationship, Validators.required],
          });
        } else if (!foundDependent) {
            // This can happen if data is stale, navigate away
            this.router.navigate(['/tabs/profile']);
        }
      }
    });
  }

  async saveDependent() {
    const currentDependent = this.dependent();
    if (this.dependentForm.invalid || !currentDependent) {
      return;
    }
    
    const updatedDependent: Dependent = {
      ...currentDependent,
      ...this.dependentForm.value,
    };
    
    try {
      await this.userService.updateDependent(updatedDependent);
      const toast = await this.toastController.create({
        message: 'Dependent updated successfully.',
        duration: 2000,
        color: 'success'
      });
      await toast.present();
      this.router.navigate(['/tabs/profile']);
    } catch (error: any) {
      const toast = await this.toastController.create({
        message: `Error updating dependent: ${error.message}`,
        duration: 3000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}