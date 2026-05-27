"use client";

import Link from "next/link";
import { ClipboardCheck, HeartPulse, Settings, UserRoundCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { assessmentGroups, carePlanProgressNotes, carePlans } from "@/features/nursing/nursing-data";
import { NursingPatientStrip, NursingQuickNav, NursingShell, NursingStatus } from "@/features/nursing/nursing-shared";

export function NursingDashboardPage() {
  const activeProblems = carePlans.flatMap((plan) => plan.problems).filter((problem) => problem.status === "Active").length;
  const openInterventions = carePlans.flatMap((plan) => plan.problems).flatMap((problem) => problem.goals).flatMap((goal) => goal.interventions).filter((item) => !item.completed).length;

  return (
    <NursingShell
      title="Nurse"
      description="Nursing module workspace for assessments, care plan documentation, progress notes, overview, and master configurations."
      actions={<><Button size="sm" variant="outline" asChild><Link href="/nurse/assessments/configuration"><Settings className="h-4 w-4" />Configure</Link></Button><Button size="sm" asChild><Link href="/nurse/assessments">Open assessment</Link></Button></>}
    >
      <NursingPatientStrip />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Metric icon={<ClipboardCheck className="h-5 w-5" />} label="Assessment groups" value={assessmentGroups.length} status="Active" />
        <Metric icon={<HeartPulse className="h-5 w-5" />} label="Active problems" value={activeProblems} status="In progress" />
        <Metric icon={<UserRoundCheck className="h-5 w-5" />} label="Open interventions" value={openInterventions} status="Pending" />
        <Metric icon={<ClipboardCheck className="h-5 w-5" />} label="Progress notes" value={carePlanProgressNotes.length} status="Completed" />
      </div>
      <NursingQuickNav />
    </NursingShell>
  );
}

function Metric({ icon, label, value, status }: { icon: React.ReactNode; label: string; value: number; status: string }) {
  return (
    <Card>
      <CardHeader className="pb-2"><div className="flex items-center justify-between"><span className="text-muted-foreground">{icon}</span><NursingStatus status={status} /></div></CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <CardTitle className="mt-1">{label}</CardTitle>
      </CardContent>
    </Card>
  );
}
