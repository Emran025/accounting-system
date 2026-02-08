"use client";

import { useState, useEffect } from "react";
import { ModuleLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Succession } from "./Succession";

export default function SuccessionPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <ModuleLayout groupKey="hr" requiredModule="succession">
      <PageHeader title="التخطيط للخلافة" user={user} showDate={true} />
      <Succession />
    </ModuleLayout>
  );
}


