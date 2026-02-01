<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EmployeesController;
use App\Http\Controllers\Api\DepartmentsController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\EOSBController;
use App\Http\Controllers\Api\PayrollComponentsController;

// HR & Payroll
Route::middleware('can:employees,view')->get('/employees', [EmployeesController::class, 'index'])->name('api.employees.index');
Route::middleware('can:employees,create')->post('/employees', [EmployeesController::class, 'store'])->name('api.employees.store');
Route::middleware('can:employees,view')->get('/employees/{id}', [EmployeesController::class, 'show'])->name('api.employees.show');
Route::middleware('can:employees,edit')->put('/employees/{id}', [EmployeesController::class, 'update'])->name('api.employees.update');
Route::middleware('can:employees,delete')->delete('/employees/{id}', [EmployeesController::class, 'destroy'])->name('api.employees.destroy');
Route::middleware('can:employees,edit')->post('/employees/{id}/suspend', [EmployeesController::class, 'suspend'])->name('api.employees.suspend');
Route::middleware('can:employees,edit')->post('/employees/{id}/activate', [EmployeesController::class, 'activate'])->name('api.employees.activate');

Route::middleware('can:employees,edit')->post('/employees/{id}/documents', [EmployeesController::class, 'uploadDocument'])->name('api.employees.documents.store');
Route::middleware('can:employees,view')->get('/employees/{id}/documents', [EmployeesController::class, 'getDocuments'])->name('api.employees.documents.index');


Route::middleware('can:employees,edit')->apiResource('departments', DepartmentsController::class);

// Payroll
Route::middleware('can:payroll,view')->get('/payroll/cycles', [PayrollController::class, 'index'])->name('api.payroll.index');
Route::middleware('can:payroll,create')->post('/payroll/generate', [PayrollController::class, 'generatePayroll'])->name('api.payroll.generate');
Route::middleware('can:payroll,edit')->post('/payroll/{id}/approve', [PayrollController::class, 'approve'])->name('api.payroll.approve');
Route::middleware('can:payroll,edit')->post('/payroll/{id}/process-payment', [PayrollController::class, 'processPayment'])->name('api.payroll.payment');
Route::middleware('can:payroll,view')->get('/payroll/cycles/{cycleId}/items', [PayrollController::class, 'getCycleItems'])->name('api.payroll.cycle.items');
Route::middleware('can:payroll,view')->get('/payroll/items/{itemId}/transactions', [PayrollController::class, 'getItemTransactions'])->name('api.payroll.item.transactions');
Route::middleware('can:payroll,edit')->post('/payroll/items/{itemId}/pay', [PayrollController::class, 'payIndividualItem'])->name('api.payroll.item.pay');
Route::middleware('can:payroll,edit')->post('/payroll/items/{itemId}/toggle-status', [PayrollController::class, 'toggleItemStatus'])->name('api.payroll.item.toggle_status');
Route::middleware('can:payroll,edit')->put('/payroll/items/{itemId}', [PayrollController::class, 'updateItem'])->name('api.payroll.item.update');

// Attendance Management
Route::middleware('can:attendance,view')->get('/attendance', [AttendanceController::class, 'index'])->name('api.attendance.index');
Route::middleware('can:attendance,create')->post('/attendance', [AttendanceController::class, 'store'])->name('api.attendance.store');
Route::middleware('can:attendance,create')->post('/attendance/bulk-import', [AttendanceController::class, 'bulkImport'])->name('api.attendance.bulk_import');
Route::middleware('can:attendance,view')->get('/attendance/summary', [AttendanceController::class, 'getSummary'])->name('api.attendance.summary');

// Leave Management
Route::middleware('can:leave_requests,view')->get('/leave-requests', [LeaveController::class, 'index'])->name('api.leave_requests.index');
Route::middleware('can:leave_requests,create')->post('/leave-requests', [LeaveController::class, 'store'])->name('api.leave_requests.store');
Route::middleware('can:leave_requests,view')->get('/leave-requests/{id}', [LeaveController::class, 'show'])->name('api.leave_requests.show');
Route::middleware('can:leave_requests,edit')->post('/leave-requests/{id}/approve', [LeaveController::class, 'approve'])->name('api.leave_requests.approve');
Route::middleware('can:leave_requests,edit')->post('/leave-requests/{id}/cancel', [LeaveController::class, 'cancel'])->name('api.leave_requests.cancel');

// Employee Portal Routes
Route::prefix('employee-portal')->group(function () {
    Route::get('/my-payslips', [PayrollController::class, 'myPayslips'])->name('api.employee_portal.payslips');
    Route::get('/my-leave-requests', [LeaveController::class, 'myLeaveRequests'])->name('api.employee_portal.leave_requests');
    Route::post('/my-leave-requests', [LeaveController::class, 'store'])->name('api.employee_portal.leave_requests.store');
    Route::get('/my-attendance', [AttendanceController::class, 'myAttendance'])->name('api.employee_portal.attendance');
});

// EOSB Calculator
Route::post('/eosb/preview', [EOSBController::class, 'preview'])->name('api.eosb.preview');
Route::post('/eosb/{employeeId}/calculate', [EOSBController::class, 'calculate'])->name('api.eosb.calculate');

// Payroll Components Management
Route::apiResource('payroll-components', PayrollComponentsController::class);
