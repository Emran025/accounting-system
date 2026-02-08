"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Learning } from "./Learning";

export default function LearningPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="learning">
      <PageHeader title="التدريب والتعلم" user={user} showDate={true} />
      <Learning />
    </ModuleLayout>
  );
}


