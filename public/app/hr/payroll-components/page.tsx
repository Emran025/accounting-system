"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { PayrollComponents } from "./PayrollComponents";

export default function PayrollComponentsPage() {
  const user = getStoredUser();

  return (
    <ModuleLayout groupKey="hr" requiredModule="payroll">
      <PageHeader title="مكونات الرواتب" user={user} showDate={true} />
      <PayrollComponents />
    </ModuleLayout>
  );
}

