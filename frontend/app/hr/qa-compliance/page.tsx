"use client";

import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { QaCompliance } from "./QaCompliance";

export default function QaCompliancePage() {


  return (
    <MainLayout >
      <QaCompliance />
    </MainLayout>
  );
}


