"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Onboarding } from "./Onboarding";

export default function OnboardingPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="onboarding">
      <PageHeader title="التوظيف والإنهاء" user={user} showDate={true} />
      <Onboarding />
    </ModuleLayout>
  );
}


