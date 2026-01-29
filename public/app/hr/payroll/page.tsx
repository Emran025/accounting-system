"use client";

import { useState, useEffect } from "react";
import { MainLayout, PageHeader } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";

import { Payroll } from "./Payroll";

// If TabNavigation is not at that path, we might need to adjust or create it.
// Assuming it exists as per plan.

export default function HRPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <MainLayout requiredModule="payroll">
      <PageHeader title="الرواتب والمستحقات" user={user} showDate={true} />
      <Payroll />
    </MainLayout>
  );
}
