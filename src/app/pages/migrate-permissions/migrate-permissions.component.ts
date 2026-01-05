import { Component, inject } from '@angular/core';
import { IonHeader, IonToolbar, IonTitle, IonContent, IonButton, IonList, IonItem, IonLabel, IonProgressBar } from '@ionic/angular/standalone';

import { FirebaseService } from '../../services/firebase.service';
import { LogService } from '../../services/log.service';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

interface MigrationResult {
  userId: string;
  email: string;
  status: 'success' | 'skipped' | 'error';
  carersCount?: number;
  error?: string;
}

@Component({
  selector: 'app-migrate-permissions',
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonList,
    IonItem,
    IonLabel,
    IonProgressBar
],
  template: `
    <ion-header>
      <ion-toolbar color="primary">
        <ion-title>Migração de Permissões</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <h2>Migrar campo whoCareForMeIds</h2>
      <p>Este processo irá adicionar o campo <code>whoCareForMeIds</code> a todos os documentos de usuários que não o possuem.</p>

      @if (isRunning) {
        <ion-progress-bar type="indeterminate"></ion-progress-bar>
        <p>Migrando... {{ processedCount }} / {{ totalCount }}</p>
      }

      @if (!isRunning && results.length === 0) {
        <ion-button expand="block" (click)="runMigration()">
          Iniciar Migração
        </ion-button>
      }

      @if (results.length > 0) {
        <h3>Resultados:</h3>
        <p>
          ✅ Sucesso: {{ successCount }} | 
          ⏭️ Ignorados: {{ skippedCount }} | 
          ❌ Erros: {{ errorCount }}
        </p>

        <ion-list>
          @for (result of results; track result.userId) {
            <ion-item>
              <ion-label>
                <h3>{{ result.email }}</h3>
                <p>{{ result.userId }}</p>
                @if (result.status === 'success') {
                  <p style="color: green;">✅ Migrado - {{ result.carersCount }} cuidadores</p>
                } @else if (result.status === 'skipped') {
                  <p style="color: orange;">⏭️ Já possui o campo</p>
                } @else {
                  <p style="color: red;">❌ Erro: {{ result.error }}</p>
                }
              </ion-label>
            </ion-item>
          }
        </ion-list>

        <ion-button expand="block" (click)="reset()">
          Limpar Resultados
        </ion-button>
      }
    </ion-content>
  `,
  styles: [`
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }

    h3 {
      margin-top: 20px;
    }
  `]
})
export class MigratePermissionsComponent {
  private readonly firebaseService = inject(FirebaseService);
  private readonly logService = inject(LogService);

  isRunning = false;
  results: MigrationResult[] = [];
  processedCount = 0;
  totalCount = 0;

  get successCount() {
    return this.results.filter(r => r.status === 'success').length;
  }

  get skippedCount() {
    return this.results.filter(r => r.status === 'skipped').length;
  }

  get errorCount() {
    return this.results.filter(r => r.status === 'error').length;
  }

  async runMigration() {
    this.isRunning = true;
    this.results = [];
    this.processedCount = 0;

    try {
      const firestore = this.firebaseService.firestore;
      const usersCol = collection(firestore, 'users');
      const snapshot = await getDocs(usersCol);

      this.totalCount = snapshot.size;
      this.logService.info('MigratePermissions', 'Migration started', { totalUsers: this.totalCount });

      for (const userDoc of snapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const email = userData['email'] || 'unknown';

        try {
          const existingIds = userData['whoCareForMeIds'];
          const whoCareForMe = userData['whoCareForMe'] || [];

          if (existingIds !== undefined && existingIds !== null) {
            this.results.push({
              userId,
              email,
              status: 'skipped'
            });
            this.logService.info('MigratePermissions', 'User skipped - field already exists', { email });
          } else {
            // Extract IDs from whoCareForMe array
            const carerIds = whoCareForMe.map((carer: any) => carer.userId);

            // Update document
            const userRef = doc(firestore, 'users', userId);
            await updateDoc(userRef, {
              whoCareForMeIds: carerIds
            });

            this.results.push({
              userId,
              email,
              status: 'success',
              carersCount: carerIds.length
            });
            this.logService.info('MigratePermissions', 'User migrated successfully', { email, carersCount: carerIds.length });
          }
        } catch (error: any) {
          this.results.push({
            userId,
            email,
            status: 'error',
            error: error.message
          });
          console.error(`[Migration] ❌ Error migrating ${email}:`, error);
        }

        this.processedCount++;
      }

      this.logService.info('MigratePermissions', 'Migration complete', {
        success: this.successCount,
        skipped: this.skippedCount,
        errors: this.errorCount,
        total: this.totalCount
      });

    } catch (error) {
      console.error('[Migration] 💥 Failed:', error);
      alert('Erro na migração: ' + error);
    } finally {
      this.isRunning = false;
    }
  }

  reset() {
    this.results = [];
    this.processedCount = 0;
    this.totalCount = 0;
  }
}
