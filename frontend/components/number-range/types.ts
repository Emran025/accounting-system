// ══════════════════════════════════════════════════════════════
// Number Range & Group Management — Types
// ══════════════════════════════════════════════════════════════

export interface NrObject {
    id: number;
    object_type: string;
    name: string;
    name_en?: string;
    description?: string;
    number_length: number;
    prefix?: string;
    is_active: boolean;
    groups_count?: number;
    intervals_count?: number;
    assignments_count?: number;
    created_at?: string;
}

export interface NrGroup {
    id: number;
    nr_object_id: number;
    code: string;
    name: string;
    name_en?: string;
    description?: string;
    is_active: boolean;
    intervals?: NrInterval[];
    created_at?: string;
}

export interface NrInterval {
    id: number;
    nr_object_id: number;
    code: string;
    description?: string;
    from_number: number;
    to_number: number;
    current_number: number;
    is_external: boolean;
    is_active: boolean;
    capacity: number;
    used: number;
    remaining: number;
    fullness_percent: number;
    status: "healthy" | "warning" | "critical";
    groups?: NrGroup[];
    created_at?: string;
}

export interface NrAssignment {
    id: number;
    nr_object_id: number;
    nr_group_id: number;
    nr_interval_id: number;
    is_active: boolean;
    group?: NrGroup;
    interval?: NrInterval;
    created_at?: string;
}

export interface NrExpansionLog {
    id: number;
    nr_interval_id: number;
    old_from: number;
    old_to: number;
    new_from: number;
    new_to: number;
    reason?: string;
    expanded_by?: { id: number; name: string };
    created_at: string;
}

export interface NrObjectSummary {
    total_groups: number;
    total_intervals: number;
    total_assignments: number;
    total_capacity: number;
    total_used: number;
    total_remaining: number;
    overall_fullness: number;
}

export interface NrObjectFull extends NrObject {
    groups: NrGroup[];
    intervals: NrInterval[];
    assignments: NrAssignment[];
    summary: NrObjectSummary;
}
