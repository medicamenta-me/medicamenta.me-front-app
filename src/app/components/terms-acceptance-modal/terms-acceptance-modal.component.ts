import { Component, OnInit, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, 
  IonCheckbox, IonButton, IonSpinner, IonIcon, IonText,
  ModalController 
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { closeCircleOutline, checkmarkCircleOutline, alertCircleOutline } from 'ionicons/icons';
import { TermsOfUse } from '../../models/terms-of-use.model';

/**
 * TermsAcceptanceModalComponent
 * 
 * Blocking modal that forces user to:
 * 1. Scroll through entire terms content
 * 2. Check acceptance checkbox
 * 3. Click accept button
 * 
 * Cannot be dismissed without accepting.
 * Used when new terms version is published or user changes country.
 */
@Component({
  selector: 'app-terms-acceptance-modal',
  templateUrl: './terms-acceptance-modal.component.html',
  styleUrls: ['./terms-acceptance-modal.component.css'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonCheckbox,
    IonButton,
    IonSpinner,
    IonIcon,
    IonText
  ]
})
export class TermsAcceptanceModalComponent implements OnInit {
  @ViewChild('termsContent', { static: false }) termsContent: any;

  terms = signal<TermsOfUse | null>(null);
  hasScrolledToBottom = signal(false);
  acceptanceChecked = signal(false);
  isAccepting = signal(false);
  
  constructor(private modalController: ModalController) {
    addIcons({ closeCircleOutline, checkmarkCircleOutline, alertCircleOutline });
  }

  ngOnInit() {
    // Terms will be set via setTerms() method from parent
  }

  /**
   * Set the terms to display
   * Called by parent component/service before presenting modal
   */
  setTerms(terms: TermsOfUse) {
    this.terms.set(terms);
  }

  /**
   * Handle scroll event on terms content
   * Detect when user has scrolled to bottom
   */
  onScroll(event: any) {
    const element = event.target;
    const scrollTop = element.scrollTop;
    const scrollHeight = element.scrollHeight;
    const clientHeight = element.clientHeight;
    
    // Consider "scrolled to bottom" when within 50px of actual bottom
    // This accounts for rounding errors and different screen sizes
    const threshold = 50;
    const isAtBottom = (scrollTop + clientHeight) >= (scrollHeight - threshold);
    
    if (isAtBottom && !this.hasScrolledToBottom()) {
      console.log('✅ User has scrolled to bottom of terms');
      this.hasScrolledToBottom.set(true);
    }
  }

  /**
   * Handle checkbox change
   */
  onCheckboxChange(event: any) {
    this.acceptanceChecked.set(event.detail.checked);
  }

  /**
   * Check if accept button should be enabled
   * Requires: scrolled to bottom AND checkbox checked
   */
  get canAccept(): boolean {
    return this.hasScrolledToBottom() && this.acceptanceChecked();
  }

  /**
   * Accept terms
   * Closes modal and returns acceptance=true
   */
  async acceptTerms() {
    if (!this.canAccept) return;
    
    this.isAccepting.set(true);
    
    // Small delay to show loading state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await this.modalController.dismiss({
      accepted: true,
      terms: this.terms()
    }, 'accept');
  }

  /**
   * Prevent modal dismissal
   * This modal CANNOT be closed without accepting
   */
  async preventDismiss() {
    // Do nothing - user must accept to close
    return false;
  }

  /**
   * Format date for display
   */
  formatDate(date: Date | undefined): string {
    if (!date) return '';
    return new Date(date).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
}
