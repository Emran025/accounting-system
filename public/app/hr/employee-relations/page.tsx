"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { EmployeeRelations } from "./EmployeeRelations";

export default function EmployeeRelationsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="relations">
      <PageHeader title="علاقات الموظفين" user={user} showDate={true} />
      <EmployeeRelations />
    </ModuleLayout>
  );
}


