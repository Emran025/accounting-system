<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\EmployeesController;
use App\Http\Controllers\Api\DepartmentsController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\LeaveController;
use App\Http\Controllers\Api\EOSBController;
use App\Http\Controllers\Api\PayrollComponentsController;
use App\Http\Controllers\Api\RecruitmentController;
use App\Http\Controllers\Api\EmployeeContractsController;
use App\Http\Controllers\Api\EmployeeAssetsController;
use App\Http\Controllers\Api\ExpatManagementController;
use App\Http\Controllers\Api\OnboardingController;
use App\Http\Controllers\Api\ContingentWorkersController;
use App\Http\Controllers\Api\QaComplianceController;
use App\Http\Controllers\Api\WorkforceSchedulingController;
use App\Http\Controllers\Api\EmployeeRelationsController;
use App\Http\Controllers\Api\TravelExpenseController;
use App\Http\Controllers\Api\EmployeeLoansController;
use App\Http\Controllers\Api\PerformanceController;
use App\Http\Controllers\Api\LearningController;
use App\Http\Controllers\Api\CorporateCommunicationsController;
use App\Http\Controllers\Api\EhsController;
use App\Http\Controllers\Api\WellnessController;
use App\Http\Controllers\Api\CompensationController;
use App\Http\Controllers\Api\SuccessionController;

// HR & Payroll
Route::middleware('can:employees,view')->get('/employees', [EmployeesController::class, 'index'])->name('api.employees.index');
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/employees', [EmployeesController::class, 'store'])->name('api.employees.store');
Route::middleware('can:employees,view')->get('/employees/{id}', [EmployeesController::class, 'show'])->name('api.employees.show');
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/employees/{id}', [EmployeesController::class, 'update'])->name('api.employees.update');
Route::middleware(['can:employees,delete', 'throttle:api-delete'])->delete('/employees/{id}', [EmployeesController::class, 'destroy'])->name('api.employees.destroy');
Route::middleware(['can:employees,edit', 'throttle:api-sensitive'])->post('/employees/{id}/suspend', [EmployeesController::class, 'suspend'])->name('api.employees.suspend');
Route::middleware(['can:employees,edit', 'throttle:api-sensitive'])->post('/employees/{id}/activate', [EmployeesController::class, 'activate'])->name('api.employees.activate');

Route::middleware(['can:employees,edit', 'throttle:api-write'])->post('/employees/{id}/documents', [EmployeesController::class, 'uploadDocument'])->name('api.employees.documents.store');
Route::middleware('can:employees,view')->get('/employees/{id}/documents', [EmployeesController::class, 'getDocuments'])->name('api.employees.documents.index');


Route::middleware('can:employees,edit')->apiResource('departments', DepartmentsController::class)->names([
    'index' => 'api.departments.index',
    'store' => 'api.departments.store',
    'show' => 'api.departments.show',
    'update' => 'api.departments.update',
    'destroy' => 'api.departments.destroy',
]);

// Payroll
Route::middleware('can:payroll,view')->get('/payroll/cycles', [PayrollController::class, 'index'])->name('api.payroll.index');
Route::middleware(['can:payroll,create', 'throttle:api-critical'])->post('/payroll/generate', [PayrollController::class, 'generatePayroll'])->name('api.payroll.generate');
Route::middleware(['can:payroll,edit', 'throttle:api-critical'])->post('/payroll/{id}/approve', [PayrollController::class, 'approve'])->name('api.payroll.approve');
Route::middleware(['can:payroll,edit', 'throttle:api-critical'])->post('/payroll/{id}/process-payment', [PayrollController::class, 'processPayment'])->name('api.payroll.payment');
Route::middleware('can:payroll,view')->get('/payroll/cycles/{cycleId}/items', [PayrollController::class, 'getCycleItems'])->name('api.payroll.cycle.items');
Route::middleware('can:payroll,view')->get('/payroll/items/{itemId}/transactions', [PayrollController::class, 'getItemTransactions'])->name('api.payroll.item.transactions');
Route::middleware(['can:payroll,edit', 'throttle:api-sensitive'])->post('/payroll/items/{itemId}/pay', [PayrollController::class, 'payIndividualItem'])->name('api.payroll.item.pay');
Route::middleware(['can:payroll,edit', 'throttle:api-write'])->post('/payroll/items/{itemId}/toggle-status', [PayrollController::class, 'toggleItemStatus'])->name('api.payroll.item.toggle_status');
Route::middleware(['can:payroll,edit', 'throttle:api-write'])->put('/payroll/items/{itemId}', [PayrollController::class, 'updateItem'])->name('api.payroll.item.update');

