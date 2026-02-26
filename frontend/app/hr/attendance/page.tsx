"use client";

import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Attendance } from "./Attendance";

export default function AttendancePage() {
  const user = getStoredUser();

  return (
    <MainLayout >
      <Attendance />
    </MainLayout>
  );
}



