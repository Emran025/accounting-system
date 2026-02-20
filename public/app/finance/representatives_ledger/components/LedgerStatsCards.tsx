import { getIcon } from "@/lib/icons";
import { formatCurrency } from "@/lib/utils";
import { StatsCard } from "@/components/ui/StatsCard";
import { LedgerStats } from "../types";

interface LedgerStatsCardsProps {
    stats: LedgerStats;
}

export function LedgerStatsCards({ stats }: LedgerStatsCardsProps) {
    return (
        <div className="dashboard-stats animate-fade" style={{ marginBottom: "2rem", display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <StatsCard
                title="إجمالي العمولات"
                value={formatCurrency(stats.total_commissions)}
                icon={getIcon("dollar")}
                colorClass="alert"
            />
            <StatsCard
                title="المدفوعات والمسترجعات"
                value={formatCurrency(stats.total_payments + stats.total_returns)}
                icon={getIcon("check")}
                colorClass="products"
            />
            <StatsCard
                title="المستحق للمندوب"
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
