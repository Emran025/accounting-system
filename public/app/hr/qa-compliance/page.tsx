"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { QaCompliance } from "./QaCompliance";

export default function QaCompliancePage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="compliance">
      <PageHeader title="الجودة والامتثال" user={user} showDate={true} />
      <QaCompliance />
    </ModuleLayout>
  );
}


