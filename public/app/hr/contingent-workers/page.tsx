"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { ContingentWorkers } from "./ContingentWorkers";

export default function ContingentWorkersPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="contingent">
      <PageHeader title="العمالة المؤقتة" user={user} showDate={true} />
      <ContingentWorkers />
    </ModuleLayout>
  );
}


