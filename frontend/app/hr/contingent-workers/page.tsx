"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { ContingentWorkers } from "./ContingentWorkers";

export default function ContingentWorkersPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <MainLayout >
      <ContingentWorkers />
    </MainLayout>
  );
}


