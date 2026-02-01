"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { EOSBCalculator } from "./EOSBCalculator";

export default function EOSBPage() {
  const user = getStoredUser();

  return (
    <ModuleLayout groupKey="hr" requiredModule="payroll">
      <PageHeader title="حاسبة مكافأة نهاية الخدمة" user={user} showDate={true} />
      <EOSBCalculator />
    </ModuleLayout>
  );
}



