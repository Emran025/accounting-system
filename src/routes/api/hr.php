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


Route::middleware('can:employees,edit')->apiResource('departments', DepartmentsController::class)->names([
    'index' => 'api.departments.index',
    'store' => 'api.departments.store',
    'show' => 'api.departments.show',
    'update' => 'api.departments.update',
    'destroy' => 'api.departments.destroy',
]);

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

// Global Mobility & Expat Management
Route::middleware('can:employees,view')->get('/expat-management', [\App\Http\Controllers\Api\ExpatManagementController::class, 'index']);
Route::middleware('can:employees,create')->post('/expat-management', [\App\Http\Controllers\Api\ExpatManagementController::class, 'store']);
Route::middleware('can:employees,view')->get('/expat-management/{id}', [\App\Http\Controllers\Api\ExpatManagementController::class, 'show']);
Route::middleware('can:employees,edit')->put('/expat-management/{id}', [\App\Http\Controllers\Api\ExpatManagementController::class, 'update']);
Route::middleware('can:employees,delete')->delete('/expat-management/{id}', [\App\Http\Controllers\Api\ExpatManagementController::class, 'destroy']);

// Employee Assets & Equipment
Route::middleware('can:employees,view')->get('/employee-assets', [\App\Http\Controllers\Api\EmployeeAssetsController::class, 'index']);
Route::middleware('can:employees,create')->post('/employee-assets', [\App\Http\Controllers\Api\EmployeeAssetsController::class, 'store']);
Route::middleware('can:employees,view')->get('/employee-assets/{id}', [\App\Http\Controllers\Api\EmployeeAssetsController::class, 'show']);
Route::middleware('can:employees,edit')->put('/employee-assets/{id}', [\App\Http\Controllers\Api\EmployeeAssetsController::class, 'update']);
Route::middleware('can:employees,delete')->delete('/employee-assets/{id}', [\App\Http\Controllers\Api\EmployeeAssetsController::class, 'destroy']);

// Contracts & Agreements Management
Route::middleware('can:employees,view')->get('/contracts', [\App\Http\Controllers\Api\EmployeeContractsController::class, 'index']);
Route::middleware('can:employees,create')->post('/contracts', [\App\Http\Controllers\Api\EmployeeContractsController::class, 'store']);
Route::middleware('can:employees,view')->get('/contracts/{id}', [\App\Http\Controllers\Api\EmployeeContractsController::class, 'show']);
Route::middleware('can:employees,edit')->put('/contracts/{id}', [\App\Http\Controllers\Api\EmployeeContractsController::class, 'update']);
Route::middleware('can:employees,delete')->delete('/contracts/{id}', [\App\Http\Controllers\Api\EmployeeContractsController::class, 'destroy']);

// Recruitment & ATS
Route::middleware('can:employees,view')->get('/recruitment/requisitions', [\App\Http\Controllers\Api\RecruitmentController::class, 'indexRequisitions']);
Route::middleware('can:employees,create')->post('/recruitment/requisitions', [\App\Http\Controllers\Api\RecruitmentController::class, 'storeRequisition']);
Route::middleware('can:employees,view')->get('/recruitment/requisitions/{id}', [\App\Http\Controllers\Api\RecruitmentController::class, 'showRequisition']);
Route::middleware('can:employees,edit')->put('/recruitment/requisitions/{id}', [\App\Http\Controllers\Api\RecruitmentController::class, 'updateRequisition']);
Route::middleware('can:employees,view')->get('/recruitment/applicants', [\App\Http\Controllers\Api\RecruitmentController::class, 'indexApplicants']);
Route::middleware('can:employees,create')->post('/recruitment/applicants', [\App\Http\Controllers\Api\RecruitmentController::class, 'storeApplicant']);
Route::middleware('can:employees,edit')->put('/recruitment/applicants/{id}/status', [\App\Http\Controllers\Api\RecruitmentController::class, 'updateApplicantStatus']);
Route::middleware('can:employees,create')->post('/recruitment/interviews', [\App\Http\Controllers\Api\RecruitmentController::class, 'storeInterview']);
Route::middleware('can:employees,edit')->put('/recruitment/interviews/{id}', [\App\Http\Controllers\Api\RecruitmentController::class, 'updateInterview']);

