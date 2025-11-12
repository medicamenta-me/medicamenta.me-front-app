import { Component, ChangeDetectionStrategy } from '@angular/core';
import { IonTabs, IonTabBar, IonTabButton, IonIcon, IonLabel } from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { addIcons } from 'ionicons';
import { listOutline, personOutline, homeOutline, newspaperOutline } from 'ionicons/icons';

@Component({
  selector: 'app-tabs',
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        
        <ion-tab-button tab="dashboard">
          <ion-icon name="home-outline"></ion-icon>
          <ion-label>{{ 'TABS.DASHBOARD' | translate }}</ion-label>
        </ion-tab-button>
        
        <ion-tab-button tab="medications">
          <ion-icon name="list-outline"></ion-icon>
          <ion-label>{{ 'TABS.MEDICATIONS' | translate }}</ion-label>
        </ion-tab-button>

        <ion-tab-button tab="history">
          <ion-icon name="newspaper-outline"></ion-icon>
          <ion-label>{{ 'TABS.HISTORY' | translate }}</ion-label>
        </ion-tab-button>
        
        <ion-tab-button tab="profile">
          <ion-icon name="person-outline"></ion-icon>
          <ion-label>{{ 'TABS.PROFILE' | translate }}</ion-label>
        </ion-tab-button>

      </ion-tab-bar>
    </ion-tabs>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel,
    TranslateModule
  ],
})
export class TabsComponent {
  constructor() {
    addIcons({ listOutline, personOutline, homeOutline, newspaperOutline });
  }
}
