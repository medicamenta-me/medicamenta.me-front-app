import { Component, OnInit, inject, signal } from '@angular/core';

import { IonicModule, ModalController, AlertController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';
import { EnterpriseService } from '../../services/enterprise.service';
import { TeamMember, TeamRole, Permissions, DEFAULT_PERMISSIONS } from '../../models/enterprise.model';
import { collection, query, where, getDocs } from 'firebase/firestore';

/**
 * Team Management Component
 * 
 * Gerenciamento de equipe para organizações Enterprise
 * - Listar membros
 * - Convidar novos membros
 * - Atribuir/alterar roles
 * - Customizar permissões
 * - Remover membros
 * 
 * @author Medicamenta.me Enterprise Team
 * @version 1.0
 */
@Component({
  selector: 'app-team-management',
  templateUrl: './team-management.component.html',
  styleUrls: ['./team-management.component.scss'],
  standalone: true,
  imports: [IonicModule, FormsModule, TranslateModule]
})
export class TeamManagementComponent implements OnInit {
  private readonly enterpriseService = inject(EnterpriseService);
  private readonly router = inject(Router);
  private readonly modalController = inject(ModalController);
  private readonly alertController = inject(AlertController);
  private readonly translate = inject(TranslateService);

  // Signals
  protected readonly teamMembers = this.enterpriseService.teamMembers;
  protected readonly organization = this.enterpriseService.currentOrganization;
  protected readonly canManageTeam = this.enterpriseService.canManageTeam;
  protected readonly isLoading = signal(false);
  protected readonly searchTerm = signal('');
  protected readonly selectedRole = signal<TeamRole | 'all'>('all');

  // Modal state
  protected readonly showInviteModal = signal(false);
  protected readonly inviteEmail = signal('');
  protected readonly inviteRole = signal<TeamRole>('caregiver');
  protected readonly inviteDepartment = signal('');
  protected readonly inviteShift = signal<'morning' | 'afternoon' | 'night' | 'rotating'>('morning');

  // Edit permissions modal state
  protected readonly editingMember = signal<TeamMember | null>(null);
  protected readonly customPermissions = signal<Permissions | null>(null);

  protected readonly roles: TeamRole[] = ['admin', 'manager', 'nurse', 'caregiver', 'doctor', 'pharmacist', 'viewer'];

  async ngOnInit() {
    // Verificar acesso
    if (!this.enterpriseService.isEnterprise()) {
      await this.router.navigate(['/tabs/dashboard']);
      return;
    }

    if (!this.enterpriseService.hasFeature('teamManagement')) {
      await this.router.navigate(['/tabs/dashboard']);
      return;
    }
  }

  /**
   * Filtra membros
   */
  get filteredMembers(): TeamMember[] {
    let members = this.teamMembers();

    // Filtro de busca
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      members = members.filter(m =>
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term)
      );
    }

    // Filtro de role
    if (this.selectedRole() !== 'all') {
      members = members.filter(m => m.role === this.selectedRole());
    }

    return members;
  }

  /**
   * Abre modal de convite
   */
  openInviteModal() {
    this.showInviteModal.set(true);
    this.inviteEmail.set('');
    this.inviteRole.set('caregiver');
    this.inviteDepartment.set('');
  }

  /**
   * Fecha modal de convite
   */
  closeInviteModal() {
    this.showInviteModal.set(false);
  }

  /**
   * Convida membro
   */
  async inviteMember() {
    const email = this.inviteEmail().trim();
    if (!email) {
      const message = await firstValueFrom(this.translate.get('TEAM_MANAGEMENT.MESSAGES.EMAIL_REQUIRED'));
      await this.showAlert(await firstValueFrom(this.translate.get('COMMON.ERROR')), message);
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      const message = await firstValueFrom(this.translate.get('TEAM_MANAGEMENT.MESSAGES.EMAIL_INVALID'));
      await this.showAlert(await firstValueFrom(this.translate.get('COMMON.ERROR')), message);
      return;
    }

    this.isLoading.set(true);

    try {
      // Buscar userId pelo email na collection users
      const usersRef = collection(this.enterpriseService['firebaseService'].firestore, 'users');
      const emailQuery = query(usersRef, where('email', '==', email));
      const querySnapshot = await getDocs(emailQuery);

      if (querySnapshot.empty) {
        const message = await firstValueFrom(
          this.translate.get('TEAM_MANAGEMENT.MESSAGES.USER_NOT_FOUND', { email })
        );
        await this.showAlert(await firstValueFrom(this.translate.get('COMMON.ERROR')), message);
        return;
      }

      // Pegar o primeiro usuário encontrado
      const userDoc = querySnapshot.docs[0];
      const userId = userDoc.id;
      const userData = userDoc.data();

      // Verificar se já é membro da equipe
      const existingMember = this.teamMembers().find(m => m.userId === userId);
      if (existingMember) {
        const message = await firstValueFrom(
          this.translate.get('TEAM_MANAGEMENT.MESSAGES.ALREADY_MEMBER', { name: userData['name'] || email })
        );
        await this.showAlert(await firstValueFrom(this.translate.get('COMMON.ERROR')), message);
        return;
      }

      // Adicionar membro à equipe
      await this.enterpriseService.addTeamMember({
        organizationId: this.organization()!.id,
        userId,
        role: this.inviteRole(),
        assignedPatientIds: [],
        department: this.inviteDepartment() || undefined,
        shift: this.inviteShift()
      });

      const message = await firstValueFrom(
        this.translate.get('TEAM_MANAGEMENT.MESSAGES.INVITE_SUCCESS', { name: userData['name'] || email })
      );
      await this.showAlert(await firstValueFrom(this.translate.get('COMMON.SUCCESS')), message);
      this.closeInviteModal();

    } catch (error: any) {
      console.error('[TeamManagement] Error inviting member:', error);
      const message = await firstValueFrom(this.translate.get('TEAM_MANAGEMENT.MESSAGES.INVITE_ERROR'));
      await this.showAlert(await firstValueFrom(this.translate.get('COMMON.ERROR')), error.message || message);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Muda role do membro
   */
  async changeRole(member: TeamMember) {
    const headerText = await firstValueFrom(this.translate.get('TEAM_MANAGEMENT.MESSAGES.CHANGE_ROLE_TITLE'));
    const messageText = await firstValueFrom(
      this.translate.get('TEAM_MANAGEMENT.MESSAGES.CHANGE_ROLE_MESSAGE', { name: member.name })
    );
    const cancelText = await firstValueFrom(this.translate.get('COMMON.CANCEL'));
    const confirmText = await firstValueFrom(this.translate.get('COMMON.CONFIRM'));

    const alert = await this.alertController.create({
      header: headerText,
      message: messageText,
      inputs: this.roles.map(role => ({
        type: 'radio' as const,
        label: this.getRoleLabel(role),
        value: role,
        checked: member.role === role
      })),
      buttons: [
        {
          text: cancelText,
          role: 'cancel'
        },
        {
          text: confirmText,
          handler: async (newRole: TeamRole) => {
            if (newRole && newRole !== member.role) {
              this.isLoading.set(true);
              try {
                await this.enterpriseService.updateMemberRole(member.id, newRole);
                const successMsg = await firstValueFrom(
                  this.translate.get('TEAM_MANAGEMENT.MESSAGES.ROLE_UPDATE_SUCCESS', { role: this.getRoleLabel(newRole) })
                );
                await this.showAlert(await firstValueFrom(this.translate.get('COMMON.SUCCESS')), successMsg);
              } catch (error: any) {
                const errorMsg = await firstValueFrom(this.translate.get('TEAM_MANAGEMENT.MESSAGES.ROLE_UPDATE_ERROR'));
                await this.showAlert(await firstValueFrom(this.translate.get('COMMON.ERROR')), error.message || errorMsg);
              } finally {
                this.isLoading.set(false);
              }
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Abre modal de permissões customizadas
   */
  editPermissions(member: TeamMember) {
    this.editingMember.set(member);
    this.customPermissions.set({ ...member.permissions });
  }

  /**
   * Fecha modal de permissões
   */
  closePermissionsModal() {
    this.editingMember.set(null);
    this.customPermissions.set(null);
  }

  /**
   * Salva permissões customizadas
   */
  async savePermissions() {
    const member = this.editingMember();
    const perms = this.customPermissions();

    if (!member || !perms) return;

    this.isLoading.set(true);

    try {
      await this.enterpriseService.updateMemberPermissions(member.id, perms);
      const successMsg = await firstValueFrom(this.translate.get('TEAM_MANAGEMENT.MESSAGES.PERMISSIONS_UPDATE_SUCCESS'));
      await this.showAlert(await firstValueFrom(this.translate.get('COMMON.SUCCESS')), successMsg);
      this.closePermissionsModal();

    } catch (error: any) {
      console.error('[TeamManagement] Error updating permissions:', error);
      const errorMsg = await firstValueFrom(this.translate.get('TEAM_MANAGEMENT.MESSAGES.PERMISSIONS_UPDATE_ERROR'));
      await this.showAlert(await firstValueFrom(this.translate.get('COMMON.ERROR')), error.message || errorMsg);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Remove membro
   */
  async removeMember(member: TeamMember) {
    const headerText = await firstValueFrom(this.translate.get('COMMON.DELETE'));
    const messageText = `Tem certeza que deseja remover ${member.name} da equipe?`;
    const cancelText = await firstValueFrom(this.translate.get('COMMON.CANCEL'));
    const removeText = await firstValueFrom(this.translate.get('COMMON.DELETE'));

    const alert = await this.alertController.create({
      header: headerText,
      message: messageText,
      buttons: [
        {
          text: cancelText,
          role: 'cancel'
        },
        {
          text: removeText,
          role: 'destructive',
          handler: async () => {
            this.isLoading.set(true);
            try {
              await this.enterpriseService.removeMember(member.id);
              const successMsg = await firstValueFrom(this.translate.get('TEAM_MANAGEMENT.MESSAGES.MEMBER_REMOVE_SUCCESS'));
              await this.showAlert(await firstValueFrom(this.translate.get('COMMON.SUCCESS')), successMsg);
            } catch (error: any) {
              const errorMsg = await firstValueFrom(this.translate.get('TEAM_MANAGEMENT.MESSAGES.MEMBER_REMOVE_ERROR'));
              await this.showAlert(await firstValueFrom(this.translate.get('COMMON.ERROR')), error.message || errorMsg);
            } finally {
              this.isLoading.set(false);
            }
          }
        }
      ]
    });

    await alert.present();
  }

  /**
   * Retorna label do role
   */
  getRoleLabel(role: TeamRole): string {
    const labels: Record<TeamRole, string> = {
      admin: 'Administrador',
      manager: 'Gerente',
      nurse: 'Enfermeiro(a)',
      caregiver: 'Cuidador(a)',
      doctor: 'Médico(a)',
      pharmacist: 'Farmacêutico(a)',
      viewer: 'Visualizador'
    };
    return labels[role];
  }

  /**
   * Retorna ícone do role
   */
  getRoleIcon(role: TeamRole): string {
    const icons: Record<TeamRole, string> = {
      admin: 'shield-checkmark',
      manager: 'briefcase',
      nurse: 'medkit',
      caregiver: 'heart',
      doctor: 'fitness',
      pharmacist: 'flask',
      viewer: 'eye'
    };
    return icons[role];
  }

  /**
   * Retorna cor do role
   */
  getRoleColor(role: TeamRole): string {
    const colors: Record<TeamRole, string> = {
      admin: 'danger',
      manager: 'primary',
      nurse: 'success',
      caregiver: 'tertiary',
      doctor: 'secondary',
      pharmacist: 'warning',
      viewer: 'medium'
    };
    return colors[role];
  }

  /**
   * Retorna permissões do role
   */
  getRolePermissions(role: TeamRole): Permissions {
    return DEFAULT_PERMISSIONS[role];
  }

  /**
   * Conta permissões ativas
   */
  countActivePermissions(permissions: Permissions): number {
    return Object.values(permissions).filter(v => v === true).length;
  }

  /**
   * Mostra alert
   */
  private async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
