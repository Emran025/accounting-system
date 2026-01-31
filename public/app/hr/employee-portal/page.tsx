"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { EmployeePortal } from "./EmployeePortal";

export default function EmployeePortalPage() {
  const user = getStoredUser();

  return (
    <ModuleLayout groupKey="hr" requiredModule="payroll">
      <PageHeader title="البوابة الذاتية للموظف" user={user} showDate={true} />
      <EmployeePortal />
    </ModuleLayout>
  );
}

