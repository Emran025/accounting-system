"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { EmployeeAssets } from "./EmployeeAssets";

export default function EmployeeAssetsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="employees">
      <PageHeader title="أصول الموظفين" user={user} showDate={true} />
      <EmployeeAssets />
    </ModuleLayout>
  );
}