// Onboarding & Offboarding
Route::middleware('can:employees,view')->get('/onboarding', [\App\Http\Controllers\Api\OnboardingController::class, 'index']);
Route::middleware('can:employees,create')->post('/onboarding', [\App\Http\Controllers\Api\OnboardingController::class, 'store']);
Route::middleware('can:employees,view')->get('/onboarding/{id}', [\App\Http\Controllers\Api\OnboardingController::class, 'show']);
Route::middleware('can:employees,edit')->put('/onboarding/{workflowId}/tasks/{taskId}', [\App\Http\Controllers\Api\OnboardingController::class, 'updateTask']);
Route::middleware('can:employees,create')->post('/onboarding/{workflowId}/documents', [\App\Http\Controllers\Api\OnboardingController::class, 'storeDocument']);

// Contingent Workers
Route::middleware('can:employees,view')->get('/contingent-workers', [\App\Http\Controllers\Api\ContingentWorkersController::class, 'index']);
Route::middleware('can:employees,create')->post('/contingent-workers', [\App\Http\Controllers\Api\ContingentWorkersController::class, 'store']);
Route::middleware('can:employees,view')->get('/contingent-workers/{id}', [\App\Http\Controllers\Api\ContingentWorkersController::class, 'show']);
Route::middleware('can:employees,edit')->put('/contingent-workers/{id}', [\App\Http\Controllers\Api\ContingentWorkersController::class, 'update']);
Route::middleware('can:employees,create')->post('/contingent-workers/{workerId}/contracts', [\App\Http\Controllers\Api\ContingentWorkersController::class, 'storeContract']);

// QA & Compliance
Route::middleware('can:employees,view')->get('/qa-compliance', [\App\Http\Controllers\Api\QaComplianceController::class, 'index']);
Route::middleware('can:employees,create')->post('/qa-compliance', [\App\Http\Controllers\Api\QaComplianceController::class, 'store']);
Route::middleware('can:employees,view')->get('/qa-compliance/{id}', [\App\Http\Controllers\Api\QaComplianceController::class, 'show']);
Route::middleware('can:employees,edit')->put('/qa-compliance/{id}', [\App\Http\Controllers\Api\QaComplianceController::class, 'update']);
Route::middleware('can:employees,create')->post('/qa-compliance/{complianceId}/capa', [\App\Http\Controllers\Api\QaComplianceController::class, 'storeCapa']);

// Workforce Scheduling
Route::middleware('can:employees,view')->get('/workforce-schedules', [\App\Http\Controllers\Api\WorkforceSchedulingController::class, 'index']);
Route::middleware('can:employees,create')->post('/workforce-schedules', [\App\Http\Controllers\Api\WorkforceSchedulingController::class, 'store']);
Route::middleware('can:employees,view')->get('/workforce-schedules/{id}', [\App\Http\Controllers\Api\WorkforceSchedulingController::class, 'show']);
Route::middleware('can:employees,edit')->put('/workforce-schedules/{id}', [\App\Http\Controllers\Api\WorkforceSchedulingController::class, 'update']);
Route::middleware('can:employees,create')->post('/workforce-schedules/{scheduleId}/shifts', [\App\Http\Controllers\Api\WorkforceSchedulingController::class, 'storeShift']);
Route::middleware('can:employees,edit')->put('/workforce-schedules/{scheduleId}/shifts/{shiftId}', [\App\Http\Controllers\Api\WorkforceSchedulingController::class, 'updateShift']);

