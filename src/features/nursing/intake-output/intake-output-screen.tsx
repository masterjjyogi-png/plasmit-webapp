"use client";

import * as React from "react";
import { ArrowDownToLine, ArrowUpFromLine, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NursingPatientStrip, NursingShell } from "@/features/nursing/nursing-shared";

type IntakeOutputEntry = {
  rowId: string;
  rowLabel: string;
  groupName: string;
  time: string;
  value: string;
  flow: "Intake" | "Output";
  patientId?: string;
  patientName?: string;
  visitId?: string;
  documentedAt?: string;
};

const assessmentIntakeOutputStorageKey = "nursing-assessment-intake-output-map";

function readIntakeOutputEntries() {
  if (typeof window === "undefined") return [];

  try {
    const savedEntries = window.localStorage.getItem(assessmentIntakeOutputStorageKey);
    if (!savedEntries) return [];
    const parsedEntries = JSON.parse(savedEntries);
    return Array.isArray(parsedEntries) ? (parsedEntries as IntakeOutputEntry[]) : [];
  } catch {
    return [];
  }
}

function numericValue(value: string) {
  const total = value.split(",").reduce((sum, item) => {
    const score = Number(item.trim().split("=").at(-1));
    return Number.isFinite(score) ? sum + score : sum;
  }, 0);
  if (total) return total;
  const directValue = Number(value);
  return Number.isFinite(directValue) ? directValue : 0;
}

function EntryTable({ title, entries, flow }: { title: string; entries: IntakeOutputEntry[]; flow: IntakeOutputEntry["flow"] }) {
  const Icon = flow === "Intake" ? ArrowDownToLine : ArrowUpFromLine;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>Rows marked as {flow.toLowerCase()} in assessment configuration.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <thead className="bg-surface-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <tr>{["Date", "Time", "Patient", "Visit", "Assessment", "Row", "Value", "Row ID"].map((head) => <th className="border-b border-border px-3 py-2 text-left" key={head}>{head}</th>)}</tr>
            </thead>
            <tbody>
              {entries.length ? entries.map((entry) => (
                <tr className="border-b border-border last:border-b-0 hover:bg-surface-muted/60" key={`${entry.flow}-${entry.rowId}-${entry.time}`}>
                  <td className="px-3 py-2">{entry.documentedAt ? new Date(entry.documentedAt).toLocaleDateString() : ""}</td>
                  <td className="px-3 py-2">{entry.time}</td>
                  <td className="px-3 py-2">{entry.patientName || entry.patientId || ""}</td>
                  <td className="px-3 py-2">{entry.visitId || ""}</td>
                  <td className="px-3 py-2">{entry.groupName}</td>
                  <td className="px-3 py-2">{entry.rowLabel}</td>
                  <td className="px-3 py-2 font-medium">{entry.value}</td>
                  <td className="px-3 py-2 text-muted-foreground">{entry.rowId}</td>
                </tr>
              )) : (
                <tr>
                  <td className="px-3 py-8 text-center text-muted-foreground" colSpan={8}>No {flow.toLowerCase()} documentation yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export function IntakeOutputScreen() {
  const [entries, setEntries] = React.useState<IntakeOutputEntry[]>(readIntakeOutputEntries);
  const [patientFilter, setPatientFilter] = React.useState("");
  const [visitFilter, setVisitFilter] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState("");

  function refreshEntries() {
    setEntries(readIntakeOutputEntries());
  }

  const filteredEntries = entries.filter((entry) => {
    const patientText = `${entry.patientId ?? ""} ${entry.patientName ?? ""}`.toLowerCase();
    const entryDate = entry.documentedAt ? new Date(entry.documentedAt).toISOString().slice(0, 10) : "";
    return (
      patientText.includes(patientFilter.toLowerCase()) &&
      (entry.visitId ?? "").toLowerCase().includes(visitFilter.toLowerCase()) &&
      (!dateFilter || entryDate === dateFilter)
    );
  });
  const intakeEntries = filteredEntries.filter((entry) => entry.flow === "Intake");
  const outputEntries = filteredEntries.filter((entry) => entry.flow === "Output");
  const intakeTotal = intakeEntries.reduce((sum, entry) => sum + numericValue(entry.value), 0);
  const outputTotal = outputEntries.reduce((sum, entry) => sum + numericValue(entry.value), 0);
  const balance = intakeTotal - outputTotal;

  return (
    <NursingShell
      title="Intake/Output"
      description="Assessment values mapped from configured intake and output rows."
      actions={<Button size="sm" variant="outline" onClick={refreshEntries}><RefreshCw className="h-4 w-4" />Refresh</Button>}
    >
      <NursingPatientStrip />
      <Card>
        <CardContent className="grid gap-3 p-4 md:grid-cols-3">
          <Input value={patientFilter} onChange={(event) => setPatientFilter(event.target.value)} placeholder="Filter patient" />
          <Input value={visitFilter} onChange={(event) => setVisitFilter(event.target.value)} placeholder="Filter visit" />
          <Input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} />
        </CardContent>
      </Card>
      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Intake total</div>
            <div className="mt-2 text-2xl font-semibold">{intakeTotal}</div>
            <Badge tone="info">{intakeEntries.length} entries</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Output total</div>
            <div className="mt-2 text-2xl font-semibold">{outputTotal}</div>
            <Badge tone="warning">{outputEntries.length} entries</Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Balance</div>
            <div className="mt-2 text-2xl font-semibold">{balance}</div>
            <Badge tone={balance >= 0 ? "success" : "danger"}>{balance >= 0 ? "Positive" : "Negative"}</Badge>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        <EntryTable title="Intake" entries={intakeEntries} flow="Intake" />
        <EntryTable title="Output" entries={outputEntries} flow="Output" />
      </div>
    </NursingShell>
  );
}
