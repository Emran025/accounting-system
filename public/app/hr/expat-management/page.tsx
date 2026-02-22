"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { ExpatManagement } from "./ExpatManagement";

export default function ExpatManagementPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="employees">
      <PageHeader title="إدارة العمالة الأجنبية" user={user} showDate={true} />
      <ExpatManagement />
    </ModuleLayout>
  );
}

