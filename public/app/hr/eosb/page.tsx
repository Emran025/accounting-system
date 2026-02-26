"use client";

import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { EOSBCalculator } from "./EOSBCalculator";

export default function EOSBPage() {
  const user = getStoredUser();

  return (
    <MainLayout >
      <EOSBCalculator />
    </MainLayout>
  );
}



