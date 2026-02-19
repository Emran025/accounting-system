import { getIcon } from "@/lib/icons";
import { formatCurrency } from "@/lib/utils";
import { StatsCard } from "@/components/ui/StatsCard";
import { LedgerStats } from "../types";

interface LedgerStatsCardsProps {
    stats: LedgerStats;
}

export function LedgerStatsCards({ stats }: LedgerStatsCardsProps) {
    return (
        <div className="dashboard-stats animate-fade" style={{ marginBottom: "2rem" }}>
            <StatsCard
                title="إجمالي المبيعات (مدين)"
                value={formatCurrency(stats.total_debit)}
                icon={getIcon("dollar")}
                colorClass="alert"
            />
            <StatsCard
                title="إجمالي المرتجعات (دائن)"
                value={formatCurrency(stats.total_returns)}
                icon={getIcon("dollar")}
                colorClass="alert"
            />
            <StatsCard
                title="إجمالي المقبوضات (دائن)"
                value={formatCurrency(stats.total_receipts)}
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
