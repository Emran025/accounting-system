"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Performance } from "./Performance";

export default function PerformancePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="performance">
      <PageHeader title="الأداء والأهداف" user={user} showDate={true} />
      <Performance />
    </ModuleLayout>
  );
}


