"use client";

import { useState, useEffect } from "react";
import { fetchAPI } from "@/lib/api";
import { API_ENDPOINTS } from "@/lib/endpoints";
import { Dialog, Table, Column } from "@/components/ui";
import { getIcon } from "@/lib/icons";
import type { NrExpansionLog } from "../types";

interface ExpansionLogsPanelProps {
    intervalId: number;
    isOpen: boolean;
    onClose: () => void;
}

export function ExpansionLogsPanel({ intervalId, isOpen, onClose }: ExpansionLogsPanelProps) {
    const [logs, setLogs] = useState<NrExpansionLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isOpen) return;
        const load = async () => {
            setLoading(true);
            try {
                const res = await fetchAPI(API_ENDPOINTS.NUMBER_RANGES.INTERVALS.expansionLogs(intervalId));
                if (res.success && res.data) {
                    setLogs(res.data as NrExpansionLog[]);
                }
            } catch {
                // silent
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [intervalId, isOpen]);

    const columns: Column<NrExpansionLog>[] = [
        {
            key: "date",
            header: "التاريخ",
            dataLabel: "التاريخ",
            render: (item) => (
                <span style={{ fontSize: "0.82rem", color: "var(--text-secondary)" }}>
                    {new Date(item.created_at).toLocaleString("ar-SA")}
                </span>
            ),
        },
        {
            key: "old_range",
            header: "النطاق القديم",
            dataLabel: "القديم",
            render: (item) => (
                <span style={{ fontFamily: "monospace", color: "var(--text-muted)" }}>
                    {item.old_from.toLocaleString()} → {item.old_to.toLocaleString()}
                </span>
            ),
        },
        {
            key: "new_range",
            header: "النطاق الجديد",
            dataLabel: "الجديد",
            render: (item) => (
                <span style={{ fontFamily: "monospace" }}>
                    {item.new_from.toLocaleString()} → <strong style={{ color: "#10b981" }}>{item.new_to.toLocaleString()}</strong>
                </span>
            ),
        },
        {
            key: "change",
            header: "مقدار التوسع",
            dataLabel: "التوسع",
            render: (item) => (
                <span className="badge badge-success" style={{ fontFamily: "monospace" }}>
                    +{(item.new_to - item.old_to).toLocaleString()}
                </span>
            ),
        },
        {
            key: "reason",
            header: "السبب",
            dataLabel: "السبب",
            render: (item) => item.reason || <span style={{ color: "var(--text-muted)" }}>—</span>,
        },
        {
            key: "expanded_by",
            header: "بواسطة",
            dataLabel: "بواسطة",
            render: (item) => (
                <span style={{ fontSize: "0.82rem" }}>
                    {(item.expanded_by && typeof item.expanded_by === "object") ? item.expanded_by.name : "—"}
                </span>
            ),
        },
    ];

    return (
        <Dialog
            isOpen={isOpen}
            onClose={onClose}
            title="سجل توسعات النطاق"
            maxWidth="900px"
        >
            <div className="nr-expansion-logs">
                <div className="nr-info-banner" style={{ marginBottom: "1rem" }}>
                    <span className="nr-info-icon">{getIcon("info")}</span>
                    <span>سجل جميع عمليات التوسيع لهذا النطاق. هذا السجل غير قابل للتعديل أو الحذف لأغراض التدقيق.</span>
                </div>

                {loading ? (
                    <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-muted)" }}>
                        جارِ تحميل السجلات...
                    </div>
                ) : (
                    <Table
                        columns={columns}
                        data={logs}
                        keyExtractor={(item) => item.id}
                        emptyMessage="لا توجد عمليات توسيع مسجلة لهذا النطاق"
                    />
                )}
            </div>
        </Dialog>
    );
}
