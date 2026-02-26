"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Benefits } from "./Benefits";

export default function BenefitsPage() {
  const [ setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <MainLayout >
      <Benefits />
    </MainLayout>
  );
}


