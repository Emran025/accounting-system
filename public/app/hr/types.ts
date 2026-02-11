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


export interface EOSBCalculation {
  years_of_service: number;
  months_of_service: number;
  days_of_service: number;
  last_gross_salary: number;
  eosb_amount: number;
  unused_vacation_amount: number;
  notice_period_amount: number;
  total_settlement: number;
  breakdown: {
    eosb: number;
    unused_vacation: number;
    notice_period: number;
  };
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
  tasks?: Task[];
  documents: Doc[];
  notes?: string;
}

export interface Task {
  id: number; workflow_id: number; task_name: string; task_type: string;
  department: string; status: string; sequence_order: number;
  completed_date?: string; completed_by?: number; notes?: string;
}




export interface Doc { id: number; document_name: string; document_type: string; status: string; }

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

// ── Travel & Expenses ──
export interface TravelRequest {
  id: number;
  request_number: string;
  employee_id: number;
  employee?: { full_name: string };
  destination: string;
  purpose: string;
  departure_date: string;
  return_date: string;
  estimated_cost?: number;
  status: string;
  approved_by?: number;
  approved_at?: string;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
}

export interface TravelExpense {
  id: number;
  travel_request_id?: number;
  travel_request?: TravelRequest;
  employee_id: number;
  employee?: { full_name: string };
  expense_type: string;
  expense_date: string;
  amount: number;
  currency: string;
  exchange_rate?: number;
  amount_in_base_currency?: number;
  receipt_path?: string;
  description?: string;
  status: string;
  is_duplicate?: boolean;
  approved_by?: number;
  notes?: string;
  created_at?: string;
}

// ── Employee Loans ──
export interface LoanRepayment {
  id: number;
  loan_id: number;
  installment_number: number;
  due_date: string;
  amount: number;
  principal: number;
  interest: number;
  status: string;
  paid_date?: string;
  payroll_cycle_id?: number;
}

export interface EmployeeLoan {
  id: number;
  loan_number: string;
  employee_id: number;
  employee?: { full_name: string };
  loan_type: string;
  loan_amount: number;
  interest_rate: number;
  installment_count: number;
  monthly_installment: number;
  remaining_balance: number;
  start_date: string;
  end_date: string;
  auto_deduction: boolean;
  status: string;
  approved_by?: number;
  notes?: string;
  repayments?: LoanRepayment[];
  created_at: string;
}

// ── Corporate Communications ──
export interface CorporateAnnouncement {
  id: number;
  title: string;
  content: string;
  priority: string;
  target_audience: string;
  target_departments?: number[];
  target_roles?: number[];
  target_locations?: string[];
  publish_date: string;
  expiry_date?: string;
  is_published: boolean;
  created_by?: number;
  created_at?: string;
}

export interface SurveyResponse {
  id: number;
  survey_id: number;
  employee_id?: number;
  responses: Record<string, any>;
  submitted_at: string;
}

export interface PulseSurvey {
  id: number;
  survey_name: string;
  description?: string;
  survey_type: string;
  questions: any[];
  start_date: string;
  end_date: string;
  is_anonymous: boolean;
  is_active: boolean;
  target_audience: string;
  target_departments?: number[];
  target_roles?: number[];
  created_by?: number;
  responses?: SurveyResponse[];
  created_at?: string;
}

// ── EHS (Environment, Health, Safety) ──
export interface EhsIncident {
  id: number;
  incident_number: string;
  employee_id?: number;
  employee?: { full_name: string };
  incident_type: string;
  incident_date: string;
  incident_time?: string;
  location?: string;
  description: string;
  severity: string;
  status: string;
  immediate_action_taken?: string;
  root_cause?: string;
  preventive_measures?: string;
  osha_reportable?: boolean;
  reported_by?: number;
  investigated_by?: number;
  notes?: string;
  created_at?: string;
}

export interface EmployeeHealthRecord {
  id: number;
  employee_id: number;
  employee?: { full_name: string };
  record_type: string;
  record_date: string;
  expiry_date?: string;
  provider_name?: string;
  results?: string;
  file_path?: string;
  notes?: string;
}

export interface PpeRecord {
  id: number;
  employee_id: number;
  employee?: { full_name: string };
  ppe_item: string;
  ppe_type: string;
  issue_date: string;
  expiry_date?: string;
  status: string;
  notes?: string;
}

// ── Wellness ──
export interface WellnessProgram {
  id: number;
  program_name: string;
  description?: string;
  program_type: string;
  start_date: string;
  end_date: string;
  target_metrics?: any;
  is_active: boolean;
  created_by?: number;
  notes?: string;
  participations?: WellnessParticipation[];
  created_at?: string;
}

export interface Course {
  id: number; course_code: string; course_name: string; description?: string;
  delivery_method: string; course_type: string; duration_hours: number;
  is_published: boolean; is_recurring: boolean; recurrence_months?: number;
  requires_assessment: boolean; passing_score?: number; video_url?: string;
  enrollments?: Array<{ id: number; employee?: { full_name: string }; status: string; progress_percentage: number }>;
}

export interface Enrollment {
  id: number; course_id: number; course?: { course_name: string; course_code: string };
  employee_id: number; employee?: { full_name: string };
  enrollment_type: string; status: string; progress_percentage: number;
  enrollment_date: string; completion_date?: string; due_date?: string;
  score?: number; is_passed?: boolean;
}

export interface WellnessParticipation {
  id: number;
  program_id: number;
  program?: WellnessProgram;
  employee_id: number;
  employee?: { full_name: string };
  enrollment_date: string;
  status: string;
  points: number;
  metrics_data?: any;
  notes?: string;
}

// ── Post-Payroll Integrations ──
export interface PostPayrollIntegration {
  id: number;
  payroll_cycle_id: number;
  payroll_cycle?: { id: number; cycle_name: string; status: string };
  integration_type: string;
  file_format?: string;
  total_amount: number;
  transaction_count: number;
  status: string;
  file_path?: string;
  processed_by?: number;
  processed_at?: string;
  reconciled_at?: string;
  error_message?: string;
  notes?: string;
  created_at?: string;
}

export interface EmployeeContract {
  id: number;
  employee_id: number;
  contract_number: string;
  contract_start_date: string;
  contract_end_date?: string;
  probation_end_date?: string;
  base_salary: number;
  contract_type: 'full_time' | 'part_time' | 'contract' | 'freelance';
  is_current: boolean;
  employee?: {
    full_name: string;
    employee_code: string;
  };
  notes?: string;
}

export interface EmployeeAsset {
  id: number;
  employee_id: number;
  employee?: {
    full_name: string;
    employee_code: string;
  };
  asset_code: string;
  asset_name: string;
  asset_type: string;
  serial_number?: string;
  qr_code?: string;
  allocation_date: string;
  return_date?: string;
  status: string;
  next_maintenance_date?: string;
  notes?: string;
}

export interface ExpatRecord {
  id: number;
  employee_id: number;
  employee?: {
    full_name: string;
    employee_code: string;
  };
  passport_number?: string;
  passport_expiry?: string;
  visa_number?: string;
  visa_expiry?: string;
  work_permit_number?: string;
  work_permit_expiry?: string;
  residency_number?: string;
  residency_expiry?: string;
  host_country?: string;
  home_country?: string;
  cost_of_living_adjustment: number;
  housing_allowance: number;
  relocation_package: number;
  tax_equalization: boolean;
  repatriation_date?: string;
  notes?: string;
}
