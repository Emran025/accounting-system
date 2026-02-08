"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Recruitment } from "./Recruitment";

export default function RecruitmentPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="recruitment">
      <PageHeader title="التوظيف والمرشحين" user={user} showDate={true} />
      <Recruitment />
    </ModuleLayout>
  );
}


