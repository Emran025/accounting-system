<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class EhsIncident extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'incident_number', 'employee_id', 'incident_type', 'incident_date', 'incident_time',
        'location', 'description', 'severity', 'status', 'immediate_action_taken',
        'root_cause', 'preventive_measures', 'osha_reportable', 'osha_report_path',
        'reported_by', 'investigated_by', 'notes'
    ];

    protected $casts = [
        'incident_date' => 'date',
        'incident_time' => 'datetime',
        'osha_reportable' => 'boolean',
    ];

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }

    public function reportedBy()
    {
        return $this->belongsTo(User::class, 'reported_by');
    }

    public function investigatedBy()
    {
        return $this->belongsTo(User::class, 'investigated_by');
    }
}

