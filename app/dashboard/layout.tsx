"use client"

import { useState, useEffect } from "react"
import { RequireAuth } from "@/lib/auth-context"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
} 