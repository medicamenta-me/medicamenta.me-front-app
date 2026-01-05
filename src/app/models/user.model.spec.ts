import {
  User,
  Dependent,
  CarePermissions,
  CareForUser,
  CarerUser,
  CareInvite,
  OnboardingSteps,
  GeoLocation,
  TermsAcceptance
} from './user.model';

describe('UserModel', () => {
  describe('Dependent interface', () => {
    it('should create basic dependent', () => {
      const dependent: Dependent = {
        id: 'dep1',
        name: 'João Silva',
        relationship: 'Filho',
        avatarUrl: 'https://example.com/avatar.jpg'
      };

      expect(dependent.id).toBe('dep1');
      expect(dependent.name).toBe('João Silva');
      expect(dependent.relationship).toBe('Filho');
      expect(dependent.avatarUrl).toBeDefined();
    });

    it('should create dependent with personal data', () => {
      const dependent: Dependent = {
        id: 'dep2',
        name: 'Maria Santos',
        relationship: 'Mãe',
        avatarUrl: '',
        country: 'BR',
        document: '123.456.789-00',
        documentType: 'CPF',
        birthDate: '1950-05-15',
        gender: 'female'
      };

      expect(dependent.country).toBe('BR');
      expect(dependent.documentType).toBe('CPF');
      expect(dependent.gender).toBe('female');
    });

    it('should create dependent with health data', () => {
      const dependent: Dependent = {
        id: 'dep3',
        name: 'Pedro',
        relationship: 'Avô',
        avatarUrl: '',
        bloodType: 'O+',
        allergies: 'Penicilina, Aspirina',
        healthNotes: 'Diabético tipo 2'
      };

      expect(dependent.bloodType).toBe('O+');
      expect(dependent.allergies).toContain('Penicilina');
      expect(dependent.healthNotes).toContain('Diabético');
    });

    it('should create dependent with contact data', () => {
      const dependent: Dependent = {
        id: 'dep4',
        name: 'Ana',
        relationship: 'Tia',
        avatarUrl: '',
        phone: '+5511999999999',
        emergencyContact: '+5511888888888',
        emergencyContactName: 'Carlos (Marido)'
      };

      expect(dependent.phone).toBe('+5511999999999');
      expect(dependent.emergencyContact).toBeDefined();
      expect(dependent.emergencyContactName).toContain('Carlos');
    });

    it('should accept all gender options', () => {
      const genders: Array<Dependent['gender']> = ['male', 'female', 'other', 'prefer-not-say'];

      genders.forEach(gender => {
        const dependent: Dependent = {
          id: 'test',
          name: 'Test',
          relationship: 'Test',
          avatarUrl: '',
          gender
        };
        expect(dependent.gender).toBe(gender);
      });
    });
  });

  describe('CarePermissions interface', () => {
    it('should create view-only permissions', () => {
      const permissions: CarePermissions = {
        view: true,
        register: false,
        administer: false
      };

      expect(permissions.view).toBe(true);
      expect(permissions.register).toBe(false);
      expect(permissions.administer).toBe(false);
    });

    it('should create full permissions', () => {
      const permissions: CarePermissions = {
        view: true,
        register: true,
        administer: true
      };

      expect(permissions.view).toBe(true);
      expect(permissions.register).toBe(true);
      expect(permissions.administer).toBe(true);
    });

    it('should create register-only permissions', () => {
      const permissions: CarePermissions = {
        view: true,
        register: true,
        administer: false
      };

      expect(permissions.register).toBe(true);
      expect(permissions.administer).toBe(false);
    });

    it('should create administer-only permissions', () => {
      const permissions: CarePermissions = {
        view: true,
        register: false,
        administer: true
      };

      expect(permissions.register).toBe(false);
      expect(permissions.administer).toBe(true);
    });
  });

  describe('CareForUser interface', () => {
    it('should create active care relationship', () => {
      const careFor: CareForUser = {
        userId: 'user123',
        name: 'Maria Santos',
        email: 'maria@example.com',
        addedAt: new Date(),
        status: 'active',
        isRegisteredUser: true
      };

      expect(careFor.status).toBe('active');
      expect(careFor.isRegisteredUser).toBe(true);
    });

    it('should create pending care relationship', () => {
      const careFor: CareForUser = {
        userId: 'pending123',
        name: 'José Carlos',
        email: 'jose@example.com',
        addedAt: new Date(),
        status: 'pending',
        isRegisteredUser: false
      };

      expect(careFor.status).toBe('pending');
      expect(careFor.isRegisteredUser).toBe(false);
    });

    it('should include optional phone and country', () => {
      const careFor: CareForUser = {
        userId: 'user456',
        name: 'Ana',
        email: 'ana@example.com',
        phone: '+5511999999999',
        country: 'BR',
        relationship: 'Mãe',
        addedAt: new Date(),
        status: 'active',
        isRegisteredUser: true
      };

      expect(careFor.phone).toBe('+5511999999999');
      expect(careFor.country).toBe('BR');
      expect(careFor.relationship).toBe('Mãe');
    });
  });

  describe('CarerUser interface', () => {
    it('should create carer with permissions', () => {
      const carer: CarerUser = {
        userId: 'carer123',
        name: 'Enfermeira Ana',
        email: 'ana@hospital.com',
        permissions: {
          view: true,
          register: true,
          administer: true
        },
        addedAt: new Date(),
        status: 'active'
      };

      expect(carer.permissions.view).toBe(true);
      expect(carer.permissions.register).toBe(true);
      expect(carer.permissions.administer).toBe(true);
      expect(carer.status).toBe('active');
    });

    it('should create carer with view-only permissions', () => {
      const carer: CarerUser = {
        userId: 'carer456',
        name: 'Familiar',
        email: 'familiar@example.com',
        permissions: {
          view: true,
          register: false,
          administer: false
        },
        addedAt: new Date(),
        status: 'active'
      };

      expect(carer.permissions.view).toBe(true);
      expect(carer.permissions.register).toBe(false);
      expect(carer.permissions.administer).toBe(false);
    });
  });

  describe('CareInvite interface', () => {
    it('should create care-for invite', () => {
      const invite: CareInvite = {
        id: 'invite123',
        fromUserId: 'user1',
        fromUserName: 'Carlos',
        fromUserEmail: 'carlos@example.com',
        toUserId: 'user2',
        toUserEmail: 'maria@example.com',
        type: 'care-for',
        permissions: {
          view: true,
          register: true,
          administer: false
        },
        status: 'pending',
        createdAt: new Date()
      };

      expect(invite.type).toBe('care-for');
      expect(invite.status).toBe('pending');
    });

    it('should create carer invite', () => {
      const invite: CareInvite = {
        id: 'invite456',
        fromUserId: 'patient1',
        fromUserName: 'Maria',
        fromUserEmail: 'maria@example.com',
        toUserId: 'nurse1',
        toUserEmail: 'nurse@hospital.com',
        type: 'carer',
        permissions: {
          view: true,
          register: true,
          administer: true
        },
        status: 'pending',
        createdAt: new Date()
      };

      expect(invite.type).toBe('carer');
    });

    it('should support accepted status with response date', () => {
      const invite: CareInvite = {
        id: 'invite789',
        fromUserId: 'user1',
        fromUserName: 'Test',
        fromUserEmail: 'test@example.com',
        toUserId: 'user2',
        toUserEmail: 'other@example.com',
        type: 'care-for',
        permissions: { view: true, register: false, administer: false },
        status: 'accepted',
        createdAt: new Date(),
        respondedAt: new Date()
      };

      expect(invite.status).toBe('accepted');
      expect(invite.respondedAt).toBeDefined();
    });

    it('should support rejected status', () => {
      const invite: CareInvite = {
        id: 'invite000',
        fromUserId: 'user1',
        fromUserName: 'Test',
        fromUserEmail: 'test@example.com',
        toUserId: 'user2',
        toUserEmail: 'other@example.com',
        type: 'carer',
        permissions: { view: true, register: false, administer: false },
        status: 'rejected',
        createdAt: new Date(),
        respondedAt: new Date()
      };

      expect(invite.status).toBe('rejected');
    });
  });

  describe('OnboardingSteps interface', () => {
    it('should create fresh onboarding state', () => {
      const steps: OnboardingSteps = {
        welcome: false,
        personalData: false,
        carers: false,
        dependents: false,
        medications: false,
        plansAndTerms: false
      };

      expect(Object.values(steps).every(v => v === false)).toBe(true);
    });

    it('should create completed onboarding state', () => {
      const steps: OnboardingSteps = {
        welcome: true,
        personalData: true,
        carers: true,
        dependents: true,
        medications: true,
        plansAndTerms: true
      };

      expect(Object.values(steps).every(v => v === true)).toBe(true);
    });

    it('should create partial onboarding state', () => {
      const steps: OnboardingSteps = {
        welcome: true,
        personalData: true,
        carers: false,
        dependents: false,
        medications: false,
        plansAndTerms: false
      };

      expect(steps.welcome).toBe(true);
      expect(steps.personalData).toBe(true);
      expect(steps.carers).toBe(false);
    });

    it('should have exactly 6 onboarding steps', () => {
      const steps: OnboardingSteps = {
        welcome: true,
        personalData: true,
        carers: true,
        dependents: true,
        medications: true,
        plansAndTerms: true
      };

      expect(Object.keys(steps).length).toBe(6);
    });
  });

  describe('GeoLocation interface', () => {
    it('should create basic geolocation', () => {
      const location: GeoLocation = {
        latitude: -23.5505,
        longitude: -46.6333
      };

      expect(location.latitude).toBe(-23.5505);
      expect(location.longitude).toBe(-46.6333);
    });

    it('should create geolocation with accuracy', () => {
      const location: GeoLocation = {
        latitude: -23.5505,
        longitude: -46.6333,
        accuracy: 10,
        timestamp: new Date()
      };

      expect(location.accuracy).toBe(10);
      expect(location.timestamp).toBeDefined();
    });

    it('should accept different coordinate formats', () => {
      // São Paulo, Brazil
      const saoPaulo: GeoLocation = { latitude: -23.5505, longitude: -46.6333 };
      expect(saoPaulo.latitude).toBeLessThan(0);
      
      // New York, USA
      const newYork: GeoLocation = { latitude: 40.7128, longitude: -74.0060 };
      expect(newYork.latitude).toBeGreaterThan(0);
      
      // London, UK
      const london: GeoLocation = { latitude: 51.5074, longitude: -0.1278 };
      expect(london.longitude).toBeLessThan(0);
    });
  });

  describe('TermsAcceptance interface', () => {
    it('should create basic terms acceptance', () => {
      const acceptance: TermsAcceptance = {
        termsId: 'BR_1.0',
        version: '1.0',
        country: 'BR',
        acceptedAt: new Date()
      };

      expect(acceptance.termsId).toBe('BR_1.0');
      expect(acceptance.version).toBe('1.0');
      expect(acceptance.country).toBe('BR');
    });

    it('should create terms acceptance with audit data', () => {
      const acceptance: TermsAcceptance = {
        termsId: 'BR_1.0',
        version: '1.0',
        country: 'BR',
        acceptedAt: new Date(),
        ipAddress: '192.168.1.1',
        geolocation: {
          latitude: -23.5505,
          longitude: -46.6333,
          accuracy: 5
        }
      };

      expect(acceptance.ipAddress).toBe('192.168.1.1');
      expect(acceptance.geolocation?.latitude).toBe(-23.5505);
    });

    it('should support different country codes', () => {
      const countries = ['BR', 'AR', 'US', 'PT', 'ES'];

      countries.forEach(country => {
        const acceptance: TermsAcceptance = {
          termsId: `${country}_1.0`,
          version: '1.0',
          country,
          acceptedAt: new Date()
        };
        expect(acceptance.country).toBe(country);
      });
    });
  });

  describe('User interface', () => {
    it('should create basic user', () => {
      const user: User = {
        id: 'user123',
        name: 'Carlos Silva',
        email: 'carlos@example.com',
        role: 'Patient',
        avatarUrl: 'https://example.com/avatar.jpg',
        dependents: []
      };

      expect(user.id).toBe('user123');
      expect(user.name).toBe('Carlos Silva');
      expect(user.role).toBe('Patient');
      expect(user.dependents).toEqual([]);
    });

    it('should accept all role types', () => {
      const roles: Array<User['role']> = ['Patient', 'Family Member', 'Nurse', 'Doctor'];

      roles.forEach(role => {
        const user: User = {
          id: 'test',
          name: 'Test',
          email: 'test@example.com',
          role,
          avatarUrl: '',
          dependents: []
        };
        expect(user.role).toBe(role);
      });
    });

    it('should create user with personal data', () => {
      const user: User = {
        id: 'user456',
        name: 'Maria Santos',
        email: 'maria@example.com',
        role: 'Patient',
        avatarUrl: '',
        dependents: [],
        country: 'BR',
        document: '123.456.789-00',
        documentType: 'CPF',
        birthDate: '1985-03-20',
        gender: 'female',
        religion: 'Católica'
      };

      expect(user.country).toBe('BR');
      expect(user.documentType).toBe('CPF');
      expect(user.gender).toBe('female');
      expect(user.religion).toBe('Católica');
    });

    it('should create user with health data', () => {
      const user: User = {
        id: 'user789',
        name: 'Pedro',
        email: 'pedro@example.com',
        role: 'Patient',
        avatarUrl: '',
        dependents: [],
        bloodType: 'AB-',
        allergies: 'Dipirona',
        healthNotes: 'Hipertenso'
      };

      expect(user.bloodType).toBe('AB-');
      expect(user.allergies).toBe('Dipirona');
    });

    it('should create user with care network', () => {
      const user: User = {
        id: 'user000',
        name: 'Ana',
        email: 'ana@example.com',
        role: 'Patient',
        avatarUrl: '',
        dependents: [],
        iCareFor: [{
          userId: 'dep1',
          name: 'Mãe',
          email: 'mae@example.com',
          addedAt: new Date(),
          status: 'active',
          isRegisteredUser: true
        }],
        whoCareForMe: [{
          userId: 'carer1',
          name: 'Enfermeira',
          email: 'nurse@example.com',
          permissions: { view: true, register: true, administer: true },
          addedAt: new Date(),
          status: 'active'
        }],
        whoCareForMeIds: ['carer1']
      };

      expect(user.iCareFor?.length).toBe(1);
      expect(user.whoCareForMe?.length).toBe(1);
      expect(user.whoCareForMeIds).toContain('carer1');
    });

    it('should create user with onboarding state', () => {
      const user: User = {
        id: 'newuser',
        name: 'Novo Usuário',
        email: 'novo@example.com',
        role: 'Patient',
        avatarUrl: '',
        dependents: [],
        onboardingCompleted: true,
        onboardingStep: 5,
        onboardingSteps: {
          welcome: true,
          personalData: true,
          carers: true,
          dependents: true,
          medications: true,
          plansAndTerms: true
        },
        onboardingCompletedAt: new Date(),
        termsAcceptance: [{
          termsId: 'BR_1.0',
          version: '1.0',
          country: 'BR',
          acceptedAt: new Date()
        }]
      };

      expect(user.onboardingCompleted).toBe(true);
      expect(user.onboardingStep).toBe(5);
      expect(user.termsAcceptance?.length).toBe(1);
    });

    it('should create user with gamification preferences', () => {
      const user: User = {
        id: 'gamer',
        name: 'Gamer',
        email: 'gamer@example.com',
        role: 'Patient',
        avatarUrl: '',
        dependents: [],
        leaderboardVisible: true,
        soundEnabled: true,
        hapticsEnabled: false
      };

      expect(user.leaderboardVisible).toBe(true);
      expect(user.soundEnabled).toBe(true);
      expect(user.hapticsEnabled).toBe(false);
    });

    it('should create user with dependents', () => {
      const dependent: Dependent = {
        id: 'dep1',
        name: 'Filho',
        relationship: 'Filho',
        avatarUrl: ''
      };

      const user: User = {
        id: 'parent',
        name: 'Pai',
        email: 'pai@example.com',
        role: 'Family Member',
        avatarUrl: '',
        dependents: [dependent]
      };

      expect(user.dependents.length).toBe(1);
      expect(user.dependents[0].name).toBe('Filho');
    });

    it('should support offline sync timestamp', () => {
      const user: User = {
        id: 'offline',
        name: 'Offline User',
        email: 'offline@example.com',
        role: 'Patient',
        avatarUrl: '',
        dependents: [],
        lastSync: new Date()
      };

      expect(user.lastSync).toBeDefined();
      expect(user.lastSync instanceof Date).toBe(true);
    });
  });
});
