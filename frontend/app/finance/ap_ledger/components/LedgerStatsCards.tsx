import { getIcon } from "@/lib/icons";
import { formatCurrency } from "@/lib/utils";
import { LedgerStats } from "../types";
import { StatsCard } from "@/components/ui/StatsCard";

interface LedgerStatsCardsProps {
    stats: LedgerStats;
}

export function LedgerStatsCards({ stats }: LedgerStatsCardsProps) {
    return (
        <div className="dashboard-stats animate-fade" style={{ marginBottom: "2rem" }}>
            <StatsCard
                title="إجمالي المشتريات (دائن)"
                value={formatCurrency(stats.total_credit)}
                icon={getIcon("dollar")}
                colorClass="alert"
            />
            <StatsCard
                title="إجمالي المرتجعات (مدين)"
                value={formatCurrency(stats.total_returns)}
                icon={getIcon("dollar")}
                colorClass="alert"
            />
            <StatsCard
                title="إجمالي المدفوعات (مدين)"
                value={formatCurrency(stats.total_payments)}
                icon={getIcon("check")}
                colorClass="products"
            />
            <StatsCard
                title="الرصيد الحالي"
                value={formatCurrency(stats.balance)}
                icon={getIcon("building")}
                colorClass="total"
            />
            <StatsCard
                title="عدد العمليات"
                value={stats.transaction_count}
                icon={getIcon("eye")}
                colorClass="sales"
            />
        </div>
    );
}

