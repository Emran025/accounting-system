import { getIcon } from "@/lib/icons";
import { formatCurrency } from "@/lib/utils";

export interface ReturnsStats {
    total_debit?: number;
    total_credit?: number;
    total_returns: number;
    total_cash_returns?: number;   // AP ledger may or may not provide this
    total_credit_returns?: number; // AP ledger may or may not provide this
    total_payments?: number;
    balance?: number;
    transaction_count: number;
    [key: string]: number | undefined;
}

export interface ReturnsStatsCardsProps {
    stats: ReturnsStats;
}

export function ReturnsStatsCards({ stats }: ReturnsStatsCardsProps) {
    return (
        <div className="dashboard-stats animate-fade" style={{ marginBottom: "2rem" }}>
            <div className="stat-card">
                <div className="stat-icon alert">{getIcon("repeat")}</div>
                <div className="stat-info">
                    <h3>إجمالي المرتجعات</h3>
                    <p className="text-danger">{formatCurrency(stats.total_returns)}</p>
                </div>
            </div>
            {stats.total_cash_returns !== undefined && (
                <div className="stat-card">
                    <div className="stat-icon products">{getIcon("dollar")}</div>
                    <div className="stat-info">
                        <h3>مرتجعات نقدية</h3>
                        <p className="text-warning">{formatCurrency(stats.total_cash_returns)}</p>
                    </div>
                </div>
            )}
            {stats.total_credit_returns !== undefined && (
                <div className="stat-card">
                    <div className="stat-icon total">{getIcon("dollar")}</div>
                    <div className="stat-info">
                        <h3>مرتجعات ذمم (آجل)</h3>
                        <p className="text-danger">{formatCurrency(stats.total_credit_returns)}</p>
                    </div>
                </div>
            )}
            <div className="stat-card">
                <div className="stat-icon sales">{getIcon("eye")}</div>
                <div className="stat-info">
                    <h3>عدد المرتجعات</h3>
                    <p>{stats.transaction_count}</p>
                </div>
            </div>
        </div>
    );
}
