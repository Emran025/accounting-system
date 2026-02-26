"use client";

import { MainLayout, } from "@/components/layout";

import { Payroll } from "./Payroll";

// If TabNavigation is not at that path, we might need to adjust or create it.
// Assuming it exists as per plan.

export default function HRPage() {
  return (
    <MainLayout >
      <Payroll />
    </MainLayout>
  );
}