// Employee Relations
Route::middleware('can:employees,view')->get('/employee-relations', [\App\Http\Controllers\Api\EmployeeRelationsController::class, 'index']);
Route::middleware('can:employees,create')->post('/employee-relations', [\App\Http\Controllers\Api\EmployeeRelationsController::class, 'store']);
Route::middleware('can:employees,view')->get('/employee-relations/{id}', [\App\Http\Controllers\Api\EmployeeRelationsController::class, 'show']);
Route::middleware('can:employees,edit')->put('/employee-relations/{id}', [\App\Http\Controllers\Api\EmployeeRelationsController::class, 'update']);
Route::middleware('can:employees,create')->post('/employee-relations/{caseId}/disciplinary', [\App\Http\Controllers\Api\EmployeeRelationsController::class, 'storeDisciplinaryAction']);

// Travel & Expenses
Route::middleware('can:employees,view')->get('/travel-requests', [\App\Http\Controllers\Api\TravelExpenseController::class, 'indexRequests']);
Route::middleware('can:employees,create')->post('/travel-requests', [\App\Http\Controllers\Api\TravelExpenseController::class, 'storeRequest']);
Route::middleware('can:employees,edit')->put('/travel-requests/{id}/status', [\App\Http\Controllers\Api\TravelExpenseController::class, 'updateRequestStatus']);
Route::middleware('can:employees,view')->get('/travel-expenses', [\App\Http\Controllers\Api\TravelExpenseController::class, 'indexExpenses']);
Route::middleware('can:employees,create')->post('/travel-expenses', [\App\Http\Controllers\Api\TravelExpenseController::class, 'storeExpense']);
Route::middleware('can:employees,edit')->put('/travel-expenses/{id}/status', [\App\Http\Controllers\Api\TravelExpenseController::class, 'updateExpenseStatus']);

// Employee Loans
Route::middleware('can:employees,view')->get('/employee-loans', [\App\Http\Controllers\Api\EmployeeLoansController::class, 'index']);
Route::middleware('can:employees,create')->post('/employee-loans', [\App\Http\Controllers\Api\EmployeeLoansController::class, 'store']);
Route::middleware('can:employees,view')->get('/employee-loans/{id}', [\App\Http\Controllers\Api\EmployeeLoansController::class, 'show']);
Route::middleware('can:employees,edit')->put('/employee-loans/{id}/status', [\App\Http\Controllers\Api\EmployeeLoansController::class, 'updateStatus']);
Route::middleware('can:employees,edit')->put('/employee-loans/{id}/repayments/{repaymentId}', [\App\Http\Controllers\Api\EmployeeLoansController::class, 'recordRepayment']);

// Performance & Goals
Route::middleware('can:employees,view')->get('/performance/goals', [\App\Http\Controllers\Api\PerformanceController::class, 'indexGoals']);
Route::middleware('can:employees,create')->post('/performance/goals', [\App\Http\Controllers\Api\PerformanceController::class, 'storeGoal']);
Route::middleware('can:employees,edit')->put('/performance/goals/{id}', [\App\Http\Controllers\Api\PerformanceController::class, 'updateGoal']);
Route::middleware('can:employees,view')->get('/performance/appraisals', [\App\Http\Controllers\Api\PerformanceController::class, 'indexAppraisals']);
Route::middleware('can:employees,create')->post('/performance/appraisals', [\App\Http\Controllers\Api\PerformanceController::class, 'storeAppraisal']);
Route::middleware('can:employees,edit')->put('/performance/appraisals/{id}', [\App\Http\Controllers\Api\PerformanceController::class, 'updateAppraisal']);
Route::middleware('can:employees,view')->get('/performance/feedback', [\App\Http\Controllers\Api\PerformanceController::class, 'indexFeedback']);
Route::middleware('can:employees,create')->post('/performance/feedback', [\App\Http\Controllers\Api\PerformanceController::class, 'storeFeedback']);

