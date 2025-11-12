export interface Dose {
  time: string; // e.g., '08:00'
  status: 'upcoming' | 'taken' | 'missed';
  administeredBy?: { id: string; name: string };
  notes?: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  stock: number; // Deprecated: use currentStock instead
  notes?: string;
  schedule: Dose[];
  startDate?: string | null;
  endDate?: string | null;
  doctorName?: string;
  doctorCRM?: string;
  
  // Stock Management (Phase B)
  isContinuousUse?: boolean; // true = continuous (e.g., daily meds), false = as-needed (e.g., painkillers)
  initialStock?: number; // Initial quantity when medication was added
  currentStock?: number; // Current quantity available
  stockUnit?: string; // Unit of measurement (e.g., 'comprimidos', 'ml', 'gotas', 'cápsulas')
  lowStockThreshold?: number; // Alert threshold (default: 7 days worth for continuous, 5 units for as-needed)
  isArchived?: boolean; // true if medication is archived (non-continuous with zero stock)
  archivedAt?: Date; // Timestamp when medication was archived
  
  // Treatment Completion (Phase D)
  isCompleted?: boolean; // true if treatment has been completed
  completedAt?: Date; // Timestamp when treatment was completed
  completionReason?: 'time_ended' | 'quantity_depleted' | 'manual'; // Reason for completion
  totalDosesPlanned?: number; // Total number of doses planned (for quantity-based non-continuous)
  dosesTaken?: number; // Number of doses taken (for tracking progress)
  
  // Offline support
  userId?: string; // For IndexedDB indexing (patient ID)
  lastModified?: Date; // Last modification timestamp
}
