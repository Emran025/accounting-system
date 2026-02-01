"use client";

import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Attendance } from "./Attendance";

export default function AttendancePage() {
  const user = getStoredUser();

  return (
    <ModuleLayout groupKey="hr" requiredModule="payroll">
      <PageHeader title="سجلات الحضور والانصراف" user={user} showDate={true} />
      <Attendance />
    </ModuleLayout>
  );
}



