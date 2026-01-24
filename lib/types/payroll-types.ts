export interface Mzda {
  id: number;
  pracovnik_id: number;
  mesic: number;
  rok: number;
  hruba_mzda: number | null;
  faktura: number | null;
  priplatek: number | null;
  celkova_castka: number | null;
  created_at?: string;
  organization_id?: string;
}

export interface WorkerRoleProfile {
    id: string; // user_id
    role: 'owner' | 'admin' | 'office' | 'reporter' | string;
}

export interface Pracovnik {
  id: number;
  jmeno: string;
  hodinova_mzda: number | null;
  telefon?: string | null;
  is_active: boolean;
  organization_id?: string;
  user_id?: string | null;
  role?: string | null;
}

export interface CombinedPayrollRecord extends Pracovnik {
  mzda: Mzda | null;
  mappedCost: number;
  totalWithCost: number;
  // UI helper props
  canEdit?: boolean;
}

export interface PayrollFilter {
    year: number;
    month: number;
}
