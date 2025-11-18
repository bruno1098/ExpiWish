"use client"

import { RequireAuth } from "@/lib/auth-context";
import dynamic from "next/dynamic";

const IntegracoesPageContent = dynamic(() => import("./IntegracoesPageContent"), {
  ssr: false,
  loading: () => (
    <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
      Carregando integrações...
    </div>
  )
});

export default function IntegracoesPage() {
  return (
    <RequireAuth>
      <IntegracoesPageContent />
    </RequireAuth>
  );
}
