"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";

import { Employees } from "./Employees";

// If TabNavigation is not at that path, we might need to adjust or create it.
// Assuming it exists as per plan.

export default function HRPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <MainLayout >
      <Employees />
    </MainLayout>
  );
}
