export interface Employee {
  id: number;
  employee_code: string;
  full_name: string;
  email: string;
  phone?: string;
  national_id?: string;
  gosi_number?: string;
  date_of_birth?: string;
  gender?: 'male' | 'female';
  address?: string;
  role_id?: number;
  role?: Role;
  department_id?: number;
  department?: Department;
  hire_date: string;
  termination_date?: string;
  employment_status: 'active' | 'suspended' | 'terminated';
  contract_type: 'full_time' | 'part_time' | 'contract' | 'freelance';
  base_salary: number;
  iban?: string;
  bank_name?: string;
  vacation_days_balance: number;
  account_id?: number;
  is_active: boolean;
  created_at: string;
  documents?: EmployeeDocument[];
  allowances?: EmployeeAllowance[];
  deductions?: EmployeeDeduction[];
}

export interface Role {
  id: number;
  role_key: string;
  role_name_ar: string;
  role_name_en: string;
  description?: string;
}

export interface Department {
  id: number;
  name_ar: string;
  name_en?: string;
  description?: string;
  manager_id?: number;
  is_active: boolean;
}

export interface EmployeeDocument {
  id: number;
  employee_id: number;
  document_type: 'cv' | 'contract' | 'certificate' | 'other';
  document_name: string;
  file_path: string;
  notes?: string;
  uploaded_by?: number;
  created_at: string;
}

export interface EmployeeAllowance {
  id: number;
  employee_id: number;
  allowance_name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

export interface EmployeeDeduction {
  id: number;
  employee_id: number;
  deduction_name: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'annual' | 'one_time';
  start_date: string;
  end_date?: string;
  is_active: boolean;
}

export interface PayrollCycle {
  id: number;
  cycle_name: string;
  period_start: string;
  period_end: string;
  payment_date: string;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  cycle_type: 'salary' | 'bonus' | 'incentive' | 'other';
  description?: string;
  status: 'draft' | 'pending_approval' | 'processing' | 'approved' | 'paid';
  current_approver_id?: number;
  current_approver?: { id: number, full_name: string };
  current_approver_name?: string;
  approval_trail?: any[];
  approved_by?: number;
  approved_at?: string;
  created_by?: number;
  created_at: string;
}

export interface PayrollItem {
  id: number;
  payroll_cycle_id: number;
  employee_id: number;
  employee?: Employee;
  base_salary: number;
  total_allowances: number;
  total_deductions: number;
  gross_salary: number;
  net_salary: number;
  status: 'active' | 'on_hold';
  notes?: string;
  paid_amount?: number;
  remaining_balance?: number;
  payroll_cycle?: PayrollCycle;
}

export interface AttendanceRecord {
  id: number;
  employee_id: number;
  employee?: Employee;
  attendance_date: string;
  check_in?: string;
  check_out?: string;
  status: 'present' | 'absent' | 'leave' | 'holiday' | 'weekend';
  hours_worked: number;
  overtime_hours: number;
  is_late: boolean;
  late_minutes: number;
  notes?: string;
  source: 'manual' | 'biometric' | 'import';
  created_at: string;
}

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee?: Employee;
  leave_type: 'vacation' | 'sick' | 'emergency' | 'unpaid' | 'other';
  start_date: string;
  end_date: string;
  days_requested: number;
  reason?: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  approved_by?: number;
  approver?: { id: number; full_name: string };
  approved_at?: string;
  rejection_reason?: string;
  approval_trail?: Array<{
    user_id: number;
    user_name: string;
    action: string;
    timestamp: string;
  }>;
  created_at: string;
}

export interface PayrollComponent {
  id: number;
  component_code: string;
  component_name: string;
  component_type: 'allowance' | 'deduction' | 'overtime' | 'bonus' | 'other';
  calculation_type: 'fixed' | 'percentage' | 'formula' | 'attendance_based';
  base_amount?: number;
  percentage?: number;
  formula?: string;
  is_taxable: boolean;
  is_active: boolean;
  display_order: number;
  description?: string;
}

export interface EmployeeRelationsCase {
  id: number;
  case_number: string;
  employee_id: number;
  employee?: { full_name: string };
  case_type: string;
  confidentiality_level: string;
  description: string;
  status: string;
  reported_date: string;
  resolved_date?: string | null;
  resolution?: string | null;
  disciplinary_actions?: DisciplinaryAction[];
}

export interface DisciplinaryAction {
  id: number;
  action_type: string;
  violation_description: string;
  action_taken: string;
  action_date: string;
  expiry_date?: string | null;
}

export interface Workflow {
  id: number;
  employee_id: number;
  employee?: {
    full_name: string;
    employee_code: string;
  };
  workflow_type: string;
  status: string;
  start_date: string;
  target_completion_date?: string;
  actual_completion_date?: string;
  completion_percentage: number;
  tasks?: Array<{
    id: number;
    task_name: string;
    status: string;
  }>;
}

export interface Schedule {
  id: number;
  schedule_name: string;
  schedule_date: string;
  department?: { name_ar: string };
  status: string;
  shifts?: Array<{
    id: number;
    employee?: { full_name: string };
    shift_date: string;
    hours: number;
  }>;
}
