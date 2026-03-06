<?php

use App\Http\Controllers\Api\NumberRangeController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Number Range Routes
|--------------------------------------------------------------------------
| SAP-style Number Range Object & Group Management.
*/

// ── NR Objects ─────────────────────────────────────────────────
Route::get('/number-ranges', [NumberRangeController::class, 'indexObjects']);
Route::get('/number-ranges/summary', [NumberRangeController::class, 'systemSummary']);
Route::post('/number-ranges', [NumberRangeController::class, 'storeObject']);
Route::get('/number-ranges/{id}', [NumberRangeController::class, 'showObject']);
Route::get('/number-ranges/type/{objectType}', [NumberRangeController::class, 'showObjectByType']);
Route::put('/number-ranges/{id}', [NumberRangeController::class, 'updateObject']);
Route::delete('/number-ranges/{id}', [NumberRangeController::class, 'destroyObject']);

// ── Groups ─────────────────────────────────────────────────────
Route::get('/number-ranges/{objectId}/groups', [NumberRangeController::class, 'indexGroups']);
Route::post('/number-ranges/{objectId}/groups', [NumberRangeController::class, 'storeGroup']);
Route::put('/number-ranges/groups/{groupId}', [NumberRangeController::class, 'updateGroup']);
Route::delete('/number-ranges/groups/{groupId}', [NumberRangeController::class, 'destroyGroup']);

// ── Intervals ──────────────────────────────────────────────────
Route::get('/number-ranges/{objectId}/intervals', [NumberRangeController::class, 'indexIntervals']);
Route::post('/number-ranges/{objectId}/intervals', [NumberRangeController::class, 'storeInterval']);
Route::put('/number-ranges/intervals/{intervalId}', [NumberRangeController::class, 'updateInterval']);
Route::delete('/number-ranges/intervals/{intervalId}', [NumberRangeController::class, 'destroyInterval']);

// ── Assignments ────────────────────────────────────────────────
Route::get('/number-ranges/{objectId}/assignments', [NumberRangeController::class, 'indexAssignments']);
Route::post('/number-ranges/{objectId}/assignments', [NumberRangeController::class, 'storeAssignment']);
Route::delete('/number-ranges/assignments/{assignmentId}', [NumberRangeController::class, 'destroyAssignment']);

// ── Domain Fullness & Expansion ────────────────────────────────
Route::get('/number-ranges/{objectId}/fullness', [NumberRangeController::class, 'fullnessReport']);
Route::post('/number-ranges/intervals/{intervalId}/expand', [NumberRangeController::class, 'expandInterval']);
Route::get('/number-ranges/intervals/{intervalId}/expansion-logs', [NumberRangeController::class, 'expansionLogs']);

// ── Next Number Generation ─────────────────────────────────────
Route::post('/number-ranges/next-number', [NumberRangeController::class, 'getNextNumber']);
