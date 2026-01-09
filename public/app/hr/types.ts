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
  status: 'draft' | 'processing' | 'approved' | 'paid';
  total_gross: number;
  total_deductions: number;
  total_net: number;
  approved_by?: number;
  approved_at?: string;
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
  notes?: string;
}
