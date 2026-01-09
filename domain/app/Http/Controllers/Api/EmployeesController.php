<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class EmployeesController extends Controller
{
    public function index(Request $request)
    {
        $query = Employee::with(['role', 'department']);
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('full_name', 'like', "%{$search}%")
                  ->orWhere('employee_code', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }
        
        if ($request->has('department_id')) {
            $query->where('department_id', $request->department_id);
        }
        
        return response()->json($query->paginate(15));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'full_name' => 'required|string|max:100',
            'email' => 'required|email|unique:employees,email|unique:users,username',
            'employee_code' => 'required|string|unique:employees,employee_code',
            'password' => 'required|min:6',
            'base_salary' => 'required|numeric|min:0',
            'hire_date' => 'required|date',
            'role_id' => 'nullable|exists:roles,id',
            'department_id' => 'nullable|exists:departments,id',
            'national_id' => 'nullable|string|max:20',
            'gosi_number' => 'nullable|string|max:50',
            'iban' => 'nullable|string|max:34',
            'bank_name' => 'nullable|string|max:100',
            'contract_type' => ['nullable', Rule::in(['full_time', 'part_time', 'contract', 'freelance'])],
            'vacation_days_balance' => 'nullable|numeric|min:0',
            'phone' => 'nullable|string|max:20',
            'date_of_birth' => 'nullable|date',
            'gender' => 'nullable|in:male,female',
            'address' => 'nullable|string',
            'employment_status' => 'nullable|in:active,suspended,terminated',
            'manager_id' => 'nullable|exists:employees,id',
        ]);

        return \Illuminate\Support\Facades\DB::transaction(function () use ($validated, $request) {
            // Resolve Manager User ID
            $managerUserId = null;
            if ($request->filled('manager_id')) {
                 $manager = Employee::find($request->manager_id);
                 $managerUserId = $manager ? $manager->user_id : null;
            }

            // Create User for Login
            $user = \App\Models\User::create([
                'username' => $validated['email'],
                'password' => Hash::make($request->password),
                'full_name' => $validated['full_name'],
                'role_id' => $validated['role_id'] ?? null,
                'is_active' => ($validated['employment_status'] ?? 'active') === 'active',
                'manager_id' => $managerUserId,
            ]);

            $validated['password'] = Hash::make($validated['password']);
            $validated['created_by'] = auth()->id();
            $validated['user_id'] = $user->id;

            $employee = Employee::create($validated);
            return response()->json($employee, 201);
        });
    }

    public function show($id)
    {
        return Employee::with(['role', 'department', 'documents', 'allowances', 'deductions'])->findOrFail($id);
    }

    public function update(Request $request, $id)
    {
        $employee = Employee::findOrFail($id);
        
        $validated = $request->validate([
            'full_name' => 'string|max:100',
            'email' => ['email', Rule::unique('employees')->ignore($id), Rule::unique('users', 'username')->ignore($employee->user_id)],
            'employee_code' => ['string', Rule::unique('employees')->ignore($id)],
            'base_salary' => 'numeric|min:0',
            'hire_date' => 'date',
            'role_id' => 'nullable|exists:roles,id',
            'department_id' => 'nullable|exists:departments,id',
            'national_id' => 'nullable|string|max:20',
            'gosi_number' => 'nullable|string|max:50',
            'iban' => 'nullable|string|max:34',
            'bank_name' => 'nullable|string|max:100',
            'contract_type' => ['nullable', Rule::in(['full_time', 'part_time', 'contract', 'freelance'])],
            'vacation_days_balance' => 'nullable|numeric|min:0',
            'manager_id' => 'nullable|exists:employees,id',
        ]);

        return \Illuminate\Support\Facades\DB::transaction(function () use ($request, $employee, $id) {
            $data = $request->except(['password']);
            if ($request->filled('password')) {
                $data['password'] = Hash::make($request->password);
            }

            $employee->update($data);

            // Sync User
            if ($employee->user_id) {
                $user = \App\Models\User::find($employee->user_id);
                if ($user) {
                    if ($request->filled('full_name')) $user->full_name = $request->full_name;
                    if ($request->filled('email')) $user->username = $request->email;
                    if ($request->has('role_id')) $user->role_id = $request->role_id;
                    if ($request->has('employment_status')) $user->is_active = $request->employment_status === 'active';
                    if ($request->filled('password')) $user->password = Hash::make($request->password);
                    
                    if ($request->has('manager_id')) {
                        if ($request->input('manager_id')) {
                            $manager = Employee::find($request->input('manager_id'));
                            $user->manager_id = $manager ? $manager->user_id : null;
                        } else {
                            $user->manager_id = null;
                        }
                    }

                    $user->save();
                }
            }

            return response()->json($employee);
        });
    }

    public function destroy($id)
    {
        return \Illuminate\Support\Facades\DB::transaction(function () use ($id) {
            $employee = Employee::findOrFail($id);
            if ($employee->user_id) {
                \App\Models\User::where('id', $employee->user_id)->delete();
            }
            $employee->delete();
            return response()->json(null, 204);
        });
    }

    public function suspend($id)
    {
        $employee = Employee::findOrFail($id);
        $employee->update(['employment_status' => 'suspended']);
        return response()->json($employee);
    }

    public function activate($id)
    {
        $employee = Employee::findOrFail($id);
        $employee->update(['employment_status' => 'active']);
        return response()->json($employee);
    }

    public function uploadDocument(Request $request, $id)
    {
        $request->validate([
            'document' => 'required|file|max:10240', // 10MB max
            'document_type' => 'required|string',
            'document_name' => 'required|string'
        ]);

        $employee = Employee::findOrFail($id);
        $file = $request->file('document');
        $path = $file->store("employees/{$id}/documents");

        $document = $employee->documents()->create([
            'document_type' => $request->document_type,
            'document_name' => $request->document_name,
            'file_path' => $path,
            'uploaded_by' => auth()->id()
        ]);

        return response()->json($document, 201);
    }

    public function getDocuments($id)
    {
        $employee = Employee::findOrFail($id);
        return response()->json($employee->documents);
    }
}
