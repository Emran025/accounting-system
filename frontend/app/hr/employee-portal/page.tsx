"use client";

import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { EmployeePortal } from "./EmployeePortal";

export default function EmployeePortalPage() {
  const user = getStoredUser();

  return (
    <MainLayout >
      <EmployeePortal />
    </MainLayout>
  );
}



