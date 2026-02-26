"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { EmployeeAssets } from "./EmployeeAssets";

export default function EmployeeAssetsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <MainLayout >
      <EmployeeAssets />
    </MainLayout>
  );
}

