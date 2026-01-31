"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { LeaveRequests } from "./LeaveRequests";

export default function LeaveRequestsPage() {
  const user = getStoredUser();

  return (
    <ModuleLayout groupKey="hr" requiredModule="payroll">
      <PageHeader title="طلبات الإجازة" user={user} showDate={true} />
      <LeaveRequests />
    </ModuleLayout>
  );
}

