"use client";

import React, { useMemo, useState } from "react";
import type { Feedback } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface DetailProblemProps {
  rows: Feedback[];
  maxProblems?: number;
  maxDetails?: number;
}

// Normalização simples para evitar duplicidades por acentos/espacos
const normalize = (v: any): string => {
  return String(v || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

const isValidProblem = (problem?: string) => {
  if (!problem || typeof problem !== "string") return false;
  const p = problem.toLowerCase().trim();
  const invalid = [
    "vazio","sem problemas","nao identificado","não identificado","sem problema","nenhum problema",
    "ok","tudo ok","sem","n/a","na","-","","elogio","positivo","bom","boa","excelente","ótimo","otimo",
    "perfeito","maravilhoso","satisfeito","satisfeita"
  ];
  return !invalid.includes(p) && !p.includes("vazio") && !p.includes("sem problemas") && p.length > 2;
};

export const DetailProblem: React.FC<DetailProblemProps> = ({ rows, maxProblems = 10, maxDetails = 8 }) => {
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const data = useMemo(() => {
    const problems = new Map<string, {
      label: string;
      total: number;
      details: Map<string, number>;
      departments: Map<string, number>;
    }>();

    (rows || []).forEach((r: any) => {
      // Estrutura nova: allProblems
      if (Array.isArray(r?.allProblems) && r.allProblems.length > 0) {
        r.allProblems.forEach((p: any) => {
          const problemLabel = String(p?.problem || "").trim();
          if (!isValidProblem(problemLabel)) return;
          const key = normalize(problemLabel);
          if (!problems.has(key)) problems.set(key, { label: problemLabel, total: 0, details: new Map(), departments: new Map() });
          const entry = problems.get(key)!;
          entry.total += 1;
          const det = String(p?.problem_detail || "").trim();
          if (det) entry.details.set(det, (entry.details.get(det) || 0) + 1);
          const dept = String(p?.sector || r?.sector || r?.department || "").trim();
          if (dept) entry.departments.set(dept, (entry.departments.get(dept) || 0) + 1);
        });
        return;
      }
      // Fallback: estrutura antiga (string concatenada)
      const pConcat = String(r?.problem || "").trim();
      if (!pConcat) return;
      const parts = pConcat.includes(";") ? pConcat.split(";").map((s: string) => s.trim()) : [pConcat];
      parts.forEach((problemLabel: string) => {
        if (!isValidProblem(problemLabel)) return;
        const key = normalize(problemLabel);
        if (!problems.has(key)) problems.set(key, { label: problemLabel, total: 0, details: new Map(), departments: new Map() });
        const entry = problems.get(key)!;
        entry.total += 1;
        const det = String(r?.problem_detail || "").trim();
        if (det) entry.details.set(det, (entry.details.get(det) || 0) + 1);
        const dept = String(r?.sector || r?.department || "").trim();
        if (dept) entry.departments.set(dept, (entry.departments.get(dept) || 0) + 1);
      });
    });

    const list = Array.from(problems.values()).map(p => {
      const detailArr = Array.from(p.details.entries()).map(([detail, count]) => ({ detail, count }));
      detailArr.sort((a, b) => b.count - a.count);
      const deptArr = Array.from(p.departments.entries()).map(([dept, count]) => ({ dept, count }));
      deptArr.sort((a, b) => b.count - a.count);
      return { label: p.label, total: p.total, details: detailArr, departments: deptArr };
    });

    list.sort((a, b) => b.total - a.total);
    return list;
  }, [rows]);

  const filtered = useMemo(() => {
    const q = normalize(query);
    const base = q ? data.filter(p => normalize(p.label).includes(q)) : data;
    return base.slice(0, maxProblems);
  }, [data, query, maxProblems]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar problema…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        <Badge variant="secondary">{data.length} problemas</Badge>
      </div>

      <Accordion type="multiple" className="w-full">
        {filtered.map((p, idx) => {
          const total = p.total || 1;
          const showAll = !!expanded[p.label];
          const detailsToShow = showAll ? p.details : p.details.slice(0, maxDetails);
          return (
            <AccordionItem key={`${p.label}-${idx}`} value={`${p.label}-${idx}`}>
              <AccordionTrigger>
                <div className="flex items-center justify-between w-full">
                  <span className="font-medium text-left text-lg">
                    {p.label}
                  </span>
                  <Badge variant="outline">{p.total} ocorrências</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  <Card className="border border-purple-200 dark:border-purple-700">
                    <CardHeader className="py-2">
                      <CardTitle className="text-lg">Detalhes mais citados</CardTitle>
                      <CardDescription className="text-sm">Principais descrições de problema detalhado agrupadas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {detailsToShow.length === 0 && (
                        <div className="text-base text-muted-foreground">Sem detalhes específicos.</div>
                      )}
                      {detailsToShow.map((d, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 py-1">
                          <span className="text-base">• {d.detail}</span>
                          <span className="text-sm text-muted-foreground">
                            {d.count} ({((d.count / total) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                      {p.details.length > maxDetails && (
                        <Button 
                          variant="ghost"
                          size="sm"
                          className="mt-1"
                          onClick={() => setExpanded(prev => ({ ...prev, [p.label]: !showAll }))}
                        >
                          {showAll ? "Mostrar menos" : "Mostrar todos"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                  {p.departments.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-1">Departamentos relacionados</div>
                      <div className="flex flex-wrap gap-2">
                        {p.departments.slice(0, 6).map((d, i) => (
                          <Badge key={i} variant="secondary">{d.dept} • {d.count}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default DetailProblem;