// Learning Management (LMS)
Route::middleware('can:employees,view')->get('/learning/courses', [\App\Http\Controllers\Api\LearningController::class, 'indexCourses']);
Route::middleware('can:employees,create')->post('/learning/courses', [\App\Http\Controllers\Api\LearningController::class, 'storeCourse']);
Route::middleware('can:employees,view')->get('/learning/courses/{id}', [\App\Http\Controllers\Api\LearningController::class, 'showCourse']);
Route::middleware('can:employees,edit')->put('/learning/courses/{id}', [\App\Http\Controllers\Api\LearningController::class, 'updateCourse']);
Route::middleware('can:employees,view')->get('/learning/enrollments', [\App\Http\Controllers\Api\LearningController::class, 'indexEnrollments']);
Route::middleware('can:employees,create')->post('/learning/enrollments', [\App\Http\Controllers\Api\LearningController::class, 'storeEnrollment']);
Route::middleware('can:employees,edit')->put('/learning/enrollments/{id}', [\App\Http\Controllers\Api\LearningController::class, 'updateEnrollment']);

// Corporate Communications
Route::middleware('can:employees,view')->get('/communications/announcements', [\App\Http\Controllers\Api\CorporateCommunicationsController::class, 'indexAnnouncements']);
Route::middleware('can:employees,create')->post('/communications/announcements', [\App\Http\Controllers\Api\CorporateCommunicationsController::class, 'storeAnnouncement']);
Route::middleware('can:employees,edit')->put('/communications/announcements/{id}', [\App\Http\Controllers\Api\CorporateCommunicationsController::class, 'updateAnnouncement']);
Route::middleware('can:employees,view')->get('/communications/surveys', [\App\Http\Controllers\Api\CorporateCommunicationsController::class, 'indexSurveys']);
Route::middleware('can:employees,create')->post('/communications/surveys', [\App\Http\Controllers\Api\CorporateCommunicationsController::class, 'storeSurvey']);
Route::middleware('can:employees,create')->post('/communications/surveys/{surveyId}/responses', [\App\Http\Controllers\Api\CorporateCommunicationsController::class, 'storeSurveyResponse']);

// EHS (Environment, Health, Safety)
Route::middleware('can:employees,view')->get('/ehs/incidents', [\App\Http\Controllers\Api\EhsController::class, 'indexIncidents']);
Route::middleware('can:employees,create')->post('/ehs/incidents', [\App\Http\Controllers\Api\EhsController::class, 'storeIncident']);
Route::middleware('can:employees,edit')->put('/ehs/incidents/{id}', [\App\Http\Controllers\Api\EhsController::class, 'updateIncident']);
Route::middleware('can:employees,view')->get('/ehs/health-records', [\App\Http\Controllers\Api\EhsController::class, 'indexHealthRecords']);
Route::middleware('can:employees,create')->post('/ehs/health-records', [\App\Http\Controllers\Api\EhsController::class, 'storeHealthRecord']);
Route::middleware('can:employees,view')->get('/ehs/ppe', [\App\Http\Controllers\Api\EhsController::class, 'indexPpe']);
Route::middleware('can:employees,create')->post('/ehs/ppe', [\App\Http\Controllers\Api\EhsController::class, 'storePpe']);

// Wellness Programs
Route::middleware('can:employees,view')->get('/wellness/programs', [\App\Http\Controllers\Api\WellnessController::class, 'indexPrograms']);
Route::middleware('can:employees,create')->post('/wellness/programs', [\App\Http\Controllers\Api\WellnessController::class, 'storeProgram']);
Route::middleware('can:employees,view')->get('/wellness/participations', [\App\Http\Controllers\Api\WellnessController::class, 'indexParticipations']);
Route::middleware('can:employees,create')->post('/wellness/participations', [\App\Http\Controllers\Api\WellnessController::class, 'storeParticipation']);
Route::middleware('can:employees,edit')->put('/wellness/participations/{id}', [\App\Http\Controllers\Api\WellnessController::class, 'updateParticipation']);

// Succession Planning
Route::middleware('can:employees,view')->get('/succession', [\App\Http\Controllers\Api\SuccessionController::class, 'index']);
Route::middleware('can:employees,create')->post('/succession', [\App\Http\Controllers\Api\SuccessionController::class, 'store']);
Route::middleware('can:employees,view')->get('/succession/{id}', [\App\Http\Controllers\Api\SuccessionController::class, 'show']);
Route::middleware('can:employees,edit')->put('/succession/{id}', [\App\Http\Controllers\Api\SuccessionController::class, 'update']);
Route::middleware('can:employees,create')->post('/succession/{planId}/candidates', [\App\Http\Controllers\Api\SuccessionController::class, 'storeCandidate']);
Route::middleware('can:employees,edit')->put('/succession/{planId}/candidates/{candidateId}', [\App\Http\Controllers\Api\SuccessionController::class, 'updateCandidate']);