// Attendance Management
Route::middleware('can:attendance,view')->get('/attendance', [AttendanceController::class, 'index'])->name('api.attendance.index');
Route::middleware(['can:attendance,create', 'throttle:api-write'])->post('/attendance', [AttendanceController::class, 'store'])->name('api.attendance.store');
Route::middleware(['can:attendance,create', 'throttle:api-critical'])->post('/attendance/bulk-import', [AttendanceController::class, 'bulkImport'])->name('api.attendance.bulk_import');
Route::middleware('can:attendance,view')->get('/attendance/summary', [AttendanceController::class, 'getSummary'])->name('api.attendance.summary');

// Leave Management
Route::middleware('can:leave_requests,view')->get('/leave-requests', [LeaveController::class, 'index'])->name('api.leave_requests.index');
Route::middleware(['can:leave_requests,create', 'throttle:api-write'])->post('/leave-requests', [LeaveController::class, 'store'])->name('api.leave_requests.store');
Route::middleware('can:leave_requests,view')->get('/leave-requests/{id}', [LeaveController::class, 'show'])->name('api.leave_requests.show');
Route::middleware(['can:leave_requests,edit', 'throttle:api-write'])->post('/leave-requests/{id}/approve', [LeaveController::class, 'approve'])->name('api.leave_requests.approve');
Route::middleware(['can:leave_requests,edit', 'throttle:api-write'])->post('/leave-requests/{id}/cancel', [LeaveController::class, 'cancel'])->name('api.leave_requests.cancel');

// Employee Portal Routes (self-service, scoped to authenticated employee)
Route::prefix('employee-portal')->middleware('can:portal,view')->group(function () {
    Route::get('/my-payslips', [PayrollController::class, 'myPayslips'])->name('api.employee_portal.payslips');
    Route::get('/my-leave-requests', [LeaveController::class, 'myLeaveRequests'])->name('api.employee_portal.leave_requests');
    Route::middleware('can:portal,create')->post('/my-leave-requests', [LeaveController::class, 'store'])->name('api.employee_portal.leave_requests.store');
    Route::get('/my-attendance', [AttendanceController::class, 'myAttendance'])->name('api.employee_portal.attendance');
});

// EOSB Calculator
Route::middleware(['can:payroll,view', 'throttle:api-sensitive'])->post('/eosb/preview', [EOSBController::class, 'preview'])->name('api.eosb.preview');
Route::middleware(['can:payroll,create', 'throttle:api-sensitive'])->post('/eosb/{employeeId}/calculate', [EOSBController::class, 'calculate'])->name('api.eosb.calculate');

// Payroll Components Management
Route::apiResource('payroll-components', PayrollComponentsController::class)->middleware(['can:payroll,view', 'throttle:api-write']);

