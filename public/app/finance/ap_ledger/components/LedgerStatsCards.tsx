import { getIcon } from "@/lib/icons";
import { formatCurrency } from "@/lib/utils";
import { LedgerStats } from "../types";

interface LedgerStatsCardsProps {
    stats: LedgerStats;
}

export function LedgerStatsCards({ stats }: LedgerStatsCardsProps) {
    return (
        <div className="dashboard-stats animate-fade" style={{ marginBottom: "2rem" }}>
            <div className="stat-card">
                <div className="stat-icon alert">{getIcon("dollar")}</div>
                <div className="stat-info">
                    <h3>إجمالي المشتريات (دائن)</h3>
                    <p className="text-danger">{formatCurrency(stats.total_credit)}</p>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon alert">{getIcon("dollar")}</div>
                <div className="stat-info">
                    <h3>إجمالي المرتجعات (مدين)</h3>
                    <p className="text-danger">{formatCurrency(stats.total_returns)}</p>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon products">{getIcon("check")}</div>
                <div className="stat-info">
                    <h3>إجمالي المدفوعات (مدين)</h3>
                    <p className="text-success">{formatCurrency(stats.total_payments)}</p>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon total">{getIcon("building")}</div>
                <div className="stat-info">
                    <h3>الرصيد الحالي</h3>
                    <p className={stats.balance > 0 ? "text-danger" : stats.balance < 0 ? "text-success" : ""}>
                        {formatCurrency(stats.balance)}
                    </p>
                </div>
            </div>
            <div className="stat-card">
                <div className="stat-icon sales">{getIcon("eye")}</div>
                <div className="stat-info">
                    <h3>عدد العمليات</h3>
                    <p>{stats.transaction_count}</p>
                </div>
            </div>
        </div>
    );
}
