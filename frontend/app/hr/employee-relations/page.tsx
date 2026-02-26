"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { EmployeeRelations } from "./EmployeeRelations";

export default function EmployeeRelationsPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <MainLayout >
      <EmployeeRelations />
    </MainLayout>
  );
}