// Global Mobility & Expat Management
Route::middleware('can:employees,view')->get('/expat-management', [ExpatManagementController::class, 'index']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/expat-management', [ExpatManagementController::class, 'store']);
Route::middleware('can:employees,view')->get('/expat-management/{id}', [ExpatManagementController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/expat-management/{id}', [ExpatManagementController::class, 'update']);
Route::middleware(['can:employees,delete', 'throttle:api-delete'])->delete('/expat-management/{id}', [ExpatManagementController::class, 'destroy']);

// Employee Assets & Equipment
Route::middleware('can:employees,view')->get('/employee-assets', [EmployeeAssetsController::class, 'index']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/employee-assets', [EmployeeAssetsController::class, 'store']);
Route::middleware('can:employees,view')->get('/employee-assets/{id}', [EmployeeAssetsController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/employee-assets/{id}', [EmployeeAssetsController::class, 'update']);
Route::middleware(['can:employees,delete', 'throttle:api-delete'])->delete('/employee-assets/{id}', [EmployeeAssetsController::class, 'destroy']);

// Contracts & Agreements Management
Route::middleware('can:employees,view')->get('/contracts', [EmployeeContractsController::class, 'index']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/contracts', [EmployeeContractsController::class, 'store']);
Route::middleware('can:employees,view')->get('/contracts/{id}', [EmployeeContractsController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/contracts/{id}', [EmployeeContractsController::class, 'update']);
Route::middleware(['can:employees,delete', 'throttle:api-delete'])->delete('/contracts/{id}', [EmployeeContractsController::class, 'destroy']);

// Recruitment & ATS
Route::middleware('can:employees,view')->get('/recruitment/requisitions', [RecruitmentController::class, 'indexRequisitions']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/recruitment/requisitions', [RecruitmentController::class, 'storeRequisition']);
Route::middleware('can:employees,view')->get('/recruitment/requisitions/{id}', [RecruitmentController::class, 'showRequisition']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/recruitment/requisitions/{id}', [RecruitmentController::class, 'updateRequisition']);
Route::middleware('can:employees,view')->get('/recruitment/applicants', [RecruitmentController::class, 'indexApplicants']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/recruitment/applicants', [RecruitmentController::class, 'storeApplicant']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/recruitment/applicants/{id}/status', [RecruitmentController::class, 'updateApplicantStatus']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/recruitment/interviews', [RecruitmentController::class, 'storeInterview']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/recruitment/interviews/{id}', [RecruitmentController::class, 'updateInterview']);

// Onboarding & Offboarding
Route::middleware('can:employees,view')->get('/onboarding', [OnboardingController::class, 'index']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/onboarding', [OnboardingController::class, 'store']);
Route::middleware('can:employees,view')->get('/onboarding/{id}', [OnboardingController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/onboarding/{workflowId}/tasks/{taskId}', [OnboardingController::class, 'updateTask']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/onboarding/{workflowId}/documents', [OnboardingController::class, 'storeDocument']);

// Contingent Workers
Route::middleware('can:employees,view')->get('/contingent-workers', [ContingentWorkersController::class, 'index']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/contingent-workers', [ContingentWorkersController::class, 'store']);
Route::middleware('can:employees,view')->get('/contingent-workers/{id}', [ContingentWorkersController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/contingent-workers/{id}', [ContingentWorkersController::class, 'update']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/contingent-workers/{workerId}/contracts', [ContingentWorkersController::class, 'storeContract']);

// QA & Compliance
Route::middleware('can:employees,view')->get('/qa-compliance', [QaComplianceController::class, 'index']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/qa-compliance', [QaComplianceController::class, 'store']);
Route::middleware('can:employees,view')->get('/qa-compliance/{id}', [QaComplianceController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/qa-compliance/{id}', [QaComplianceController::class, 'update']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/qa-compliance/{complianceId}/capa', [QaComplianceController::class, 'storeCapa']);

// Workforce Scheduling
Route::middleware('can:employees,view')->get('/workforce-schedules', [WorkforceSchedulingController::class, 'index']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/workforce-schedules', [WorkforceSchedulingController::class, 'store']);
Route::middleware('can:employees,view')->get('/workforce-schedules/{id}', [WorkforceSchedulingController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/workforce-schedules/{id}', [WorkforceSchedulingController::class, 'update']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/workforce-schedules/{scheduleId}/shifts', [WorkforceSchedulingController::class, 'storeShift']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/workforce-schedules/{scheduleId}/shifts/{shiftId}', [WorkforceSchedulingController::class, 'updateShift']);

// Employee Relations
Route::middleware('can:employees,view')->get('/employee-relations', [EmployeeRelationsController::class, 'index']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/employee-relations', [EmployeeRelationsController::class, 'store']);
Route::middleware('can:employees,view')->get('/employee-relations/{id}', [EmployeeRelationsController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/employee-relations/{id}', [EmployeeRelationsController::class, 'update']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/employee-relations/{caseId}/disciplinary', [EmployeeRelationsController::class, 'storeDisciplinaryAction']);

// Travel & Expenses
Route::middleware('can:employees,view')->get('/travel-requests', [TravelExpenseController::class, 'indexRequests']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/travel-requests', [TravelExpenseController::class, 'storeRequest']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/travel-requests/{id}/status', [TravelExpenseController::class, 'updateRequestStatus']);
Route::middleware('can:employees,view')->get('/travel-expenses', [TravelExpenseController::class, 'indexExpenses']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/travel-expenses', [TravelExpenseController::class, 'storeExpense']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/travel-expenses/{id}/status', [TravelExpenseController::class, 'updateExpenseStatus']);

// Employee Loans
Route::middleware('can:employees,view')->get('/employee-loans', [EmployeeLoansController::class, 'index']);
Route::middleware(['can:employees,create', 'throttle:api-sensitive'])->post('/employee-loans', [EmployeeLoansController::class, 'store']);
Route::middleware('can:employees,view')->get('/employee-loans/{id}', [EmployeeLoansController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-sensitive'])->put('/employee-loans/{id}/status', [EmployeeLoansController::class, 'updateStatus']);
Route::middleware(['can:employees,edit', 'throttle:api-sensitive'])->put('/employee-loans/{id}/repayments/{repaymentId}', [EmployeeLoansController::class, 'recordRepayment']);

// Performance & Goals
Route::middleware('can:employees,view')->get('/performance/goals', [PerformanceController::class, 'indexGoals']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/performance/goals', [PerformanceController::class, 'storeGoal']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/performance/goals/{id}', [PerformanceController::class, 'updateGoal']);
Route::middleware('can:employees,view')->get('/performance/appraisals', [PerformanceController::class, 'indexAppraisals']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/performance/appraisals', [PerformanceController::class, 'storeAppraisal']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/performance/appraisals/{id}', [PerformanceController::class, 'updateAppraisal']);
Route::middleware('can:employees,view')->get('/performance/feedback', [PerformanceController::class, 'indexFeedback']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/performance/feedback', [PerformanceController::class, 'storeFeedback']);

// Learning Management (LMS)
Route::middleware('can:employees,view')->get('/learning/courses', [LearningController::class, 'indexCourses']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/learning/courses', [LearningController::class, 'storeCourse']);
Route::middleware('can:employees,view')->get('/learning/courses/{id}', [LearningController::class, 'showCourse']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/learning/courses/{id}', [LearningController::class, 'updateCourse']);
Route::middleware('can:employees,view')->get('/learning/enrollments', [LearningController::class, 'indexEnrollments']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/learning/enrollments', [LearningController::class, 'storeEnrollment']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/learning/enrollments/{id}', [LearningController::class, 'updateEnrollment']);

// Corporate Communications
Route::middleware('can:employees,view')->get('/communications/announcements', [CorporateCommunicationsController::class, 'indexAnnouncements']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/communications/announcements', [CorporateCommunicationsController::class, 'storeAnnouncement']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/communications/announcements/{id}', [CorporateCommunicationsController::class, 'updateAnnouncement']);
Route::middleware('can:employees,view')->get('/communications/surveys', [CorporateCommunicationsController::class, 'indexSurveys']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/communications/surveys', [CorporateCommunicationsController::class, 'storeSurvey']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/communications/surveys/{surveyId}/responses', [CorporateCommunicationsController::class, 'storeSurveyResponse']);

// EHS (Environment, Health, Safety)
Route::middleware('can:employees,view')->get('/ehs/incidents', [EhsController::class, 'indexIncidents']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/ehs/incidents', [EhsController::class, 'storeIncident']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/ehs/incidents/{id}', [EhsController::class, 'updateIncident']);
Route::middleware('can:employees,view')->get('/ehs/health-records', [EhsController::class, 'indexHealthRecords']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/ehs/health-records', [EhsController::class, 'storeHealthRecord']);
Route::middleware('can:employees,view')->get('/ehs/ppe', [EhsController::class, 'indexPpe']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/ehs/ppe', [EhsController::class, 'storePpe']);

// Wellness Programs
Route::middleware('can:employees,view')->get('/wellness/programs', [WellnessController::class, 'indexPrograms']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/wellness/programs', [WellnessController::class, 'storeProgram']);
Route::middleware('can:employees,view')->get('/wellness/participations', [WellnessController::class, 'indexParticipations']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/wellness/participations', [WellnessController::class, 'storeParticipation']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/wellness/participations/{id}', [WellnessController::class, 'updateParticipation']);

// Succession Planning
Route::middleware('can:employees,view')->get('/succession', [SuccessionController::class, 'index']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/succession', [SuccessionController::class, 'store']);
Route::middleware('can:employees,view')->get('/succession/{id}', [SuccessionController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/succession/{id}', [SuccessionController::class, 'update']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/succession/{planId}/candidates', [SuccessionController::class, 'storeCandidate']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/succession/{planId}/candidates/{candidateId}', [SuccessionController::class, 'updateCandidate']);

// Compensation Management
Route::middleware('can:employees,view')->get('/compensation/plans', [CompensationController::class, 'indexPlans'])->name('api.compensation.plans.index');
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/compensation/plans', [CompensationController::class, 'storePlan'])->name('api.compensation.plans.store');
Route::middleware('can:employees,view')->get('/compensation/plans/{id}', [CompensationController::class, 'showPlan'])->name('api.compensation.plans.show');
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/compensation/plans/{id}', [CompensationController::class, 'updatePlan'])->name('api.compensation.plans.update');
Route::middleware('can:employees,view')->get('/compensation/entries', [CompensationController::class, 'indexEntries'])->name('api.compensation.entries.index');
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/compensation/entries', [CompensationController::class, 'storeEntry'])->name('api.compensation.entries.store');
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/compensation/entries/{id}/status', [CompensationController::class, 'updateEntryStatus'])->name('api.compensation.entries.status');

// Benefits Administration
Route::middleware('can:employees,view')->get('/benefits/plans', [\App\Http\Controllers\Api\BenefitsController::class, 'indexPlans'])->name('api.benefits.plans.index');
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/benefits/plans', [\App\Http\Controllers\Api\BenefitsController::class, 'storePlan'])->name('api.benefits.plans.store');
Route::middleware('can:employees,view')->get('/benefits/plans/{id}', [\App\Http\Controllers\Api\BenefitsController::class, 'showPlan'])->name('api.benefits.plans.show');
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/benefits/plans/{id}', [\App\Http\Controllers\Api\BenefitsController::class, 'updatePlan'])->name('api.benefits.plans.update');
Route::middleware('can:employees,view')->get('/benefits/enrollments', [\App\Http\Controllers\Api\BenefitsController::class, 'indexEnrollments'])->name('api.benefits.enrollments.index');
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/benefits/enrollments', [\App\Http\Controllers\Api\BenefitsController::class, 'storeEnrollment'])->name('api.benefits.enrollments.store');
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/benefits/enrollments/{id}', [\App\Http\Controllers\Api\BenefitsController::class, 'updateEnrollment'])->name('api.benefits.enrollments.update');

// Post-Payroll Integrations
Route::middleware('can:payroll,view')->get('/post-payroll', [\App\Http\Controllers\Api\PostPayrollController::class, 'index']);
Route::middleware(['can:payroll,create', 'throttle:api-sensitive'])->post('/post-payroll', [\App\Http\Controllers\Api\PostPayrollController::class, 'store']);
Route::middleware(['can:payroll,edit', 'throttle:api-critical'])->post('/post-payroll/{id}/process', [\App\Http\Controllers\Api\PostPayrollController::class, 'process']);
Route::middleware(['can:payroll,edit', 'throttle:api-critical'])->post('/post-payroll/{id}/reconcile', [\App\Http\Controllers\Api\PostPayrollController::class, 'reconcile']);

// Knowledge Management
Route::middleware('can:employees,view')->get('/knowledge-base', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'indexKnowledgeBase']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/knowledge-base', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'storeKnowledgeBase']);
Route::middleware('can:employees,view')->get('/knowledge-base/{id}', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'showKnowledgeBase']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/knowledge-base/{id}', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'updateKnowledgeBase']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->post('/knowledge-base/{id}/helpful', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'markHelpful']);
Route::middleware('can:employees,view')->get('/expertise', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'indexExpertise']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/expertise', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'storeExpertise']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/expertise/{id}', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'updateExpertise']);

// Document Templates
Route::middleware('can:employees,view')->get('/document-templates', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'index']);
Route::middleware('can:employees,view')->get('/document-templates/approved-keys', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'getApprovedKeys']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/document-templates', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'store']);
Route::middleware('can:employees,view')->get('/document-templates/{id}', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'show']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/document-templates/{id}', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'update']);
Route::middleware(['can:employees,delete', 'throttle:api-delete'])->delete('/document-templates/{id}', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'destroy']);
Route::middleware(['can:employees,view', 'throttle:api-write'])->post('/document-templates/{id}/render', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'render']);

// Biometric Device Management
Route::middleware('can:attendance,view')->get('/biometric/devices', [\App\Http\Controllers\Api\BiometricController::class, 'indexDevices']);
Route::middleware(['can:attendance,create', 'throttle:api-write'])->post('/biometric/devices', [\App\Http\Controllers\Api\BiometricController::class, 'storeDevice']);
Route::middleware(['can:attendance,edit', 'throttle:api-write'])->put('/biometric/devices/{id}', [\App\Http\Controllers\Api\BiometricController::class, 'updateDevice']);
Route::middleware(['can:attendance,delete', 'throttle:api-delete'])->delete('/biometric/devices/{id}', [\App\Http\Controllers\Api\BiometricController::class, 'destroyDevice']);
Route::middleware(['can:attendance,edit', 'throttle:api-write'])->post('/biometric/devices/{id}/sync', [\App\Http\Controllers\Api\BiometricController::class, 'syncDevice']);
Route::middleware('can:attendance,view')->get('/biometric/sync-logs', [\App\Http\Controllers\Api\BiometricController::class, 'syncLogs']);
Route::middleware(['can:attendance,create', 'throttle:api-critical'])->post('/biometric/import', [\App\Http\Controllers\Api\BiometricController::class, 'importFromFile']);

// HR Administration - Job Titles & Capacity Planning
Route::middleware('can:employees,view')->get('/job-titles', [\App\Http\Controllers\Api\HrAdministrationController::class, 'indexJobTitles']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/job-titles', [\App\Http\Controllers\Api\HrAdministrationController::class, 'storeJobTitle']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/job-titles/{id}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'updateJobTitle']);
Route::middleware(['can:employees,delete', 'throttle:api-delete'])->delete('/job-titles/{id}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'destroyJobTitle']);

// HR Administration - Positions (Central Hierarchy Link: Employee ← Position ← Role ← Permissions, Position ← JobTitle)
Route::middleware('can:employees,view')->get('/positions', [\App\Http\Controllers\Api\HrAdministrationController::class, 'indexPositions']);
Route::middleware('can:employees,view')->get('/positions/{id}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'showPosition']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/positions', [\App\Http\Controllers\Api\HrAdministrationController::class, 'storePosition']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/positions/{id}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'updatePosition']);
Route::middleware(['can:employees,delete', 'throttle:api-delete'])->delete('/positions/{id}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'destroyPosition']);
Route::middleware(['can:employees,edit', 'throttle:api-sensitive'])->post('/positions/assign-employee', [\App\Http\Controllers\Api\HrAdministrationController::class, 'assignEmployeeToPosition']);
Route::middleware(['can:employees,edit', 'throttle:api-delete'])->delete('/positions/unassign-employee/{employeeId}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'unassignEmployeeFromPosition']);

// HR Administration - Permission Templates
Route::middleware('can:employees,view')->get('/permission-templates', [\App\Http\Controllers\Api\HrAdministrationController::class, 'indexTemplates']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/permission-templates', [\App\Http\Controllers\Api\HrAdministrationController::class, 'storeTemplate']);
Route::middleware(['can:employees,edit', 'throttle:api-write'])->put('/permission-templates/{id}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'updateTemplate']);
Route::middleware(['can:employees,edit', 'throttle:api-sensitive'])->post('/permission-templates/apply', [\App\Http\Controllers\Api\HrAdministrationController::class, 'applyTemplateToRole']);

// Employee File Management (enhanced)
Route::middleware('can:employees,view')->get('/employee-files/{employeeId}', [\App\Http\Controllers\Api\EmployeesController::class, 'getDocuments']);
Route::middleware(['can:employees,create', 'throttle:api-write'])->post('/employee-files/{employeeId}', [\App\Http\Controllers\Api\EmployeesController::class, 'uploadDocument']);
Route::middleware('can:employees,view')->get('/employee-files/{employeeId}/download/{documentId}', [\App\Http\Controllers\Api\EmployeesController::class, 'downloadDocument']);