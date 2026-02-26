"use client";

import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { getStoredUser } from "@/lib/auth";
import { Learning } from "./Learning";

export default function LearningPage() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  return (
    <MainLayout >
      <Learning />
    </MainLayout>
  );
}