// Compensation Management
Route::middleware('can:employees,view')->get('/compensation/plans', [\App\Http\Controllers\Api\CompensationController::class, 'indexPlans']);
Route::middleware('can:employees,create')->post('/compensation/plans', [\App\Http\Controllers\Api\CompensationController::class, 'storePlan']);
Route::middleware('can:employees,view')->get('/compensation/plans/{id}', [\App\Http\Controllers\Api\CompensationController::class, 'showPlan']);
Route::middleware('can:employees,edit')->put('/compensation/plans/{id}', [\App\Http\Controllers\Api\CompensationController::class, 'updatePlan']);
Route::middleware('can:employees,view')->get('/compensation/entries', [\App\Http\Controllers\Api\CompensationController::class, 'indexEntries']);
Route::middleware('can:employees,create')->post('/compensation/entries', [\App\Http\Controllers\Api\CompensationController::class, 'storeEntry']);
Route::middleware('can:employees,edit')->put('/compensation/entries/{id}/status', [\App\Http\Controllers\Api\CompensationController::class, 'updateEntryStatus']);

// Benefits Administration
Route::middleware('can:employees,view')->get('/benefits/plans', [\App\Http\Controllers\Api\BenefitsController::class, 'indexPlans']);
Route::middleware('can:employees,create')->post('/benefits/plans', [\App\Http\Controllers\Api\BenefitsController::class, 'storePlan']);
Route::middleware('can:employees,view')->get('/benefits/plans/{id}', [\App\Http\Controllers\Api\BenefitsController::class, 'showPlan']);
Route::middleware('can:employees,edit')->put('/benefits/plans/{id}', [\App\Http\Controllers\Api\BenefitsController::class, 'updatePlan']);
Route::middleware('can:employees,view')->get('/benefits/enrollments', [\App\Http\Controllers\Api\BenefitsController::class, 'indexEnrollments']);
Route::middleware('can:employees,create')->post('/benefits/enrollments', [\App\Http\Controllers\Api\BenefitsController::class, 'storeEnrollment']);
Route::middleware('can:employees,edit')->put('/benefits/enrollments/{id}', [\App\Http\Controllers\Api\BenefitsController::class, 'updateEnrollment']);

// Post-Payroll Integrations
Route::middleware('can:payroll,view')->get('/post-payroll', [\App\Http\Controllers\Api\PostPayrollController::class, 'index']);
Route::middleware('can:payroll,create')->post('/post-payroll', [\App\Http\Controllers\Api\PostPayrollController::class, 'store']);
Route::middleware('can:payroll,edit')->post('/post-payroll/{id}/process', [\App\Http\Controllers\Api\PostPayrollController::class, 'process']);
Route::middleware('can:payroll,edit')->post('/post-payroll/{id}/reconcile', [\App\Http\Controllers\Api\PostPayrollController::class, 'reconcile']);

// Knowledge Management
Route::middleware('can:employees,view')->get('/knowledge-base', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'indexKnowledgeBase']);
Route::middleware('can:employees,create')->post('/knowledge-base', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'storeKnowledgeBase']);
Route::middleware('can:employees,view')->get('/knowledge-base/{id}', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'showKnowledgeBase']);
Route::middleware('can:employees,edit')->put('/knowledge-base/{id}', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'updateKnowledgeBase']);
Route::middleware('can:employees,edit')->post('/knowledge-base/{id}/helpful', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'markHelpful']);
Route::middleware('can:employees,view')->get('/expertise', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'indexExpertise']);
Route::middleware('can:employees,create')->post('/expertise', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'storeExpertise']);
Route::middleware('can:employees,edit')->put('/expertise/{id}', [\App\Http\Controllers\Api\KnowledgeManagementController::class, 'updateExpertise']);

