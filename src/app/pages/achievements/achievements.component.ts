import { Component } from '@angular/core';

import { IonicModule } from '@ionic/angular';
import { AchievementListComponent } from '../../components/achievement-list/achievement-list.component';

/**
 * Achievements Page
 * Full page for displaying all user achievements
 */
@Component({
  selector: 'app-achievements-page',
  standalone: true,
  imports: [IonicModule, AchievementListComponent],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/tabs/dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title>Conquistas</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <app-achievement-list />
    </ion-content>
  `,
  styles: []
})
export class AchievementsPage {}
