"use client";

import { useState, useEffect } from "react";
import { Button, showToast, SearchableSelect } from "@/components/ui";
import { Label } from "@/components/ui/Label";
import { useEmployeeStore } from "@/stores/useEmployeeStore";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { PageSubHeader } from "@/components/layout";
import { getIcon } from "@/lib/icons";

export function UserLinkingTab() {
    const { allEmployees: employees, loadAllEmployees } = useEmployeeStore();
    const [users, setUsers] = useState<Array<{ id: number; full_name: string; username: string }>>([]);
    const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
    const [selectedUserId, setSelectedUserId] = useState<string>("");

    useEffect(() => {
        loadAllEmployees();
        loadUsers();
    }, [loadAllEmployees]);

    const loadUsers = async () => {
        try {
            const res = await fetchAPI("/users");
            const data = res as any;
            setUsers(data.data || data.users || []);
        } catch { console.error("Failed to load users"); }
    };

    const handleLink = async () => {
        if (!selectedEmployeeId || !selectedUserId) {
            showToast("يرجى اختيار كل من الموظف والمستخدم", "error");
            return;
        }
        try {
            await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.EMPLOYEE_USER_LINK, {
                method: "POST",
                body: JSON.stringify({ employee_id: Number(selectedEmployeeId), user_id: Number(selectedUserId) }),
            });
            showToast("تم ربط الموظف بحساب المستخدم بنجاح", "success");
            setSelectedEmployeeId("");
            setSelectedUserId("");
        } catch { showToast("فشل ربط الموظف", "error"); }
    };

    const handleUnlink = async () => {
        if (!selectedEmployeeId) { showToast("يرجى اختيار الموظف", "error"); return; }
        if (!confirm("هل أنت متأكد من فك ربط هذا الموظف؟")) return;
        try {
            await fetchAPI(API_ENDPOINTS.HR.ADMINISTRATION.UNLINK_EMPLOYEE(selectedEmployeeId), { method: "DELETE" });
            showToast("تم فك ربط الموظف", "success");
            setSelectedEmployeeId("");
        } catch { showToast("فشل فك الربط", "error"); }
    };

    return (
        <div className="sales-card animate-fade">
            <PageSubHeader
                title="ربط الموظف بحساب المستخدم"
                titleIcon="link"
            />

            <div className="alert alert-info" style={{ margin: "1rem 0", display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
                {getIcon("info")}
                <div>
                    <strong>معلومات الربط</strong>
                    <p style={{ margin: "0.25rem 0 0" }}>
                        يتيح هذا الربط للموظف تسجيل الدخول إلى النظام والوصول إلى بوابة الموظف.
                        عند ربط الموظف بمستخدم، سيتمكن من استعراض بياناته، وتقديم الطلبات، ومتابعة حالتها من خلال البوابة.
                    </p>
                </div>
            </div>

            <div className="form-row" style={{ marginTop: "1.5rem" }}>
                <div className="form-group">
                    <Label>اختر الموظف</Label>
                    <SearchableSelect
                        options={employees.map((e: any) => ({
                            value: e.id.toString(),
                            label: `${e.full_name} (${e.employee_code})`
                        }))}
                        value={selectedEmployeeId}
                        onChange={(val) => setSelectedEmployeeId(val?.toString() || "")}
                        placeholder="ابحث عن موظف..."
                    />
                </div>
                <div className="form-group">
                    <Label>اختر حساب المستخدم</Label>
                    <SearchableSelect
                        options={users.map((u) => ({
                            value: u.id.toString(),
                            label: `${u.full_name} (${u.username})`
                        }))}
                        value={selectedUserId}
                        onChange={(val) => setSelectedUserId(val?.toString() || "")}
                        placeholder="ابحث عن مستخدم..."
                    />
                </div>
            </div>

            <div className="action-buttons" style={{ justifyContent: "flex-end", marginTop: "1.5rem", paddingTop: "1rem", borderTop: "1px solid var(--border-color)" }}>
                <Button
                    variant="danger"
                    icon="unlink"
                    onClick={handleUnlink}
                    disabled={!selectedEmployeeId}
                >
                    فك الربط
                </Button>
                <Button
                    variant="primary"
                    icon="link"
                    onClick={handleLink}
                    disabled={!selectedEmployeeId || !selectedUserId}
                >
                    ربط الحسابات
                </Button>
            </div>
        </div>
    );
}
