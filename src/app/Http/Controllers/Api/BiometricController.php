<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BiometricDevice;
use App\Models\BiometricSyncLog;
use App\Models\AttendanceRecord;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class BiometricController extends Controller
{
    use BaseApiController;

    // ── Devices ──

    public function indexDevices(Request $request): JsonResponse
    {
        $devices = BiometricDevice::with('latestSync')
            ->when($request->filled('status'), fn($q) => $q->where('status', $request->status))
            ->orderBy('device_name')
            ->get();

        return $this->successResponse($devices->toArray());
    }

    public function storeDevice(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'device_name' => 'required|string|max:255',
            'device_ip' => 'nullable|string|max:45',
            'device_port' => 'nullable|integer',
            'serial_number' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:255',
        ]);

        $validated['created_by'] = auth()->id();
        $validated['status'] = 'offline';
        $device = BiometricDevice::create($validated);

        return $this->successResponse($device->toArray(), 'Device registered');
    }

    public function updateDevice(Request $request, $id): JsonResponse
    {
        $device = BiometricDevice::findOrFail($id);

        $validated = $request->validate([
            'device_name' => 'string|max:255',
            'device_ip' => 'nullable|string|max:45',
            'device_port' => 'nullable|integer',
            'serial_number' => 'nullable|string|max:100',
            'location' => 'nullable|string|max:255',
            'status' => 'in:online,offline,maintenance,error',
            'is_active' => 'boolean',
        ]);

        $device->update($validated);
        return $this->successResponse($device->toArray(), 'Device updated');
    }

    public function destroyDevice($id): JsonResponse
    {
        $device = BiometricDevice::findOrFail($id);
        $device->delete();
        return $this->successResponse([], 'Device removed');
    }

    // ── Sync Operations ──

    public function syncDevice(Request $request, $id): JsonResponse
    {
        $device = BiometricDevice::findOrFail($id);

        $request->validate([
            'records' => 'nullable|array',
            'records.*.employee_code' => 'required|string',
            'records.*.check_in' => 'required|date',
            'records.*.check_out' => 'nullable|date',
            'records.*.attendance_date' => 'required|date',
        ]);

        $syncLog = BiometricSyncLog::create([
            'device_id' => $device->id,
            'sync_type' => 'manual',
            'status' => 'in_progress',
            'initiated_by' => auth()->id(),
            'started_at' => now(),
        ]);

        $imported = 0;
        $failed = 0;

        if ($request->filled('records')) {
            foreach ($request->records as $record) {
                try {
                    $employee = \App\Models\Employee::where('employee_code', $record['employee_code'])->first();
                    if (!$employee) {
                        $failed++;
                        continue;
                    }

                    AttendanceRecord::updateOrCreate(
                        [
                            'employee_id' => $employee->id,
                            'attendance_date' => $record['attendance_date'],
                        ],
                        [
                            'check_in' => $record['check_in'],
                            'check_out' => $record['check_out'] ?? null,
                            'status' => 'present',
                            'source' => 'biometric',
                            'created_by' => auth()->id(),
                        ]
                    );
                    $imported++;
                } catch (\Exception $e) {
                    $failed++;
                }
            }
        }

        $syncLog->update([
            'records_imported' => $imported,
            'records_failed' => $failed,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $device->update([
            'last_sync_at' => now(),
            'total_records_synced' => $device->total_records_synced + $imported,
            'status' => 'online',
        ]);

        return $this->successResponse($syncLog->toArray(), "Sync complete: {$imported} imported, {$failed} failed");
    }

    // ── Sync Logs ──

    public function syncLogs(Request $request): JsonResponse
    {
        $query = BiometricSyncLog::with(['device', 'initiator']);

        if ($request->filled('device_id')) {
            $query->where('device_id', $request->device_id);
        }

        $logs = $query->orderByDesc('created_at')->paginate(20);
        return $this->successResponse($logs->toArray());
    }

    /**
     * Import attendance from file upload (CSV/Excel placeholder).
     */
    public function importFromFile(Request $request): JsonResponse
    {
        $request->validate([
            'device_id' => 'required|exists:biometric_devices,id',
            'file' => 'required|file|mimes:csv,txt,xlsx|max:10240',
        ]);

        $device = BiometricDevice::findOrFail($request->device_id);

        $syncLog = BiometricSyncLog::create([
            'device_id' => $device->id,
            'sync_type' => 'import',
            'status' => 'in_progress',
            'initiated_by' => auth()->id(),
            'started_at' => now(),
        ]);

        // Parse CSV
        $file = $request->file('file');
        $imported = 0;
        $failed = 0;

        if (($handle = fopen($file->getPathname(), 'r')) !== false) {
            $header = fgetcsv($handle); // Skip header
            while (($row = fgetcsv($handle)) !== false) {
                try {
                    if (count($row) < 3) { $failed++; continue; }

                    $employee = \App\Models\Employee::where('employee_code', trim($row[0]))->first();
                    if (!$employee) { $failed++; continue; }

                    AttendanceRecord::updateOrCreate(
                        [
                            'employee_id' => $employee->id,
                            'attendance_date' => trim($row[1]),
                        ],
                        [
                            'check_in' => trim($row[2]),
                            'check_out' => isset($row[3]) ? trim($row[3]) : null,
                            'status' => 'present',
                            'source' => 'biometric',
                            'created_by' => auth()->id(),
                        ]
                    );
                    $imported++;
                } catch (\Exception $e) {
                    $failed++;
                }
            }
            fclose($handle);
        }

        $syncLog->update([
            'records_imported' => $imported,
            'records_failed' => $failed,
            'status' => 'completed',
            'completed_at' => now(),
        ]);

        $device->update([
            'last_sync_at' => now(),
            'total_records_synced' => $device->total_records_synced + $imported,
        ]);

        return $this->successResponse($syncLog->toArray(), "File import complete: {$imported} imported, {$failed} failed");
    }
}
