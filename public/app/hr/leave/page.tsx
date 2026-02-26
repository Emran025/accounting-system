"use client";

import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { LeaveRequests } from "./LeaveRequests";

export default function LeaveRequestsPage() {
  const user = getStoredUser();

  return (
    <MainLayout >
      <LeaveRequests />
    </MainLayout>
  );
}



