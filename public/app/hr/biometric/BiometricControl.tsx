"use client";

import { useState, useEffect, useRef } from "react";
import { Button, Table, Column, Dialog, showToast, Select } from "@/components/ui";
import { TextInput } from "@/components/ui/TextInput";
import { Textarea } from "@/components/ui/Textarea";
import { useAuthStore } from "@/stores/useAuthStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { PageSubHeader } from "@/components/layout";
import { BiometricDevice, BiometricSyncLog } from "@/app/hr/types";

const statusLabels: Record<string, string> = {
    online: "متصل",
    offline: "غير متصل",
    maintenance: "صيانة",
    error: "خطأ",
};

const statusColors: Record<string, string> = {
    online: "success",
    offline: "secondary",
    maintenance: "warning",
    error: "danger",
};

const syncStatusLabels: Record<string, string> = {
    pending: "قيد الانتظار",
    in_progress: "جاري",
    completed: "مكتمل",
    failed: "فشل",
};

export function BiometricControl() {
    const { canAccess } = useAuthStore();
    const [activeTab, setActiveTab] = useState<"devices" | "logs">("devices");
    const [devices, setDevices] = useState<BiometricDevice[]>([]);
    const [syncLogs, setSyncLogs] = useState<BiometricSyncLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showAddDevice, setShowAddDevice] = useState(false);
    const [showSyncDialog, setShowSyncDialog] = useState(false);
    const [showImportDialog, setShowImportDialog] = useState(false);
    const [selectedDevice, setSelectedDevice] = useState<BiometricDevice | null>(null);
    const [syncingDeviceId, setSyncingDeviceId] = useState<number | null>(null);
    const importFileRef = useRef<HTMLInputElement>(null);

    const [newDevice, setNewDevice] = useState({
        device_name: "",
        device_ip: "",
        device_port: "4370",
        serial_number: "",
        location: "",
    });

    const [manualRecords, setManualRecords] = useState("");

    useEffect(() => {
        if (activeTab === "devices") loadDevices();
        else loadSyncLogs();
    }, [activeTab]);

    const loadDevices = async () => {
        setIsLoading(true);
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.BIOMETRIC.DEVICES);
            setDevices((res as any).data || []);
        } catch { console.error("Failed to load devices"); }
        finally { setIsLoading(false); }
    };

    const loadSyncLogs = async () => {
        setIsLoading(true);
        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.BIOMETRIC.SYNC_LOGS);
            const data = (res as any).data;
            setSyncLogs(data?.data || data || []);
        } catch { console.error("Failed to load sync logs"); }
        finally { setIsLoading(false); }
    };

    const handleAddDevice = async () => {
        if (!newDevice.device_name) {
            showToast("يرجى إدخال اسم الجهاز", "error");
            return;
        }
        try {
            await fetchAPI(API_ENDPOINTS.HR.BIOMETRIC.DEVICES, {
                method: "POST",
                body: JSON.stringify({ ...newDevice, device_port: Number(newDevice.device_port) }),
            });
            showToast("تم تسجيل الجهاز بنجاح", "success");
            setShowAddDevice(false);
            setNewDevice({ device_name: "", device_ip: "", device_port: "4370", serial_number: "", location: "" });
            loadDevices();
        } catch { showToast("فشل تسجيل الجهاز", "error"); }
    };

    const handleSync = async () => {
        if (!selectedDevice) return;
        setSyncingDeviceId(selectedDevice.id);

        try {
            // Parse manual records if provided
            let records: Array<{ employee_code: string; check_in: string; check_out?: string; attendance_date: string }> = [];
            if (manualRecords.trim()) {
                const lines = manualRecords.trim().split("\n");
                records = lines.map((line) => {
                    const parts = line.split(",").map((p) => p.trim());
                    return {
                        employee_code: parts[0] || "",
                        attendance_date: parts[1] || "",
                        check_in: parts[2] || "",
                        check_out: parts[3] || undefined,
                    };
                });
            }

            const res = await fetchAPI(API_ENDPOINTS.HR.BIOMETRIC.SYNC(selectedDevice.id), {
                method: "POST",
                body: JSON.stringify({ records }),
            });
            showToast(res.message || "تمت المزامنة بنجاح", "success");
            setShowSyncDialog(false);
            setManualRecords("");
            loadDevices();
        } catch { showToast("فشلت المزامنة", "error"); }
        finally { setSyncingDeviceId(null); }
    };

    const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !selectedDevice) return;

        const formData = new FormData();
        formData.append("file", file);
        formData.append("device_id", selectedDevice.id.toString());

        try {
            const res = await fetchAPI(API_ENDPOINTS.HR.BIOMETRIC.IMPORT, {
                method: "POST",
                body: formData as any,
                headers: {}, // Remove JSON content-type for FormData
            });
            showToast(res.message || "تم استيراد الملف بنجاح", "success");
            setShowImportDialog(false);
            loadDevices();
        } catch { showToast("فشل استيراد الملف", "error"); }
    };

    const handleDeleteDevice = async (id: number) => {
        if (!confirm("هل أنت متأكد من حذف هذا الجهاز؟")) return;
        try {
            await fetchAPI(API_ENDPOINTS.HR.BIOMETRIC.DEVICE_WITH_ID(id), { method: "DELETE" });
            showToast("تم حذف الجهاز", "success");
            loadDevices();
        } catch { showToast("فشل حذف الجهاز", "error"); }
    };

    const deviceColumns: Column<BiometricDevice>[] = [
        { key: "device_name", header: "اسم الجهاز", dataLabel: "الجهاز" },
        { key: "device_ip", header: "عنوان IP", dataLabel: "IP", render: (item) => <span className="text-mono">{item.device_ip || "—"}</span> },
        { key: "location", header: "الموقع", dataLabel: "الموقع", render: (item) => <span>{item.location || "—"}</span> },
        {
            key: "status", header: "الحالة", dataLabel: "الحالة",
            render: (item) => <span className={`badge badge-${statusColors[item.status]}`}>{statusLabels[item.status]}</span>,
        },
        { key: "total_records_synced", header: "سجلات", dataLabel: "سجلات" },
        {
            key: "last_sync_at", header: "آخر مزامنة", dataLabel: "آخر مزامنة",
            render: (item) => <span>{item.last_sync_at ? new Date(item.last_sync_at).toLocaleString("ar-SA") : "—"}</span>,
        },
        {
            key: "id", header: "الإجراءات", dataLabel: "إجراءات",
            render: (item) => (
                <div className="flex gap-1 flex-wrap">
                    <Button variant="primary" icon="refresh-cw" onClick={() => { setSelectedDevice(item); setShowSyncDialog(true); }}
                        disabled={syncingDeviceId === item.id}>
                        {syncingDeviceId === item.id ? "جاري..." : "مزامنة"}
                    </Button>
                    <Button variant="secondary" icon="upload" onClick={() => { setSelectedDevice(item); setShowImportDialog(true); }}>استيراد</Button>
                    {canAccess("attendance", "delete") && (
                        <Button variant="danger" icon="trash" onClick={() => handleDeleteDevice(item.id)}>حذف</Button>
                    )}
                </div>
            ),
        },
    ];

    const logColumns: Column<BiometricSyncLog>[] = [
        { key: "id", header: "#", dataLabel: "#" },
        { key: "device", header: "الجهاز", dataLabel: "الجهاز", render: (item) => <span>{item.device?.device_name || "—"}</span> },
        { key: "sync_type", header: "النوع", dataLabel: "النوع", render: (item) => <span>{item.sync_type === "manual" ? "يدوي" : item.sync_type === "import" ? "ملف" : "تلقائي"}</span> },
        { key: "records_imported", header: "مستورد", dataLabel: "مستورد" },
        { key: "records_failed", header: "فاشل", dataLabel: "فاشل" },
        { key: "status", header: "الحالة", dataLabel: "الحالة", render: (item) => <span className={`badge ${item.status === "completed" ? "badge-success" : item.status === "failed" ? "badge-danger" : "badge-warning"}`}>{syncStatusLabels[item.status]}</span> },
        { key: "created_at", header: "التاريخ", dataLabel: "التاريخ", render: (item) => <span>{item.created_at ? new Date(item.created_at).toLocaleString("ar-SA") : "—"}</span> },
    ];

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="أجهزة البصمة والحضور"
                titleIcon="clock"
                actions={
                    <div className="flex gap-2">
                        <Button variant={activeTab === "devices" ? "primary" : "secondary"} onClick={() => setActiveTab("devices")}>الأجهزة</Button>
                        <Button variant={activeTab === "logs" ? "primary" : "secondary"} onClick={() => setActiveTab("logs")}>سجل المزامنة</Button>
                        {canAccess("attendance", "create") && activeTab === "devices" && (
                            <Button variant="primary" icon="plus" onClick={() => setShowAddDevice(true)}>جهاز جديد</Button>
                        )}
                    </div>
                }
            />

            {/* Summary Stats */}
            {activeTab === "devices" && (
                <div className="grid grid-cols-4 gap-4 mb-4">
                    {[
                        { label: "إجمالي الأجهزة", value: devices.length, color: "#3b82f6" },
                        { label: "متصل", value: devices.filter((d) => d.status === "online").length, color: "#10b981" },
                        { label: "غير متصل", value: devices.filter((d) => d.status === "offline").length, color: "#6b7280" },
                        { label: "إجمالي السجلات", value: devices.reduce((s, d) => s + d.total_records_synced, 0), color: "#8b5cf6" },
                    ].map((stat, i) => (
                        <div key={i} className="stat-card" style={{ borderRight: `4px solid ${stat.color}`, padding: "16px", borderRadius: "8px" }}>
                            <div className="stat-label">{stat.label}</div>
                            <div className="stat-value" style={{ color: stat.color, fontSize: "24px", fontWeight: 700 }}>{stat.value}</div>
                        </div>
                    ))}
                </div>
            )}

            {activeTab === "devices" ? (
                <Table columns={deviceColumns} data={devices} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد أجهزة مسجلة" isLoading={isLoading} />
            ) : (
                <Table columns={logColumns} data={syncLogs} keyExtractor={(i) => i.id.toString()} emptyMessage="لا توجد سجلات مزامنة" isLoading={isLoading} />
            )}

            {/* Add Device Dialog */}
            <Dialog isOpen={showAddDevice} onClose={() => setShowAddDevice(false)} title="تسجيل جهاز بصمة جديد" footer={
                <>
                    <Button variant="secondary" onClick={() => setShowAddDevice(false)}>إلغاء</Button>
                    <Button variant="primary" onClick={handleAddDevice}>تسجيل</Button>
                </>
            }>
                <div className="space-y-4">
                    <TextInput label="اسم الجهاز *" value={newDevice.device_name} onChange={(e) => setNewDevice({ ...newDevice, device_name: e.target.value })} />
                    <TextInput label="عنوان IP" value={newDevice.device_ip} onChange={(e) => setNewDevice({ ...newDevice, device_ip: e.target.value })} placeholder="192.168.1.100" />
                    <TextInput label="المنفذ (Port)" value={newDevice.device_port} onChange={(e) => setNewDevice({ ...newDevice, device_port: e.target.value })} />
                    <TextInput label="الرقم التسلسلي" value={newDevice.serial_number} onChange={(e) => setNewDevice({ ...newDevice, serial_number: e.target.value })} />
                    <TextInput label="الموقع" value={newDevice.location} onChange={(e) => setNewDevice({ ...newDevice, location: e.target.value })} />
                </div>
            </Dialog>

            {/* Sync Dialog */}
            <Dialog isOpen={showSyncDialog} onClose={() => setShowSyncDialog(false)} title={`مزامنة: ${selectedDevice?.device_name || ''}`} footer={
                <>
                    <Button variant="secondary" onClick={() => setShowSyncDialog(false)}>إلغاء</Button>
                    <Button variant="primary" icon="refresh-cw" onClick={handleSync} disabled={syncingDeviceId !== null}>
                        {syncingDeviceId !== null ? "جاري المزامنة..." : "بدء المزامنة"}
                    </Button>
                </>
            }>
                <div className="space-y-4">
                    <div className="alert alert-info" style={{ borderRadius: "8px", padding: "12px" }}>
                        <p>أدخل السجلات بتنسيق CSV (اختياري):</p>
                        <code style={{ fontSize: "12px" }}>رقم_الموظف,تاريخ_الحضور,وقت_الدخول,وقت_الخروج</code>
                    </div>
                    <Textarea
                        label="السجلات (CSV)"
                        value={manualRecords}
                        onChange={(e) => setManualRecords(e.target.value)}
                        rows={6}
                        placeholder={`EMP001,2026-02-14,08:00:00,17:00:00\nEMP002,2026-02-14,09:00:00,18:00:00`}
                    />
                </div>
            </Dialog>

            {/* File Import Dialog */}
            <Dialog isOpen={showImportDialog} onClose={() => setShowImportDialog(false)} title={`استيراد ملف: ${selectedDevice?.device_name || ''}`} footer={
                <Button variant="secondary" onClick={() => setShowImportDialog(false)}>إغلاق</Button>
            }>
                <div className="space-y-4">
                    <div className="alert alert-info" style={{ borderRadius: "8px", padding: "12px" }}>
                        <p>يجب أن يكون الملف بتنسيق CSV ويحتوي على الأعمدة التالية:</p>
                        <code style={{ fontSize: "12px" }}>employee_code, attendance_date, check_in, check_out</code>
                    </div>
                    <input ref={importFileRef} type="file" accept=".csv,.txt,.xlsx" onChange={handleFileImport}
                        style={{ padding: "12px", border: "2px dashed var(--border-color)", borderRadius: "8px", width: "100%", cursor: "pointer" }}
                    />
                </div>
            </Dialog>
        </div>
    );
}
