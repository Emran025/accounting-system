
import { formatCurrency } from "@/lib/utils";
import { APIComparative } from "../types";
import { fetchAPI } from "@/lib/api";
import { showToast, FilterSection, DateRangePicker, FilterActions, Button, Table, Column } from "@/components/ui";
import { useState, useCallback, useEffect } from "react";

export function ComparativeTab() {
    const [isLoading, setIsLoading] = useState(false);
    const [comparative, setComparative] = useState<APIComparative | null>(null);
    
    const [currentStart, setCurrentStart] = useState("");
    const [currentEnd, setCurrentEnd] = useState("");
    const [previousStart, setPreviousStart] = useState("");
    const [previousEnd, setPreviousEnd] = useState("");

    useEffect(() => {
        const today = new Date().toISOString().split("T")[0];
        const firstDay = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
        setCurrentStart(firstDay);
        setCurrentEnd(today);

        // Previous period defaults
        const prevMonthFirst = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split("T")[0];
        const prevMonthLast = new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split("T")[0];
        setPreviousStart(prevMonthFirst);
        setPreviousEnd(prevMonthLast);
    }, []);

    const loadComparative = useCallback(async () => {
        if (!currentStart || !currentEnd) {
            // Wait for input
            return;
        }

        try {
            setIsLoading(true);
            let url = `reports/comparative?current_start=${currentStart}&current_end=${currentEnd}`;
            if (previousStart && previousEnd) {
                url += `&previous_start=${previousStart}&previous_end=${previousEnd}`;
            }

            const response = await fetchAPI(url);
            if (response.success && response.data) {
                setComparative(response.data as APIComparative);
            } else {
                showToast(response.message || "فشل تحميل المقارنة", "error");
            }
        } catch {
            showToast("خطأ في الاتصال بالسيرفر", "error");
        } finally {
            setIsLoading(false);
        }
    }, [currentStart, currentEnd, previousStart, previousEnd]);

    return (
        <div className="sales-card">
            <h2><i className="fas fa-chart-bar"></i> المقارنة المالية</h2>

            <FilterSection>
                <DateRangePicker
                    label="الفترة الحالية"
                    startDate={currentStart}
                    endDate={currentEnd}
                    onStartDateChange={setCurrentStart}
                    onEndDateChange={setCurrentEnd}
                />
                <DateRangePicker
                    label="الفترة السابقة (اختياري)"
                    startDate={previousStart}
                    endDate={previousEnd}
                    onStartDateChange={setPreviousStart}
                    onEndDateChange={setPreviousEnd}
                />
                <FilterActions>
                    <Button onClick={loadComparative} icon="search">
                        عرض المقارنة
                    </Button>
                </FilterActions>
            </FilterSection>

            {isLoading ? (
                <div style={{ textAlign: "center", padding: "3rem" }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: "2rem" }}></i>
                </div>
            ) : comparative ? (
                <div className="report-section animate-fade" style={{ marginTop: "1.5rem" }}>
                    <h2 style={{ marginBottom: "1.5rem" }}>
                        <i className="fas fa-chart-bar"></i> المقارنة المالية
                    </h2>

                    <Table
                        columns={[
                            {
                                key: "label",
                                header: "البند",
                                render: (item) => <strong>{item.label}</strong>
                            },
                            {
                                key: "previous",
                                header: "الفترة السابقة",
                                render: (item) => formatCurrency(item.previous)
                            },
                            {
                                key: "current",
                                header: "الفترة الحالية",
                                render: (item) => formatCurrency(item.current)
                            },
                            {
                                key: "amount",
                                header: "التغيير",
                                render: (item) => (
                                    <span className={item.amount >= 0 ? (item.positiveIsGood ? "text-success" : "text-danger") : (item.positiveIsGood ? "text-danger" : "text-success")}>
                                        {formatCurrency(item.amount)}
                                    </span>
                                )
                            },
                            {
                                key: "percentage",
                                header: "نسبة التغيير",
                                render: (item) => (
                                    <span style={{ direction: 'ltr', textAlign: 'right', display: 'block' }}>
                                        {item.percentage.toFixed(2)}%
                                    </span>
                                )
                            }
                        ]}
                        data={[
                            {
                                label: "الإيرادات",
                                previous: comparative.previous_period?.revenue || 0,
                                current: comparative.current_period?.revenue || 0,
                                amount: comparative.changes?.revenue?.amount || 0,
                                percentage: comparative.changes?.revenue?.percentage || 0,
                                positiveIsGood: true
                            },
                            {
                                label: "المصروفات",
                                previous: comparative.previous_period?.expenses || 0,
                                current: comparative.current_period?.expenses || 0,
                                amount: comparative.changes?.expenses?.amount || 0,
                                percentage: comparative.changes?.expenses?.percentage || 0,
                                positiveIsGood: false
                            },
                            {
                                label: "صافي الربح",
                                previous: comparative.previous_period?.net_profit || 0,
                                current: comparative.current_period?.net_profit || 0,
                                amount: comparative.changes?.net_profit?.amount || 0,
                                percentage: comparative.changes?.net_profit?.percentage || 0,
                                positiveIsGood: true
                            }
                        ]}
                        keyExtractor={(item) => item.label}
                    />
                </div>
            ) : (
                <p style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                    اختر الفترات الزمنية واضغط على "عرض المقارنة"
                </p>
            )}
        </div>
    );
}
