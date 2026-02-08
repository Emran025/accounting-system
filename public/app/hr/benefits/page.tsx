"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Benefits } from "./Benefits";

export default function BenefitsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="benefits">
      <PageHeader title="المزايا والاستحقاقات" user={user} showDate={true} />
      <Benefits />
    </ModuleLayout>
  );
}


