"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { showAlert } from "@/components/ui";
import type { NrObjectFull, NrGroup, NrInterval } from "./types";

// ══════════════════════════════════════════════════════════════
//  Shared hook for Number Range data loading & CRUD operations
//  Used by all 5 NR pages to share state and logic.
// ══════════════════════════════════════════════════════════════

interface UseNumberRangeOptions {
    objectType: string;
    alertContainerId?: string;
}

export function useNumberRange({ objectType, alertContainerId = "nr-alert" }: UseNumberRangeOptions) {
    const [objectData, setObjectData] = useState<NrObjectFull | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const alert = (msg: string, type: "success" | "error" | "info" = "info") => {
        showAlert(alertContainerId, msg, type);
    };

    // ── Load Full Object Data ─────────────────────────────────
    const loadData = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.OBJECTS.byType(objectType));
            if (res.success && res.id) {
                setObjectData(res as unknown as NrObjectFull);
            } else {
                setObjectData(null);
            }
        } catch {
            setObjectData(null);
        } finally {
            setIsLoading(false);
        }
    }, [objectType]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // ── Object Setup ──────────────────────────────────────────
    const createObject = async (data: {
        name: string;
        name_en?: string;
        number_length: number;
        prefix?: string;
    }): Promise<boolean> => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.OBJECTS.BASE, {
                method: "POST",
                body: JSON.stringify({
                    object_type: objectType,
                    ...data,
                }),
            });
            if (res.success) {
                alert("تم إنشاء إعدادات الترقيم بنجاح", "success");
                await loadData();
                return true;
            }
            alert(res.message || "فشل الإنشاء", "error");
            return false;
        } catch {
            alert("خطأ في الاتصال", "error");
            return false;
        }
    };

    // ── Group CRUD ─────────────────────────────────────────────
    const saveGroup = async (data: {
        code: string;
        name: string;
        name_en?: string;
        description?: string;
    }, editId?: number | null): Promise<boolean> => {
        if (!objectData) return false;
        try {
            const isEdit = editId != null;
            const url = isEdit
                ? API_ENDPOINTS.NUMBER_RANGES.GROUPS.update(editId!)
                : API_ENDPOINTS.NUMBER_RANGES.GROUPS.create(objectData.id);
            const method = isEdit ? "PUT" : "POST";

            const res = await fetchAPI(url, {
                method,
                body: JSON.stringify(data),
            });
            if (res.success) {
                alert(isEdit ? "تم تحديث المجموعة" : "تم إنشاء المجموعة", "success");
                await loadData();
                return true;
            }
            alert(res.message || "فشل الحفظ", "error");
            return false;
        } catch {
            alert("خطأ في الاتصال", "error");
            return false;
        }
    };

    const deleteGroup = async (id: number): Promise<boolean> => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.GROUPS.delete(id), { method: "DELETE" });
            if (res.success) {
                alert("تم حذف المجموعة", "success");
                await loadData();
                return true;
            }
            alert(res.message || "فشل الحذف", "error");
            return false;
        } catch {
            alert("خطأ في الاتصال", "error");
            return false;
        }
    };

    // ── Interval CRUD ─────────────────────────────────────────
    const saveInterval = async (data: {
        code: string;
        description?: string;
        from_number?: number;
        to_number?: number;
        is_external?: boolean;
    }, editId?: number | null): Promise<boolean> => {
        if (!objectData) return false;
        try {
            const isEdit = editId != null;
            const url = isEdit
                ? API_ENDPOINTS.NUMBER_RANGES.INTERVALS.update(editId!)
                : API_ENDPOINTS.NUMBER_RANGES.INTERVALS.create(objectData.id);
            const method = isEdit ? "PUT" : "POST";

            const res = await fetchAPI(url, {
                method,
                body: JSON.stringify(data),
            });
            if (res.success) {
                alert(isEdit ? "تم تحديث النطاق" : "تم إنشاء النطاق", "success");
                await loadData();
                return true;
            }
            alert(res.message || "فشل الحفظ", "error");
            return false;
        } catch {
            alert("خطأ في الاتصال", "error");
            return false;
        }
    };

    const deleteInterval = async (id: number): Promise<boolean> => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.INTERVALS.delete(id), { method: "DELETE" });
            if (res.success) {
                alert("تم حذف النطاق", "success");
                await loadData();
                return true;
            }
            alert(res.message || "فشل الحذف", "error");
            return false;
        } catch {
            alert("خطأ في الاتصال", "error");
            return false;
        }
    };

    const expandInterval = async (intervalId: number, newTo: number, reason?: string): Promise<boolean> => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.INTERVALS.expand(intervalId), {
                method: "POST",
                body: JSON.stringify({ new_to: newTo, reason: reason || null }),
            });
            if (res.success) {
                alert("تم توسيع النطاق بنجاح", "success");
                await loadData();
                return true;
            }
            alert(res.message || "فشل التوسيع", "error");
            return false;
        } catch {
            alert("خطأ في الاتصال", "error");
            return false;
        }
    };

    // ── Assignment CRUD ───────────────────────────────────────
    const saveAssignment = async (groupId: number, intervalId: number): Promise<boolean> => {
        if (!objectData) return false;
        try {
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.ASSIGNMENTS.create(objectData.id), {
                method: "POST",
                body: JSON.stringify({
                    nr_group_id: groupId,
                    nr_interval_id: intervalId,
                }),
            });
            if (res.success) {
                alert("تم الربط بنجاح", "success");
                await loadData();
                return true;
            }
            alert(res.message || "فشل الربط", "error");
            return false;
        } catch {
            alert("خطأ في الاتصال", "error");
            return false;
        }
    };

    const deleteAssignment = async (id: number): Promise<boolean> => {
        try {
            const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.ASSIGNMENTS.delete(id), { method: "DELETE" });
            if (res.success) {
                alert("تم حذف الربط", "success");
                await loadData();
                return true;
            }
            alert(res.message || "فشل الحذف", "error");
            return false;
        } catch {
            alert("خطأ في الاتصال", "error");
            return false;
        }
    };

    return {
        objectData,
        isLoading,
        loadData,
        createObject,
        saveGroup,
        deleteGroup,
        saveInterval,
        deleteInterval,
        expandInterval,
        saveAssignment,
        deleteAssignment,
    };
}