// Document Templates
Route::middleware('can:employees,view')->get('/document-templates', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'index']);
Route::middleware('can:employees,create')->post('/document-templates', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'store']);
Route::middleware('can:employees,view')->get('/document-templates/{id}', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'show']);
Route::middleware('can:employees,edit')->put('/document-templates/{id}', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'update']);
Route::middleware('can:employees,delete')->delete('/document-templates/{id}', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'destroy']);
Route::middleware('can:employees,view')->post('/document-templates/{id}/render', [\App\Http\Controllers\Api\DocumentTemplateController::class, 'render']);

// Biometric Device Management
Route::middleware('can:attendance,view')->get('/biometric/devices', [\App\Http\Controllers\Api\BiometricController::class, 'indexDevices']);
Route::middleware('can:attendance,create')->post('/biometric/devices', [\App\Http\Controllers\Api\BiometricController::class, 'storeDevice']);
Route::middleware('can:attendance,edit')->put('/biometric/devices/{id}', [\App\Http\Controllers\Api\BiometricController::class, 'updateDevice']);
Route::middleware('can:attendance,delete')->delete('/biometric/devices/{id}', [\App\Http\Controllers\Api\BiometricController::class, 'destroyDevice']);
Route::middleware('can:attendance,edit')->post('/biometric/devices/{id}/sync', [\App\Http\Controllers\Api\BiometricController::class, 'syncDevice']);
Route::middleware('can:attendance,view')->get('/biometric/sync-logs', [\App\Http\Controllers\Api\BiometricController::class, 'syncLogs']);
Route::middleware('can:attendance,create')->post('/biometric/import', [\App\Http\Controllers\Api\BiometricController::class, 'importFromFile']);

// HR Administration - Job Titles & Capacity Planning
Route::middleware('can:employees,view')->get('/job-titles', [\App\Http\Controllers\Api\HrAdministrationController::class, 'indexJobTitles']);
Route::middleware('can:employees,create')->post('/job-titles', [\App\Http\Controllers\Api\HrAdministrationController::class, 'storeJobTitle']);
Route::middleware('can:employees,edit')->put('/job-titles/{id}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'updateJobTitle']);
Route::middleware('can:employees,delete')->delete('/job-titles/{id}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'destroyJobTitle']);
Route::middleware('can:employees,view')->get('/capacity-overview', [\App\Http\Controllers\Api\HrAdministrationController::class, 'capacityOverview']);

// HR Administration - Employee-User Linking
Route::middleware('can:employees,edit')->post('/employee-user-link', [\App\Http\Controllers\Api\HrAdministrationController::class, 'linkEmployeeToUser']);
Route::middleware('can:employees,edit')->delete('/employee-user-link/{employeeId}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'unlinkEmployee']);

// HR Administration - Permission Templates
Route::middleware('can:employees,view')->get('/permission-templates', [\App\Http\Controllers\Api\HrAdministrationController::class, 'indexTemplates']);
Route::middleware('can:employees,create')->post('/permission-templates', [\App\Http\Controllers\Api\HrAdministrationController::class, 'storeTemplate']);
Route::middleware('can:employees,edit')->put('/permission-templates/{id}', [\App\Http\Controllers\Api\HrAdministrationController::class, 'updateTemplate']);
Route::middleware('can:employees,edit')->post('/permission-templates/apply', [\App\Http\Controllers\Api\HrAdministrationController::class, 'applyTemplateToRole']);

// Employee File Management (enhanced)
Route::middleware('can:employees,view')->get('/employee-files/{employeeId}', [\App\Http\Controllers\Api\EmployeesController::class, 'getDocuments']);
Route::middleware('can:employees,create')->post('/employee-files/{employeeId}', [\App\Http\Controllers\Api\EmployeesController::class, 'uploadDocument']);
Route::middleware('can:employees,view')->get('/employee-files/{employeeId}/download/{documentId}', [\App\Http\Controllers\Api\EmployeesController::class, 'downloadDocument']);