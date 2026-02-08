"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { WorkforceScheduling } from "./WorkforceScheduling";

export default function SchedulingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="scheduling">
      <PageHeader title="جدولة القوى العاملة" user={user} showDate={true} />
      <WorkforceScheduling />
    </ModuleLayout>
  );
}


